const http = require('http');
const cp = require('child_process');

class QuotaModel {
  static cachedConnection = null;
  static lastFetchTime = 0;
  static cachedQuota = null;

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
   * Makes the Connect-RPC call to the Language Server's RetrieveUserQuotaSummary endpoint.
   */
  static async requestQuotaSummary(port, csrfToken) {
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
        path: '/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary',
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
   * Fetches real-time quota from the native Antigravity Language Server API.
   * Returns structured groups and buckets exactly matching native Antigravity settings.
   */
  static async getQuota() {
    try {
      let connection = this.cachedConnection;
      let rawData = null;

      // 1. Try cached connection first
      if (connection && connection.port && connection.csrfToken) {
        try {
          rawData = await this.requestQuotaSummary(connection.port, connection.csrfToken);
        } catch (e) {
          this.cachedConnection = null;
        }
      }

      // 2. Discover if no cache or cached connection failed
      if (!rawData || !rawData.response) {
        const lsInfo = this.discoverLanguageServer();
        if (lsInfo && lsInfo.ports && lsInfo.ports.length > 0) {
          for (const port of lsInfo.ports) {
            try {
              rawData = await this.requestQuotaSummary(port, lsInfo.csrfToken);
              if (rawData && rawData.response && rawData.response.groups) {
                this.cachedConnection = { port, csrfToken: lsInfo.csrfToken };
                break;
              }
            } catch (err) {
              // Port might require HTTPS or be non-responsive, continue to next
            }
          }
        }
      }

      if (!rawData || !rawData.response || !rawData.response.groups) {
        return this.cachedQuota || this.getUnavailableState();
      }

      const groups = rawData.response.groups.map(group => {
        const isGemini = (group.displayName || '').toLowerCase().includes('gemini');
        return {
          id: isGemini ? 'gemini' : 'claudegpt',
          displayName: group.displayName || '',
          description: group.description || '',
          buckets: (group.buckets || []).map(b => {
            const fraction = b.remainingFraction ?? 1;
            const percentage = Math.round(fraction * 100);
            return {
              id: b.bucketId || '',
              window: b.window || '',
              displayName: b.displayName || '',
              description: b.description || (percentage >= 100 ? 'Your limit is fully available.' : ''),
              fraction: fraction,
              percentage: percentage,
              resetTime: b.resetTime || null
            };
          })
        };
      });

      const geminiGroup = groups.find(g => g.id === 'gemini');
      const claudeGroup = groups.find(g => g.id === 'claudegpt');

      const geminiWeekly = geminiGroup ? geminiGroup.buckets.find(b => b.window === 'weekly' || b.id.includes('weekly')) : null;
      const gemini5h = geminiGroup ? geminiGroup.buckets.find(b => b.window === '5h' || b.id.includes('5h')) : null;

      const claudeWeekly = claudeGroup ? claudeGroup.buckets.find(b => b.window === 'weekly' || b.id.includes('weekly')) : null;
      const claude5h = claudeGroup ? claudeGroup.buckets.find(b => b.window === '5h' || b.id.includes('5h')) : null;

      const result = {
        connected: true,
        description: rawData.response.description || '',
        groups: groups,
        gemini: {
          displayName: geminiGroup ? geminiGroup.displayName : 'Gemini Models',
          description: geminiGroup ? geminiGroup.description : '',
          weekly: {
            remaining: geminiWeekly ? geminiWeekly.percentage : null,
            desc: geminiWeekly ? geminiWeekly.description : '',
            resetTime: geminiWeekly ? geminiWeekly.resetTime : null
          },
          fiveHour: {
            remaining: gemini5h ? gemini5h.percentage : null,
            desc: gemini5h ? gemini5h.description : '',
            resetTime: gemini5h ? gemini5h.resetTime : null
          }
        },
        claudeGpt: {
          displayName: claudeGroup ? claudeGroup.displayName : 'Claude and GPT models',
          description: claudeGroup ? claudeGroup.description : '',
          weekly: {
            remaining: claudeWeekly ? claudeWeekly.percentage : null,
            desc: claudeWeekly ? claudeWeekly.description : '',
            resetTime: claudeWeekly ? claudeWeekly.resetTime : null
          },
          fiveHour: {
            remaining: claude5h ? claude5h.percentage : null,
            desc: claude5h ? claude5h.description : '',
            resetTime: claude5h ? claude5h.resetTime : null
          }
        }
      };

      this.cachedQuota = result;
      this.lastFetchTime = Date.now();
      return result;
    } catch (e) {
      console.error('[QuotaModel] Error fetching native quota summary:', e);
      return this.cachedQuota || this.getUnavailableState();
    }
  }

  /**
   * Returns a fallback state when the Language Server is unreachable.
   */
  static getUnavailableState() {
    return {
      connected: false,
      description: 'Unable to connect to Antigravity Language Server.',
      groups: [
        {
          id: 'gemini',
          displayName: 'Gemini Models',
          description: 'Models within this group: Gemini Flash, Gemini Pro',
          buckets: [
            { id: 'gemini-weekly', window: 'weekly', displayName: 'Weekly Limit Remaining', description: 'Language Server disconnected', fraction: 0, percentage: 0, resetTime: null },
            { id: 'gemini-5h', window: '5h', displayName: 'Five Hour Limit Remaining', description: 'Language Server disconnected', fraction: 0, percentage: 0, resetTime: null }
          ]
        },
        {
          id: 'claudegpt',
          displayName: 'Claude and GPT models',
          description: 'Models within this group: Claude Opus, Claude Sonnet, GPT-OSS',
          buckets: [
            { id: '3p-weekly', window: 'weekly', displayName: 'Weekly Limit Remaining', description: 'Language Server disconnected', fraction: 0, percentage: 0, resetTime: null },
            { id: '3p-5h', window: '5h', displayName: 'Five Hour Limit Remaining', description: 'Language Server disconnected', fraction: 0, percentage: 0, resetTime: null }
          ]
        }
      ]
    };
  }
}

module.exports = QuotaModel;
