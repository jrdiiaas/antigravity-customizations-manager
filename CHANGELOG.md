# Histórico de Mudanças (Changelog)

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Semantic Versioning (SemVer)](https://semver.org/lang/pt-BR/).

---

## [1.1.1] - 2026-09-22

### Adicionado
- **Suporte Oficial a Agentes Especialistas:** Implementação do modelo `AgentsModel.js` para varredura e controle dos agentes do ambiente (`.agents/agent/` no workspace e `~/.gemini/config/agent/` global), com extração de metadados via frontmatter YAML (nome, descrição, skills e ferramentas) e chaveamento ativo/inativo.
- **Seção e Accordion Dedicado para Agentes:** Separação visual entre a seção de Skills (`🧠`) e a nova seção de Agentes Especialistas (`🤖`) no painel da Webview, com contadores independentes.
- **Detecção de Skills em Plugins:** O `SkillsModel.js` agora identifica recursivamente skills embutidas em pacotes de plugins (`.agents/plugins/*/skills`), rotulando-as com badge identificador de plugin.
- **Identificador Físico de Arquivo em Regras:** Exibição do nome de arquivo em disco como badge ao lado do título da regra, permitindo saber exatamente qual arquivo Markdown corresponde a cada diretriz.

### Modificado
- **Refatoração Visual de Metadados e Tags (Layout de Lista):** Reposicionamento das tags e badges para uma linha dedicada logo abaixo do título de cada item, eliminando a disputa de espaço horizontal e truncamentos em painéis laterais estreitos.
- **Resolução Canônica de Escopo para Agentes:** O modelo `AgentsModel.js` agora verifica links simbólicos (`symlinks`), garantindo que diretórios de workspace apontando para diretórios globais sejam rotulados fielmente com o escopo correspondente.
- **Cálculo Abrangente de Token Budget:** `ContextBudgetModel.js` atualizado para incorporar o impacto estimado no prompt de sistema de todos os Agentes Especialistas e Skills de Plugins ativos.
- **Busca Global Multimódulo:** O campo de busca em tempo real agora pesquisa simultaneamente Servidores MCP, Skills, Agentes Especialistas e Regras (por título, nome de arquivo, comando e descrição).

### Corrigido
- **Ambiguidade na Identificação de Regras:** Correção do comportamento que exibia exclusivamente o cabeçalho `#` do arquivo Markdown, permitindo agora visualizar e buscar o nome real do arquivo no disco.

---

## [1.0.2] - 2026-09-12

### Adicionado
- **Resolução Canônica de Arquivos:** Suporte a detecção e resolução de links simbólicos (`symlinks`) nos modelos de escaneamento de regras e skills.

### Modificado
- **Otimização no Cálculo de Tokens:** O algoritmo de estimativa do *Token Budget* agora contabiliza exclusivamente arquivos físicos únicos, eliminando sobreposições causadas por múltiplos apontamentos para o mesmo diretório.

### Corrigido
- **Desduplicação de Regras e Skills:** Correção de duplicidade na listagem visual quando diretórios locais de workspace apontam para pastas globais de configuração.

---

## [1.0.1] - 2026-09-12

### Adicionado
- **Galeria Visual de Demonstração:** Inclusão de capturas de tela demonstrativas no `README.md` e na documentação oficial da extensão.
- **Repositório Público Oficial:** Conexão oficial com o repositório de código aberto no GitHub e central de rastreamento de problemas (Issues).

### Modificado
- **Rebranding e Localização:** Atualização do nome de exibição para **Gestor de Tokens IA (MCP Servers, Skills e Rules)** com localização integral de todos os termos e mensagens da interface para Português do Brasil (`pt-BR`).
- **Padronização de Escopos:** Identificadores visuais nos itens da lista padronizados para `LOCAL` e `GLOBAL`.

---

## [1.0.0] - 2026-09-12

### Adicionado
- **Painel Lateral na Activity Bar:** Ícone de acesso rápido (⚡) para gerenciamento de contexto sem necessidade de navegação por menus de configurações.
- **Medidor de Token Budget em Tempo Real:** Barra de progresso visual com estimativa de consumo baseada no teto do agente e alertas de estado (*Saudável*, *Atenção*, *Orçamento Excedido*).
- **Controle Tátil de Servidores MCP:** Alternadores liga/desliga estilo macOS/iOS para servidores MCP globais e de workspace com edição segura e atômica de `mcp_config.json`.
- **Gestão Não Destrutiva de Skills e Rules:** Mecanismo de silenciamento reversível de pacotes de skills e diretrizes de comportamento.
- **Ação de Desativação Rápida:** Botão de ação em lote para desativar todos os servidores MCP instantaneamente em tarefas com foco estrito em código.
- **Busca em Tempo Real:** Filtro rápido por nome de módulo, comando ou descrição.
