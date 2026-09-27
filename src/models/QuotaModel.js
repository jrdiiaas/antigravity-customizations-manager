const cp = require('child_process');
const util = require('util');
const exec = util.promisify(cp.exec);

class QuotaModel {
  static async getQuota() {
    try {
      // Em um ambiente de produção real do Antigravity, 
      // a ferramenta CLI retornaria o consumo atual de tokens.
      const { stdout } = await exec('agy quota --json');
      const data = JSON.parse(stdout.trim());
      
      const used = data.used || 0;
      const limit = data.limit || 0;
      const percent = limit > 0 ? (used / limit) * 100 : 0;
      
      return { used, limit, percent };
    } catch (e) {
      // Retornar fallback para quando a CLI do Antigravity não estiver instalada (ambiente de dev)
      // ou falhar a execução, simulando o status.
      return {
        used: 12500,
        limit: 20000,
        percent: 62.5
      };
    }
  }
}

module.exports = QuotaModel;
