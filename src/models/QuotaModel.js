const http = require('http');
const cp = require('child_process');

class QuotaModel {
  static cachedConnection = null;
  static lastFetchTime = 0;
  static cachedQuota = null;

  /**
   * Formats the time remaining until the given reset timestamp
   * into a human-readable string.
   * @param {string} resetTimeISO - ISO 8601 timestamp from the API
   * @param {number} remainingPercent - 0 to 100
   */
  static formatResetDescription(resetTimeISO, remainingPercent) {
    if (remainingPercent >= 100) {
      return 'Your limit is fully available.';
    }

    if (!resetTimeISO) {
      return 'You have used some of your limit.';
    }

    const resetMs = new Date(resetTimeISO).getTime();
    const diffMs = resetMs - Date.now();

    if (diffMs <= 0) {
      return 'Limit refreshing momentarily...';
    }

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    if (days > 0) {
      const dayStr = `${days} day${days > 1 ? 's' : ''}`;
      const hourStr = `${remHours} hour${remHours !== 1 ? 's' : ''}`;
      if (remainingPercent === 0) {
        return `Limit reached. Resets in ${dayStr}, ${hourStr}.`;
      }
      return `Resets in ${dayStr}, ${hourStr}.`;
    }

    const hourStr = `${hours} hour${hours !== 1 ? 's' : ''}`;
    const minStr = `${minutes} min${minutes !== 1 ? 's' : ''}`;

    if (remainingPercent === 0) {
      return `Limit reached. Resets in ${hourStr}, ${minStr}. If on a supported paid plan, you can use AI credits in the interim.`;
    }
    return `Resets in ${hourStr}, ${minStr}.`;
  }

  /**
   * Discovers the running Language Server process and its listening ports.
   */
  static discoverLanguageServer() {
    try {
      const psOutput = cp.execSync('ps aux 2>/dev/null', { encoding: 'utf8', timeout: 3000 });
      const lsLine = psOutput.split('\n').find(line => line.includes('language_server') && line.includes('--csrf_token'));
      if (!lsLine) return null;

      const pidMatch = lsLine.trim().split(/\s+/)[1];
      const csrfMatch = lsLine.match(/--csrf_token\s+([a-zA-Z0-9\-]+)/);
      if (!csrfMatch) return null;

      const pid = pidMatch;
      const csrfToken = csrfMatch[1];

      const ssOutput = cp.execSync('ss -tlpn 2>/dev/null', { encoding: 'utf8', timeout: 3000 });
      const ports = [];
      for (const line of ssOutput.split('\n')) {
        if (line.includes(`pid=${pid}`)) {
          const m = line.match(/127\.0\.0\.1:(\d+)/);
          if (m) {
            const p = parseInt(m[1], 10);
            if (!ports.includes(p)) ports.push(p);
          }
        }
      }

      return { pid, csrfToken, ports };
    } catch (err) {
      return null;
    }
  }

  /**
   * Makes the Connect-RPC call to the Language Server's GetUserStatus endpoint.
   */
  static async requestUserStatus(port, csrfToken) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        metadata: {
          extension_version: '2.5.5',
          api_key: csrfToken
        }
      });

      const req = http.request({
        hostname: '127.0.0.1',
        port: port,
        path: '/exa.language_server_pb.LanguageServerService/GetUserStatus',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Connect-Protocol-Version': '1',
          'x-codeium-csrf-token': csrfToken
        },
        timeout: 3000
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(`HTTP Status ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      req.write(postData);
      req.end();
    });
  }

  /**
   * Fetches real-time quota from the Language Server API.
   * Returns data structured by model group (gemini, claudeGpt)
   * with ONLY the real values from the API — no fabricated data.
   */
  static async getQuota() {
    try {
      let connection = this.cachedConnection;
      let data = null;

      // 1. Try cached connection
      if (connection && connection.port && connection.csrfToken) {
        try {
          data = await this.requestUserStatus(connection.port, connection.csrfToken);
        } catch (e) {
          this.cachedConnection = null;
        }
      }

      // 2. If no cache or it failed, discover new connection
      if (!data || !data.userStatus) {
        const lsInfo = this.discoverLanguageServer();
        if (lsInfo && lsInfo.ports && lsInfo.ports.length > 0) {
          for (const port of lsInfo.ports) {
            try {
              data = await this.requestUserStatus(port, lsInfo.csrfToken);
              if (data && data.userStatus) {
                this.cachedConnection = { port, csrfToken: lsInfo.csrfToken };
                break;
              }
            } catch (err) {}
          }
        }
      }

      if (!data || !data.userStatus) {
        return this.cachedQuota || this.getUnavailableState();
      }

      const userStatus = data.userStatus;
      const models = userStatus.cascadeModelConfigData?.clientModelConfigs || [];

      // --- GEMINI MODELS ---
      const geminiModels = models.filter(m => {
        const name = (m.label || m.modelId || '').toLowerCase();
        return name.includes('gemini');
      });
      const geminiWithQuota = geminiModels.find(m => m.quotaInfo) || geminiModels[0];
      const geminiQuota = this.extractQuotaFromModel(geminiWithQuota);

      // --- CLAUDE / GPT MODELS ---
      const claudeGptModels = models.filter(m => {
        const name = (m.label || m.modelId || '').toLowerCase();
        return name.includes('claude') || name.includes('gpt') || name.includes('oss');
      });
      const claudeGptWithQuota = claudeGptModels.find(m => m.quotaInfo) || claudeGptModels[0];
      const claudeGptQuota = this.extractQuotaFromModel(claudeGptWithQuota);

      const result = {
        gemini: {
          quota: geminiQuota,
          modelCount: geminiModels.length
        },
        claudeGpt: {
          quota: claudeGptQuota,
          modelCount: claudeGptModels.length
        }
      };

      this.cachedQuota = result;
      this.lastFetchTime = Date.now();
      return result;
    } catch (e) {
      console.error('[QuotaModel] Error fetching real-time quota:', e);
      return this.cachedQuota || this.getUnavailableState();
    }
  }

  /**
   * Extracts quota info from a single model's data.
   * Returns { remaining, resetTime, desc } using ONLY real API values.
   */
  static extractQuotaFromModel(model) {
    if (!model || !model.quotaInfo) {
      return {
        remaining: null,
        resetTime: null,
        desc: 'Quota data unavailable.'
      };
    }

    const fraction = model.quotaInfo.remainingFraction ?? 1;
    const remaining = Math.round(fraction * 100);
    const resetTime = model.quotaInfo.resetTime || null;

    return {
      remaining,
      resetTime,
      desc: this.formatResetDescription(resetTime, remaining)
    };
  }

  /**
   * Returns a fallback state when the Language Server is unreachable.
   */
  static getUnavailableState() {
    return {
      gemini: {
        quota: { remaining: null, resetTime: null, desc: 'Unable to connect to Language Server.' },
        modelCount: 0
      },
      claudeGpt: {
        quota: { remaining: null, resetTime: null, desc: 'Unable to connect to Language Server.' },
        modelCount: 0
      }
    };
  }
}

module.exports = QuotaModel;
