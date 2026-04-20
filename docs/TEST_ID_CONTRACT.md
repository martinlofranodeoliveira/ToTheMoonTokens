# Test IDs Technical Contract

## 1. Nomenclatura
O padrão de nomenclatura para Test IDs deve seguir o formato kebab-case e ser inserido no atributo HTML `data-testid`.
Formato: `data-testid="{contexto}-{elemento}-{ação_ou_estado}"`

- **contexto**: Tela, área ou jornada (ex: `dashboard`, `wallet`, `journal`, `guardrail`).
- **elemento**: O tipo de componente (ex: `button`, `panel`, `list`, `item`, `metric`, `banner`).
- **ação_ou_estado** (Opcional): O que o elemento faz ou seu estado de renderização (ex: `refresh`, `connect`, `loading`, `error`, `empty`, `value`).

Exemplos:
- `data-testid="dashboard-button-refresh"`
- `data-testid="wallet-button-connect"`
- `data-testid="journal-list-empty"`

## 2. Obrigatoriedade por Camada
A adoção de test IDs é guiada por uma abordagem orientada a testes de aceitação e regressão:

1. **Elementos Interativos (Camada de Ação):** Obrigatório em botões, links, inputs e formulários críticos para a jornada.
2. **Containers de Dados (Camada de Visualização):** Obrigatório nas seções principais, listas e painéis que exibem métricas e resultados dinâmicos.
3. **Feedback e Observabilidade (Camada de Estado):** Obrigatório em banners de erro, estados de carregamento (loading), listas vazias (empty states) e indicadores de status.

## 3. Cobertura de Estados
Ao mapear um componente, devemos cobrir as variações de estado que impactam o comportamento e a visibilidade:
- **Success / Ready:** O estado feliz e carregado.
- **Empty:** Quando não existem registros ou dados disponíveis.
- **Error / Offline:** Falha na requisição, conexão indisponível ou validações bloqueantes.
- **Guarded:** Estado específico para bloqueios operacionais (ex: Guardrails bloqueando Mainnet).

## 4. Mapeamento de Impacto (Jornadas Críticas)

Abaixo, o impacto documentado para a interface atual em `apps/web/index.html` e `apps/web/app.js`:

### Jornada de Execução (Guardrails)
- `data-testid="guardrail-status"`: Mostra se o modo é testnet ou offline.
- `data-testid="guardrail-message"`: Mostra a mensagem de bloqueio/armado.
- `data-testid="guardrail-reasons-list"`: Lista com motivos de guardrail.

### Jornada de Conexão de Wallet
- `data-testid="wallet-button-connect"`: Botão para disparar o MetaMask.
- `data-testid="dashboard-banner-status"`: Feedback de sucesso, aviso ou erro sobre a conexão (estados: success, error, warning).

### Jornada de Monitoramento (Dashboard / Métricas)
- `data-testid="dashboard-button-refresh"`: Botão de atualizar dashboard.
- `data-testid="metric-net-profit"`: Container de valor do Net Profit.
- `data-testid="metric-return-pct"`: Container de valor do Return.
- `data-testid="metric-drawdown-pct"`: Container de valor do Drawdown.
- `data-testid="metric-profit-factor"`: Container de valor do Profit Factor.

### Jornada de Desempenho e Diário (Paper Trading)
- `data-testid="strategy-list"`: Lista de estratégias.
- `data-testid="performance-list"`: Lista de desempenho (inclui estado empty).
- `data-testid="journal-list"`: Diário de trades recentes (inclui estado empty).
- `data-testid="connector-list"`: Lista de status de conectores (Binance, Wallet, Market).
