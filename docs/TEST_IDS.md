# Escopo e Critérios de Aceite para Test IDs nas Jornadas Críticas

Este documento define o escopo de atuação e os critérios de aceite para a instrumentação de testes (Test IDs) nas jornadas críticas da aplicação web ToTheMoonTokens, permitindo automação de testes E2E e prevenindo regressões silenciosas de UI.

## Escopo Operacional (Jornadas Críticas)

A instrumentação de Test IDs deve cobrir exaustivamente as seguintes jornadas:

1. **Dashboard de Métricas (Backtesting e Paper Trading)**
   - Painéis de métricas financeiras (Net Profit, Return, Max Drawdown, Profit Factor).
   - Listagem de estratégias disponíveis no catálogo.
   - Lista de performance agregada e estados vazios iniciais.

2. **Execution Controls e Guardrails**
   - Indicador de modo de execução atual (`runtime-mode`).
   - Cópia descritiva de status do guardrail.
   - Listagem de razões de bloqueio de execução.

3. **Paper Trading Journaling**
   - Lista de transações (Recent paper trades).
   - Estados de erro ou ausência de entradas no diário.
   - Valores individuais de cada trade renderizado.

4. **Conectores e Integração de Wallet**
   - Painel de status da Exchange.
   - Status de Market heartbeat.
   - Botões e fluxos de conexão de carteira (MetaMask).
   - Banner de feedback (Status Banner) indicando sucesso, erro ou info.

## Critérios de Aceite (Acceptance Criteria)

Para que uma entrega envolvendo UI nestas jornadas seja considerada aprovada, os seguintes critérios devem ser cumpridos:

1. **Obrigatoriedade e Cobertura Base**
   - Todo elemento interativo (botões, links), contêiner de dados dinâmico e banner de feedback (alertas, erros) deve possuir um atributo identificador claro para testes E2E.
   - Os identificadores devem estar presentes nativamente no HTML base ou gerados dinamicamente via JavaScript sem ambiguidades.
   - Recomenda-se fortemente o uso de `data-testid="..."` para desacoplar de `id` e `class`, facilitando a vida do QA e garantindo resiliência contra refatorações de layout, ainda que `id` seja tolerado se único.

2. **Padrão de Nomenclatura**
   - Utilizar padrão `kebab-case` para todos os identificadores (ex: `connect-wallet-button`, `metric-net-profit`, `status-banner`).
   - Os nomes devem refletir o domínio de negócio e intenção, não a representação visual (ex: preferir `data-testid="guardrail-reasons-list"` ao invés de `data-testid="red-ul-box"`).

3. **Cobertura de Transição de Estados**
   - Elementos que mudam de estado visual ou conteúdo devem ter identificadores persistentes.
   - **Estados Vazios (Empty States):** Mensagens de ausência de dados devem ser testáveis (ex: `data-testid="empty-journal-message"`).
   - **Estados de Falha e Status:** Banners de alerta ou sucesso devem possuir identificação explícita (ex: `data-testid="status-banner"`), testando variantes sem depender de leitura de cor.

4. **Desacoplamento e Prevenção de Regressão**
   - A alteração de um Test ID documentado nas jornadas críticas aciona falha imediata na validação, exceto se houver reformulação total da funcionalidade aprovada.
   - O código não deve quebrar ao depender de identificadores específicos em regressões.

5. **Prontidão de Observabilidade (Diagnóstico de Falha)**
   - O uso de Test IDs deve permitir que logs de teste automatizados capturem claramente diagnósticos baseados no domínio ("Falhou ao encontrar `data-testid="status-banner"` com erro de Wallet") ao invés de falhas frágeis de XPath ou CSS Selectors.

Estes critérios balizam tanto a implementação técnica quanto o review de QA e automação E2E nas jornadas operacionais deste repositório.
