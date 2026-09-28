const http = require('http');
const cp = require('child_process');

class QuotaModel {
  static cachedConnection = null;
  static lastFetchTime = 0;
  static cachedQuota = null;

  /**
   * Helper para formatar o tempo restante relativo
   * @param {string} resetTimeStr - ISO Date string
   * @param {boolean} isWeekly - Se é limite semanal ou ciclo de 5 horas
   * @param {number} remaining - Porcentagem restante (0 a 100)
   */
  static formatRelativeTime(resetTimeStr, isWeekly, remaining) {
    if (remaining === 100) {
      return isWeekly 
        ? 'Your weekly limit is fully available.' 
        : 'Your 5-hour limit is fully available.';
    }

    if (!resetTimeStr) {
      return isWeekly
        ? 'You have used some of your weekly limit.'
        : 'You have used some of your 5-hour limit.';
    }

    const diffMs = new Date(resetTimeStr).getTime() - Date.now();
    if (diffMs <= 0) {
      return 'Limit refreshing momentarily...';
    }

    const totalMinutes = Math.floor(diffMs / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;
    const remMinutes = totalMinutes % 60;

    if (days > 0) {
      const dayStr = `${days} day${days > 1 ? 's' : ''}`;
      const hourStr = `${remHours} hour${remHours > 1 ? 's' : ''}`;
      return `You have used some of your weekly limit, it will fully refresh in ${dayStr}, ${hourStr}.`;
    } else {
      const hourStr = `${remHours} hour${remHours > 1 ? 's' : ''}`;
      const minStr = `${remMinutes} minute${remMinutes > 1 ? 's' : ''}`;
      if (remaining === 0) {
        return `You have hit your 5-hour limit, it will refresh in ${hourStr}, ${minStr}.`;
      }
      return `You have used some of your 5-hour limit, it will fully refresh in ${hourStr}, ${minStr}.`;
    }
  }

  /**
   * Localiza o processo e porta do Language Server do Antigravity
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

      // Busca portas escutadas pelo PID via ss
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
   * Faz a chamada Connect-RPC para o Language Server
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
        timeout: 2500
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
   * Obtém a cota atualizada em tempo real
   */
  static async getQuota() {
    try {
      let connection = this.cachedConnection;
      let data = null;

      // 1. Tenta usar a conexão em cache
      if (connection && connection.port && connection.csrfToken) {
        try {
          data = await this.requestUserStatus(connection.port, connection.csrfToken);
        } catch (e) {
          // Conexão expirou/Language Server reiniciou
          this.cachedConnection = null;
        }
      }

      // 2. Se não tinha cache ou falhou, descobre nova conexão
      if (!data) {
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
        // Fallback para quando o Language Server não estiver respondendo
        return this.cachedQuota || {
          gemini: {
            weekly: { remaining: 100, desc: 'Your weekly limit is fully available.' },
            fiveHour: { remaining: 100, desc: 'Your 5-hour limit is fully available.' }
          },
          claudeGpt: {
            weekly: { remaining: 100, desc: 'Your weekly limit is fully available.' },
            fiveHour: { remaining: 100, desc: 'Your 5-hour limit is fully available.' }
          }
        };
      }

      const userStatus = data.userStatus;
      const models = userStatus.cascadeModelConfigData?.clientModelConfigs || [];

      // Extrai Modelos Gemini
      const geminiModels = models.filter(m => {
        const name = (m.label || m.modelId || '').toLowerCase();
        return name.includes('gemini');
      });

      // Modelo Gemini ativo/representativo (ex: Flash High / Pro)
      const activeGemini = geminiModels.find(m => m.quotaInfo) || geminiModels[0];
      const geminiFraction = activeGemini?.quotaInfo?.remainingFraction ?? 1;
      const geminiRemaining = Math.round(geminiFraction * 100);
      const geminiResetTime = activeGemini?.quotaInfo?.resetTime;

      // Extrai Modelos Claude e GPT
      const claudeGptModels = models.filter(m => {
        const name = (m.label || m.modelId || '').toLowerCase();
        return name.includes('claude') || name.includes('gpt') || name.includes('oss');
      });

      const activeClaudeGpt = claudeGptModels.find(m => m.quotaInfo) || claudeGptModels[0];
      const claudeFraction = activeClaudeGpt?.quotaInfo?.remainingFraction ?? 1;
      const claudeRemaining = Math.round(claudeFraction * 100);
      const claudeResetTime = activeClaudeGpt?.quotaInfo?.resetTime;

      // Quota semanal do plano (se disponível em planStatus ou proporcional ao consumo)
      const weeklyPlanInfo = userStatus.planStatus?.quotaInfo;
      let geminiWeeklyRemaining = weeklyPlanInfo ? Math.round(weeklyPlanInfo.remainingFraction * 100) : geminiRemaining;
      let geminiWeeklyResetTime = weeklyPlanInfo?.resetTime || geminiResetTime;

      let claudeWeeklyRemaining = weeklyPlanInfo ? Math.round(weeklyPlanInfo.remainingFraction * 100) : claudeRemaining;
      let claudeWeeklyResetTime = weeklyPlanInfo?.resetTime || claudeResetTime;

      const result = {
        gemini: {
          weekly: {
            remaining: geminiWeeklyRemaining,
            desc: this.formatRelativeTime(geminiWeeklyResetTime, true, geminiWeeklyRemaining)
          },
          fiveHour: {
            remaining: geminiRemaining,
            desc: this.formatRelativeTime(geminiResetTime, false, geminiRemaining)
          }
        },
        claudeGpt: {
          weekly: {
            remaining: claudeWeeklyRemaining,
            desc: this.formatRelativeTime(claudeWeeklyResetTime, true, claudeWeeklyRemaining)
          },
          fiveHour: {
            remaining: claudeRemaining,
            desc: this.formatRelativeTime(claudeResetTime, false, claudeRemaining)
          }
        }
      };

      this.cachedQuota = result;
      this.lastFetchTime = Date.now();
      return result;
    } catch (e) {
      console.error('[QuotaModel] Erro ao obter quota em tempo real:', e);
      return this.cachedQuota || {
        gemini: {
          weekly: { remaining: 100, desc: 'Your weekly limit is fully available.' },
          fiveHour: { remaining: 100, desc: 'Your 5-hour limit is fully available.' }
        },
        claudeGpt: {
          weekly: { remaining: 100, desc: 'Your weekly limit is fully available.' },
          fiveHour: { remaining: 100, desc: 'Your 5-hour limit is fully available.' }
        }
      };
    }
  }
}

module.exports = QuotaModel;
