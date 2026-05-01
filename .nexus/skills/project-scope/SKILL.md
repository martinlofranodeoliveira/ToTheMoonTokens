# ToTheMoonTokens Project Scope

Use esta skill quando a task envolver este repositorio.

## Regras do projeto

- trate o produto como vertical segura do hackathon para artefatos pagos
- priorize request -> payment -> settlement -> review -> delivery
- trate backtesting, journal e market context como engine interna de evidencia
- nao reabra narrativa de bot de trading, signal marketplace legado ou live arm
- nao prometa lucro, alpha, execucao real ou prontidao operacional de trading
- mantenha qualquer wallet flow em modo manual, auditavel e testnet-only

## O que priorizar

- backlog `ARC-HACK-*`
- narrativa clara para juizes em menos de 90 segundos
- fluxo economico audivel e seguro
- estado de job, review e unlock de entrega
- journal, metricas e provas de estado
- UI legivel para demo
- testes automatizados no caminho principal

## Leituras obrigatorias antes de implementar

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/hackathon/HACKATHON_5_DAY_PLAN.md`
- `docs/hackathon/HACKATHON_EXECUTION_PACK.md`
- `docs/hackathon/HACKATHON_SUBMISSION_DRAFT.md`
- `ops/arc_circle_hackathon_backlog.json`

## O que evitar

- backlog legado `TTM-*`
- usar `docs/HACKATHON_AGENTIC_ARC.md` como fonte de verdade sem validar a arquitetura atual
- qualquer nova automacao de trading
- fluxos de ativacao manual para ordem
- refactors amplos fora do MVP

## Se tocar na engine legada

- preserve contratos de `/api/dashboard`, `/api/journal/*` e guardrails
- explique no diff por que a mudanca melhora artefato, review ou evidencia
- evite expandir superfícies de produto baseadas em estrategia, PnL ou sinal
