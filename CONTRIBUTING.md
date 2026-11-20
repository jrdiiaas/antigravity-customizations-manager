# Guia de Contribuição & Publicação (CI/CD)

Instruções para desenvolvedores e mantenedores do projeto **Gestor de Tokens IA (`antigravity-customizations-manager`)**.

---

## 🛠️ Ambiente de Desenvolvimento Local

1. **Requisitos:**
   - Node.js >= 18.x
   - VS Code ou Google Antigravity IDE
   - `@vscode/vsce` para empacotamento VSIX

2. **Instalação de Dependências & Testes:**
   ```bash
   npm install
   npm test
   ```

3. **Empacotamento Manual (.vsix):**
   ```bash
   npx @vscode/vsce package --no-dependencies
   ```

---

## 🤖 Pipeline de CI/CD & Publicação Contínua (GitHub Actions)

O repositório possui automação completa via GitHub Actions (`.github/workflows/publish.yml`) para compilar e publicar automaticamente no **Open VSX Registry** sob o namespace `escola-sinc`.

### Gatilhos de Disparo
* **Nova Release no GitHub:** Ao criar uma nova release oficial pela interface web.
* **Tags Git Versionadas:** Ao enviar uma tag Git compatível com SemVer:
  ```bash
  git tag v2.2.0
  git push origin v2.2.0
  ```
* **Disparo Manual (Workflow Dispatch):** Acesse a aba **Actions > Publish to Open VSX > Run workflow** no GitHub.

### Configuração de Segredos (Secrets)
Para que o workflow consiga publicar no registro, configure o token:
1. No repositório GitHub, acesse: `Settings > Secrets and variables > Actions > New repository secret`.
2. **Nome do Segredo:** `OVSX_PAT`
3. **Valor:** Seu Personal Access Token gerado na conta do Open VSX Registry.
