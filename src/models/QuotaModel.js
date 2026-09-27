const cp = require('child_process');
const util = require('util');
const exec = util.promisify(cp.exec);

class QuotaModel {
  static async getQuota() {
    try {
      // Em um ambiente de produção real do Antigravity, 
      // a ferramenta CLI retornaria o consumo atual de tokens.
      // const { stdout } = await exec('agy quota --json');
      // const data = JSON.parse(stdout.trim());
      
      // Simulando a estrutura requerida pelo novo design visual
      return {
        gemini: {
          weekly: {
            remaining: 59,
            desc: 'You have used some of your weekly limit, it will fully refresh in 2 days, 20 hours.'
          },
          fiveHour: {
            remaining: 77,
            desc: 'You have used some of your 5-hour limit, it will fully refresh in 2 hours, 43 minutes.'
          }
        },
        claudeGpt: {
          weekly: {
            remaining: 64,
            desc: 'You have hit your 5-hour limit, so the weekly limit does not currently apply. Your 5-hour limit will refresh in 2 hours, 40 minutes.'
          },
          fiveHour: {
            remaining: 0,
            desc: 'You have hit your 5-hour limit, it will refresh in 2 hours, 40 minutes. If on a supported paid plan, you can use AI credits in the interim.'
          }
        }
      };
    } catch (e) {
      return {
        gemini: {
          weekly: { remaining: 0, desc: 'Erro ao buscar dados.' },
          fiveHour: { remaining: 0, desc: 'Erro ao buscar dados.' }
        },
        claudeGpt: {
          weekly: { remaining: 0, desc: 'Erro ao buscar dados.' },
          fiveHour: { remaining: 0, desc: 'Erro ao buscar dados.' }
        }
      };
    }
  }
}

module.exports = QuotaModel;
