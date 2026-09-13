# ⚡ Gestor de Tokens IA (MCP Servers, Skills e Rules)

[![Open VSX Version](https://img.shields.io/open-vsx/v/escola-sinc/antigravity-customizations-manager?style=for-the-badge&color=8b5cf6&logo=eclipseide)](https://open-vsx.org/extension/escola-sinc/antigravity-customizations-manager)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/escola-sinc/antigravity-customizations-manager?style=for-the-badge&color=38bdf8)](https://open-vsx.org/extension/escola-sinc/antigravity-customizations-manager)
[![License: MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-yellow.svg?style=for-the-badge)](https://github.com/jrdiiaas/antigravity-customizations-manager/blob/main/LICENSE)
[![Escola SINC](https://img.shields.io/badge/Desenvolvido%20por-Escola%20SINC-purple?style=for-the-badge)](https://escolasinc.com.br)

Painel lateral visual com alternadores táteis (*toggles* estilo macOS/iOS) para ligar e desligar **Servidores MCP**, **Skills** e **Regras (Rules)** no **Google Antigravity IDE** e no **VS Code** com apenas 1 clique.

Monitore seu **Orçamento de Tokens (Token Budget)** em tempo real e evite o alerta de *"Customization token budget exceeded. Large customizations will be truncated"*.

---

## 🎯 Por que usar o Gestor de Tokens IA?

Quando você utiliza múltiplos servidores MCP (Brevo, Google Ads, Meta Ads, WAHA, n8n) e dezenas de skills especializadas, o pre-prompt do agente pode facilmente ultrapassar **20.000 tokens por mensagem**, causando lentidão (*Time to First Token* alto) e perda de foco do modelo.

Com o **Gestor de Tokens IA**, você ganha um painel dedicado na sua barra lateral para:

* **⚡ Acesso em 1 Clique:** Ícone de raio na Activity Bar, sem precisar navegar por menus de configurações complexos.
* **📊 Orçamento de Tokens em Tempo Real:** Barra de progresso dinâmica que calcula o consumo total estimado e avisa quando você está próximo do limite de truncamento.
* **🔌 Controle de Servidores MCP:** Desative ferramentas de marketing ou APIs externas quando estiver focado em código, economizando até 15.000 tokens por turno de conversa.
* **🧠 Gestão de Skills & Agentes:** Silencie pacotes de skills temporariamente de forma 100% segura e não destrutiva.
* **📜 Alternador de Regras (Rules):** Ligue ou desligue diretrizes globais e de workspace instantaneamente.
* **🚨 Botão de Pânico (⚡ Desligar MCPs):** Desative todos os servidores MCP de uma vez só com um toque quando precisar de economia máxima de tokens.

---

## 📸 Demonstração Visual (Capturas de Tela Reais)

### 1. Visão Geral do Painel & Medidor de Orçamento
Acompanhe o consumo total em relação ao teto de 20.000 tokens, realize buscas rápidas e acesse botões de ação imediata.

![Visão Geral do Orçamento de Tokens](https://raw.githubusercontent.com/jrdiiaas/antigravity-customizations-manager/main/resources/screenshots/01-painel-orcamento-tokens.png)

---

### 2. Controle de Servidores MCP
Veja todos os servidores configurados com identificação de escopo (`GLOBAL` ou `LOCAL`) e comandos, podendo alterná-los com switches táteis suaves.

![Servidores MCP com Toggles](https://raw.githubusercontent.com/jrdiiaas/antigravity-customizations-manager/main/resources/screenshots/02-servidores-mcp.png)

---

### 3. Gestão de Skills e Agentes Especialistas
Ative apenas as skills relevantes para o momento da sua sessão de programação.

![Skills e Agentes com Toggles](https://raw.githubusercontent.com/jrdiiaas/antigravity-customizations-manager/main/resources/screenshots/03-skills-agentes.png)

---

### 4. Alternador de Regras e Diretrizes
Controle quais regras do agente devem ser injetadas a cada requisição.

![Regras e Instruções](https://raw.githubusercontent.com/jrdiiaas/antigravity-customizations-manager/main/resources/screenshots/04-regras-instrucoes.png)

---

## 🚀 Guia Rápido de Uso

1. Após instalar a extensão, localize o **ícone de Raio (⚡)** na sua barra lateral (Activity Bar).
2. Clique no ícone para abrir a aba do **Gestor de Tokens IA**.
3. **Para economizar tokens rapidamente:**
   * Clique em **`⚡ Desligar MCPs`** para silenciar todas as integrações pesadas.
   * O medidor de tokens será recalculado na hora, saindo do estado de perigo (*Orçamento Excedido*) para o estado verde (*Saudável*).
4. Quando precisar usar uma ferramenta específica (ex: rodar um workflow n8n ou criar campanha), basta expandir a seção e ligar a chave do respectivo servidor!

---

## 🏛️ Arquitetura & Segurança

O Gestor de Tokens IA foi construído sob rigorosa arquitetura **Model-View-Controller (MVC)**:

* **Manipulação Segura e Atômica:** Todo ajuste em arquivos de configuração (`mcp_config.json`) gera um backup automático preventivo (`.bak`).
* **Operações Não Destrutivas:** O silenciamento de skills e regras utiliza convenção padronizada de sufixo `.disabled`, preservando integralmente seu código e configurações originais.
* **Sincronização em Tempo Real:** Watchers de arquivo nativos atualizam o painel caso qualquer configuração seja alterada externamente.

---

## 🤖 Pipeline de CI/CD & Publicação Contínua (GitHub Actions)

O projeto conta com automação de ponta a ponta via **GitHub Actions** (`.github/workflows/publish.yml`):

* **Gatilhos de Publicação:**
  * **Nova Release:** Ao publicar uma release no GitHub, o pacote `.vsix` é construído e enviado automaticamente.
  * **Tags Git:** Ao enviar uma tag versionada (`git tag v1.0.3 && git push origin v1.0.3`).
  * **Disparo Manual:** Pela aba **Actions > Publish to Open VSX > Run workflow**.
* **Configuração da Secret no GitHub:**
  * No repositório, acesse `Settings > Secrets and variables > Actions > New repository secret`.
  * Nome do Segredo: `OVSX_PAT`
  * Valor: Seu Personal Access Token do Open VSX Registry.

---

## 🔗 Links & Suporte Oficial

* **Repositório Oficial:** [github.com/jrdiiaas/antigravity-customizations-manager](https://github.com/jrdiiaas/antigravity-customizations-manager)
* **Reportar Problemas & Sugestões (Issues):** [github.com/jrdiiaas/antigravity-customizations-manager/issues](https://github.com/jrdiiaas/antigravity-customizations-manager/issues)
* **Escola SINC:** [escolasinc.com.br](https://escolasinc.com.br)
* **Autor:** Alexandre Sousa Dias Junior / Escola SINC
* **Licença:** MIT (Código Aberto e Gratuito)
