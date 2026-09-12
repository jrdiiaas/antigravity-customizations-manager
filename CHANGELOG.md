# Histórico de Mudanças (Changelog)

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Semantic Versioning (SemVer)](https://semver.org/lang/pt-BR/).

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
