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


## Frontend e deploy publico

- trate `apps/web-next` como a superficie SaaS React ativa; `apps/web` e `apps/pitch` continuam sendo superficies estaticas de demo
- em deploy GCP VM, o dashboard SaaS publico deve responder em `/saas/`; a raiz `/` pode continuar como landing do Agent Market
- qualquer tarefa frontend precisa validar `npm ci --include=dev`, `npm run build` e smoke Playwright quando tocar fluxo de login, dashboard, billing, API keys ou responsividade
- browser smoke em producao deve registrar `/health`, `/ready`, `/`, `/pitch/`, `/ops/`, `/saas/` e `/config.js`, incluindo desktop e mobile quando a tarefa for UI
- nao marque UI como pronta se ela so funciona em mock local; confirme o caminho servido pelo Caddy/Compose ou registre o blocker exato

## CI/CD e evidencia

- pushes para `main` precisam manter GitHub Actions, mirror GitLab e deploy VM no mesmo SHA
- antes de handoff de release, rode ou cite evidencia de `make api-baseline`, `make web-next-build`, CI GitHub, CI GitLab e smoke publico da VM
- nao publique segredos em logs, docs ou screenshots; use apenas nomes de secrets e endpoints publicos

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
