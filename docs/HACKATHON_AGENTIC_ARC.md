# Hackathon brief — Agentic Economy on Arc (TTM Agent Market)

Documento de escopo para o hackaton "Agentic Economy on Arc" (Arc + Circle + lablab.ai).
Este arquivo é a fonte de verdade para qualquer agente (humano, Claude ou Nexus) que
for trabalhar na submissão.

## 1. Contexto e deadline

- Janela: 20 a 26 de abril de 2026.
- Submissão: até 25/abr (final do dia, fuso de SF).
- On-site (se aprovado): 25-26/abr, MindsDB SF AI Collective — 3154 17th St, SF, CA.
- Premiação: pool de US$ 15.000+.
- Página: https://lablab.ai/event/agentic-economy-on-arc
- Stack obrigatório/premiado: **Arc L1 + Circle Nanopayments + USDC**; opcionais: Circle Wallets, Gateway, CCTP, Paymaster.
- Incentivo extra: US$ 500 USDC para o melhor feedback de produto (campo "Circle Product Feedback").

## 2. One-liner e pitch

**TTM Agent Market** — marketplace onchain onde agentes de IA **compram e vendem sinais
quantitativos em tempo real** usando **Circle Nanopayments** liquidados em **USDC na Arc**.
Cada chamada de API é uma micropagamento sub-cent, com liquidação determinística e
sem gas overhead.

### Frase de 255 chars (curta)

> TTM Agent Market é um marketplace de sinais quantitativos entre agentes de IA, onde cada chamada de API é liquidada em USDC sub-cent na Arc via Circle Nanopayments. Research agents publicam sinais, consumer agents pagam por uso, sem gas, com finalidade instantânea.

### Descrição longa (≈ 900 chars, reaproveitar no form)

> TTM Agent Market transforma a infraestrutura de pesquisa quantitativa da ToTheMoonTokens
> em um mercado onchain para agentes de IA. Research Agents rodam backtests determinísticos
> e publicam sinais (entrada, stop, alvo, score de probabilidade por regime). Consumer Agents
> — bots de paper trading, dashboards ou outros LLMs — pagam por chamada em USDC sub-cent,
> liquidados na Arc L1 via Circle Nanopayments. Cada agente tem uma Circle Wallet
> dedicada; um Auditor Agent confirma settlement antes de liberar o payload do sinal;
> um Treasury Agent consolida fluxo e mantém reserva operacional. O diferencial: toda a
> disciplina de guardrails (paper-first, no-mainnet trading, checklist de probabilidade,
> journal auditável) já existe e é reutilizada. O que é novo é a camada econômica:
> pricing per-action, reputação medida por PnL agregado dos sinais entregues, e
> liquidação instantânea dollar-denominated.

## 3. Golden paths (o que a demo precisa mostrar)

1. **Research Agent publica sinal**
   Agente roda `POST /api/backtests/run`, compõe um SignalEnvelope (ativo, horizonte,
   entry/stop/target, probabilidade, expiração), anexa preço em USDC e publica no
   marketplace.

2. **Consumer Agent descobre e paga**
   Consumer Agent chama `GET /api/market/signals?tier=medium` → escolhe um sinal →
   dispara pagamento Circle Nanopayments → recebe payload + recibo onchain.

3. **Settlement verificado, sinal entregue**
   Auditor Agent valida o tx na Arc → só então o gateway entrega o payload completo
   do sinal. Se settlement falhar, o consumer não vê nada além do preview público.

4. **Reputação atualizada automaticamente**
   Quando o sinal expira/invalida, o Journal (já existente) registra o resultado.
   Um Reputation Agent recalcula score do Research Agent por regime/timeframe e
   ajusta o preço de tabela para a próxima janela.

## 4. Arquitetura — reuso vs. novo

### Reusar (já existe no repo)

| Módulo atual | Papel no projeto do hackaton |
|---|---|
| `services/api/src/tothemoon_api/backtesting.py` | motor de sinais dos Research Agents |
| `services/api/src/tothemoon_api/scalp.py` | validação de setup antes de publicar sinal |
| `services/api/src/tothemoon_api/journal.py` | outcome tracking para reputação |
| `services/api/src/tothemoon_api/guards.py` | rate limit + guardrails de risco |
| `services/api/src/tothemoon_api/news.py` | filtro de risco (contexto macro do sinal) |
| `services/api/src/tothemoon_api/observability.py` | métricas Prometheus e logs estruturados |
| `services/api/src/tothemoon_api/market_data.py` | preço de referência (Binance testnet) |
| `apps/web` | base do dashboard do marketplace |
| `.nexus/hooks.js` | guardrails — **não alterar**; hackaton é Arc testnet, compatível |
| Nexus (http://127.0.0.1:4116) | orquestração dos agentes do produto |

### Construir do zero

| Novo módulo | Responsabilidade |
|---|---|
| `services/api/src/tothemoon_api/payments/circle_client.py` | wrapper Circle SDK (Wallets + Nanopayments) |
| `services/api/src/tothemoon_api/payments/metering.py` | middleware per-call: cotação, cobrança, recibo |
| `services/api/src/tothemoon_api/marketplace/signals.py` | SignalEnvelope, publish, discover, expire |
| `services/api/src/tothemoon_api/marketplace/listings.py` | catálogo + pricing tiers + reputação |
| `services/api/src/tothemoon_api/agents/identity.py` | AgentID, wallet mapping, JWT assinado |
| `services/api/src/tothemoon_api/agents/reputation.py` | score por agente, regime e timeframe |
| `services/api/src/tothemoon_api/arc/settlement.py` | verificação de tx na Arc, retries, dedupe |
| `apps/web/marketplace.html` + `marketplace.js` | UI do marketplace (research + consumer + treasury) |
| `apps/web/agent-dashboard.html` | card por agente: saldo USDC, receita, reputação |
| `ops/demo/seed_agents.py` | script de bootstrap: 3 research + 2 consumer + 1 auditor + 1 treasury |
| `ops/demo/run_demo.sh` | cenário reprodutível de 5 min para o vídeo |
| `.env.hackathon.example` | template com chaves Circle, Arc RPC, etc. |
| `docs/HACKATHON_AGENTIC_ARC.md` | este documento |
| `docs/CIRCLE_FEEDBACK.md` | rascunho do feedback (premiável em USD 500) |

### Variáveis de ambiente novas

```
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_WALLET_SET_ID=
ARC_RPC_URL=https://testnet-rpc.arc.network
ARC_CHAIN_ID=
NANOPAYMENT_MIN_USDC=0.0001
NANOPAYMENT_MAX_USDC=0.10
MARKETPLACE_SETTLEMENT_TIMEOUT_S=3
AGENT_JWT_SIGNING_KEY=
```

## 5. Plano de 5 dias (20 a 24/abr; 25 = polish/onsite, 26 = demo)

> Cada dia termina com um milestone verificável. Se um dia derrapar, o seguinte
> absorve — a demo do dia 5 é o único deadline duro.

### Dia 1 — 20/abr (hoje): fundação (**TTM-011, TTM-012, TTM-013**)

- Abrir conta Circle Developer + gerar entity secret.
- Criar wallet set + 7 dev-controlled wallets (1 por agente do demo) em Arc testnet.
- Instalar `@circle-fin/developer-controlled-wallets` ou SDK equivalente Python.
- Adicionar Arc MCP: `claude mcp add --transport http arc-docs https://docs.arc.network/mcp`.
- Escrever `payments/circle_client.py` com: `create_wallet`, `get_balance`, `transfer_usdc`.
- Smoke test: 2 wallets trocam 0,001 USDC entre si e o tx aparece no explorer Arc testnet.

**Milestone dia 1:** `scripts/smoke_circle_transfer.py` roda em < 3s e imprime hash do tx.

### Dia 2 — 21/abr: camada de metering e marketplace (**TTM-014, TTM-015**)

- Middleware FastAPI `metering.py`:
  - Header `X-Agent-ID` + assinatura JWT.
  - Antes da rota: `quote(route, params)` → `hold(amount)` → chama handler → `capture(receipt)`.
- `marketplace/signals.py`:
  - Modelo `SignalEnvelope` (reusa `BacktestRequest` + `ProbabilityChecklist`).
  - Rotas: `POST /api/market/signals/publish`, `GET /api/market/signals`, `GET /api/market/signals/{id}` (paywalled).
- Integrar com `journal.py` para gravar evento `signal_published` e `signal_consumed`.

**Milestone dia 2:** curl de consumer compra sinal → Circle debita → API devolve payload.

### Dia 3 — 22/abr: reputação, auditor e treasury (**TTM-016, TTM-017**)

- `agents/reputation.py`: score = f(PnL agregado do journal, hit-rate por regime, freshness).
- Reputation Agent roda em background (APScheduler ou hook Nexus) a cada 60s.
- `arc/settlement.py`: verifica recibo onchain antes de liberar payload (anti-replay).
- Treasury Agent: rebalance se wallet < floor; relatório `GET /api/treasury/report`.
- Ajustar hooks Nexus: garantir que nenhum agente tente escapar para mainnet trading (o
  mainnet do Arc é diferente do mainnet de **trading** e está permitido — mas vamos manter
  apenas **Arc testnet** durante o hackaton pra reduzir superfície).

**Milestone dia 3:** dashboard mostra saldo + reputação dos 7 agentes em tempo real.

### Dia 4 — 23/abr: UX do marketplace e cenário reprodutível (**TTM-018, TTM-019**)

- `apps/web/marketplace.html`: feed de sinais (live), botão "Subscribe & pay", painel do
  Research Agent logado (receita por hora, sinais ativos), painel do Consumer (histórico
  de compras, PnL dos sinais consumidos).
- `ops/demo/run_demo.sh`:
  - Sobe API, web, Nexus.
  - Bootstrapa 7 wallets + 0,50 USDC por consumer.
  - Lança loop: 1 research publica 1 sinal a cada 10s, 2 consumers competem pelo best score,
    treasury e reputação atualizam ao vivo.
- Stress test: 100 transações em 60s para mostrar sub-cent viability.

**Milestone dia 4:** `./ops/demo/run_demo.sh` roda 5 min limpos, zero erros, ≥ 50 nanopagamentos.

### Dia 5 — 24/abr: submissão (**TTM-020**)

- Gravar vídeo de 2-3 min: pitch + demo + arquitetura.
- Postar no X (**obrigatório tagar** @buildoncircle @arc @lablabai) e coletar link.
- Preencher formulário lablab.ai com os rascunhos da seção 7.
- Escrever `docs/CIRCLE_FEEDBACK.md` (incentivo de US$ 500) — seção 8.
- PR de release: squash de tudo em `feature/hackathon-arc-agent-market` → main.
- Tag `hackathon-arc-v1`.

**Milestone dia 5:** submissão enviada, X post live, PR mergeado, release taggeada.

### 25/abr onsite (se aprovado) / 26/abr demo day

- 25: polish da demo, ensaio de pitch de 3 min, refinar slides.
- 26: apresentação live, Q&A.

## 6. Task seeds para Nexus (padrão GitHub issue)

> **Status (20/abr, fim do dia 1):** as 16 issues abaixo **já foram filadas** no GitHub
> e indexadas pelo Nexus. Use esta seção como fonte histórica e para redelivery se
> o repo precisar ser re-bootstrapado. Consulte `ops/hackathon/file_issues.sh` e
> `ops/hackathon/file_issues_wave2.sh` para recriar em outro repo.

### Mapa de entrega

| Task    | GH issue | Priority | Fase                                   |
|---------|----------|----------|----------------------------------------|
| TTM-011 | #23      | P0       | Phase 1 — Foundations                  |
| TTM-012 | #24      | P0       | Phase 1 — Foundations                  |
| TTM-013 | #25      | P1       | Phase 1 — Foundations                  |
| TTM-014 | #26      | P0       | Phase 2 — Metering                     |
| TTM-015 | #27      | P0       | Phase 2 — Marketplace                  |
| TTM-016 | #28      | P1       | Phase 3 — Reputation & Audit           |
| TTM-017 | #29      | P2       | Phase 3 — Treasury                     |
| TTM-018 | #30      | P1       | Phase 4 — UX                           |
| TTM-019 | #31      | P0       | Phase 4 — Demo                         |
| TTM-020 | #32      | P0       | Phase 5 — Submission                   |
| TTM-021 | #33      | P1       | Phase 0 — Coordination (parent epic)   |
| TTM-022 | #34      | P0       | Phase 0 — Coordination (branch-slug fix) |
| TTM-023 | #35      | P0       | Phase 5 — Security review              |
| TTM-024 | #36      | P0       | Phase 4 — E2E integration test         |
| TTM-025 | #37      | P1       | Phase 5 — Pitch deck                   |
| TTM-026 | #38      | P0       | Phase 3 — Guardrail regression         |

### Caminhos críticos identificados

- **Bloqueio imediato:** TTM-022 (branch slugs corrompidos). 8 de 10 tasks iniciais
  receberam slugs do formato `gtmny-0NN-*` em vez de `ttm-0NN-*`. Resolver antes
  do primeiro commit em qualquer sub-task.
- **Dependência dura:** TTM-014 e TTM-015 dependem de TTM-011 + TTM-012. Demo
  (TTM-019) depende de 014/015/016/018.
- **Gates de qualidade:** TTM-023, TTM-024 e TTM-026 bloqueiam merge do PR de
  release (TTM-020).

O Nexus faz pull periódico de `/api/tasks` e atribui à squad correta a partir do
campo `suggestedSquad`.

<!-- TTM-011 START -->
**Backlog:** TTM-011
**Priority:** P0
**Phase:** Hackathon Phase 1 — Foundations
**Suggested squad:** architecture + devops + backend
**Objective:** Bootstrap da conta Circle Developer, criação de 7 wallets dev-controlled no Arc testnet e smoke test de transferência USDC sub-cent entre 2 wallets.
**Approved scope:**
- criar entity secret e registrar no `.env.hackathon` (nunca versionar)
- provisionar wallet set e 7 wallets rotuladas (research_01..03, consumer_01..02, auditor, treasury)
- implementar `services/api/src/tothemoon_api/payments/circle_client.py` com `create_wallet`, `get_balance`, `transfer_usdc`
- criar `scripts/smoke_circle_transfer.py` que transfere 0,001 USDC entre duas wallets e imprime o hash do tx
**Acceptance criteria:**
- smoke test roda em menos de 3s e devolve um hash válido na Arc testnet
- nenhum segredo Circle aparece em logs, commits ou arquivos versionados
- `circle_client.py` tem testes com mock do SDK cobrindo sucesso, erro de saldo e erro de rede
**Execution rules:**
- Arc testnet only — nunca mainnet
- falhar explícito se `CIRCLE_API_KEY` não estiver setado
- manter compatibilidade com os hooks do Nexus
**Out of scope:** wallets user-controlled, Paymaster, CCTP
<!-- TTM-011 END -->

<!-- TTM-012 START -->
**Backlog:** TTM-012
**Priority:** P0
**Phase:** Hackathon Phase 1 — Foundations
**Suggested squad:** architecture + backend
**Objective:** Definir AgentID, identidade assinada (JWT) e mapping agent→wallet para todas as rotas do marketplace.
**Approved scope:**
- módulo `agents/identity.py` com `AgentID`, assinatura HS256, validação de claims (role, wallet_address, exp)
- middleware FastAPI que injeta `request.state.agent` a partir do header `X-Agent-Token`
- rota `POST /api/agents/register` (local-only, não exposta em produção) para bootstrap
- testes: token válido, expirado, assinatura quebrada, role incompatível
**Acceptance criteria:**
- toda rota paywalled exige agente autenticado
- auditor agent tem role separada do research/consumer
- segredo JWT vem de env var, nunca hardcoded
**Execution rules:**
- preferir claims mínimos (role, agent_id, wallet_id)
- sem criação de wallet implícita — usar as da TTM-011
<!-- TTM-012 END -->

<!-- TTM-013 START -->
**Backlog:** TTM-013
**Priority:** P1
**Phase:** Hackathon Phase 1 — Foundations
**Suggested squad:** devops + architecture
**Objective:** Adicionar Arc MCP server ao fluxo de desenvolvimento e documentar o procedimento.
**Approved scope:**
- atualizar `docs/CONTRIBUTING.md` com `claude mcp add --transport http arc-docs https://docs.arc.network/mcp`
- registrar endpoint no `.claude/settings.local.json` se aplicável
- pequeno smoke: perguntar ao MCP "what smart contract standards does Arc support" e registrar evidência em `ops/evidence/arc-mcp-check.json`
**Acceptance criteria:**
- onboarding de novo dev/agente leva menos de 5 min para ter contexto Arc
- evidência versionada (sem segredos)
<!-- TTM-013 END -->

<!-- TTM-014 START -->
**Backlog:** TTM-014
**Priority:** P0
**Phase:** Hackathon Phase 2 — Metering
**Suggested squad:** backend + architecture + qa
**Objective:** Middleware de metering que cota, cobra e registra recibo de cada chamada paywalled.
**Approved scope:**
- `payments/metering.py` com `quote`, `hold`, `capture`, `refund`
- integração como FastAPI middleware: antes do handler, cota + hold; depois, capture com recibo
- integração com `journal.py` para gravar `payment_captured` e `payment_refunded`
- tabela de preços inicial em `payments/pricing.yaml` (base tier, premium tier, realtime tier)
- métricas Prometheus: `nanopayment_total`, `nanopayment_latency_ms`, `nanopayment_failures_total`
**Acceptance criteria:**
- consumer sem saldo recebe 402 Payment Required com preview público do sinal
- rota não-paywalled continua gratuita
- cobertura de testes ≥ 80% no módulo metering
- p95 de overhead do middleware < 150 ms (com Circle sandbox)
**Execution rules:**
- idempotência por `X-Payment-Intent-ID`
- nunca liberar payload premium antes do capture confirmado
<!-- TTM-014 END -->

<!-- TTM-015 START -->
**Backlog:** TTM-015
**Priority:** P0
**Phase:** Hackathon Phase 2 — Marketplace
**Suggested squad:** backend + product + qa
**Objective:** Marketplace de sinais: publish, discover, consume.
**Approved scope:**
- modelo `SignalEnvelope` reusando `BacktestRequest` + `ProbabilityChecklist` + campos `price_usdc`, `ttl_s`, `publisher_agent_id`
- rotas:
  - `POST /api/market/signals/publish` (research only)
  - `GET /api/market/signals` (public preview: só score, tier, publisher, price)
  - `GET /api/market/signals/{id}` (paywalled, payload completo)
  - `POST /api/market/signals/{id}/outcome` (auditor only, fecha o journal)
- TTL + expiração automática em background task
**Acceptance criteria:**
- preview público nunca revela entry/stop/target
- sinal expirado devolve 410 Gone
- cada consumo aparece no journal com tx hash e timestamp
**Execution rules:**
- reusar guards existentes para rate limit
- preservar mensagens explícitas de paper/testnet na API response
<!-- TTM-015 END -->

<!-- TTM-016 START -->
**Backlog:** TTM-016
**Priority:** P1
**Phase:** Hackathon Phase 3 — Reputation & Audit
**Suggested squad:** backend + data + qa
**Objective:** Reputação e Auditor Agent verificando settlement onchain.
**Approved scope:**
- `agents/reputation.py` com score por (agent_id, regime, timeframe) baseado em PnL agregado e hit-rate do journal
- background worker que recalcula a cada 60s
- `arc/settlement.py` que verifica o tx na Arc testnet via RPC (`eth_getTransactionReceipt`) e compara com recibo local
- dedupe e anti-replay por `payment_intent_id`
**Acceptance criteria:**
- tentativa de replay com mesmo intent_id é rejeitada deterministicamente
- score de reputação é reprodutível dado o mesmo journal
- settlement timeout > 3s resulta em refund automático
<!-- TTM-016 END -->

<!-- TTM-017 START -->
**Backlog:** TTM-017
**Priority:** P2
**Phase:** Hackathon Phase 3 — Treasury
**Suggested squad:** backend + devops
**Objective:** Treasury Agent que mantém saldo operacional das wallets e expõe relatório.
**Approved scope:**
- rotina periódica (60s) que checa saldo de cada wallet e rebalanceia se < floor
- rota `GET /api/treasury/report` com saldo, receita acumulada e projeção
- alerta (log estruturado) quando floor é atingido 3x consecutivas
**Acceptance criteria:**
- floor e ceiling são configuráveis por env
- nenhum rebalance toca mainnet
<!-- TTM-017 END -->

<!-- TTM-018 START -->
**Backlog:** TTM-018
**Priority:** P1
**Phase:** Hackathon Phase 4 — UX
**Suggested squad:** frontend + product + qa
**Objective:** UI do marketplace (feed de sinais, painéis de agent, treasury).
**Approved scope:**
- `apps/web/marketplace.html` + `marketplace.js`: feed ao vivo, subscribe & pay, histórico
- `apps/web/agent-dashboard.html`: saldo USDC, receita, reputação por regime
- banner persistente "Arc testnet — paper signals only" em toda a UI
**Acceptance criteria:**
- UI continua funcional offline (fallback legível quando Circle sandbox cai)
- zero claim de "lucro garantido" em qualquer copy
<!-- TTM-018 END -->

<!-- TTM-019 START -->
**Backlog:** TTM-019
**Priority:** P0
**Phase:** Hackathon Phase 4 — Demo
**Suggested squad:** devops + qa + product
**Objective:** Cenário reprodutível de 5 min para vídeo e apresentação onsite.
**Approved scope:**
- `ops/demo/seed_agents.py` provisiona 7 wallets + saldo inicial
- `ops/demo/run_demo.sh` orquestra API + web + Nexus + loop de sinais
- ≥ 50 nanopagamentos em 5 min, zero erros, evidência em `ops/evidence/demo-run-*.json`
**Acceptance criteria:**
- demo rerun produz resultado equivalente (tolerância de preço de mercado)
- vídeo captura feed de sinais + pagamentos + dashboards atualizando
<!-- TTM-019 END -->

<!-- TTM-020 START -->
**Backlog:** TTM-020
**Priority:** P0
**Phase:** Hackathon Phase 5 — Submission
**Suggested squad:** product + devops
**Objective:** Preparar submissão lablab.ai, post no X, PR de release, tag.
**Approved scope:**
- gravar vídeo ≤ 3 min
- postar no X tagando @buildoncircle @arc @lablabai
- preencher formulário com textos da seção 7 deste doc
- redigir `docs/CIRCLE_FEEDBACK.md` (seção 8) — elegível a US$ 500
- abrir PR `feature/hackathon-arc-agent-market` → main e taggear `hackathon-arc-v1`
**Acceptance criteria:**
- link do X post colado no form
- screenshot do form enviado salvo em `ops/evidence/submission-*.png`
- PR mergeado antes do deadline de 25/abr
<!-- TTM-020 END -->

## 7. Rascunhos de resposta do formulário

### Submission Title (≤ 50 chars)
```
TTM Agent Market — Nanopayments on Arc
```
(37 chars)

### Short Description (50-255 chars)
Ver seção 2.

### Long Description (≥ 600 chars)
Ver seção 2 (≈ 900 chars).

### Participation Mode
`ONLINE` inicialmente; alterar para `ONSITE` se houver aprovação e viabilidade de viagem (travel não coberto).

### Categories / Tracks
Agent Economy, Nanopayments, DeFi Infrastructure, AI + Onchain.

### Technologies Used
Arc L1, Circle Nanopayments, Circle Dev-Controlled Wallets, USDC, FastAPI, Python 3.11, HTML/JS vanilla, Prometheus, structlog, Nexus agent orchestration.

### Did you use Circle products?
`Yes`.

### Circle Developer Console email
[preencher com email do owner da conta Circle]

### Submission Video Post (X/Twitter)
[colar o link após postar, com @buildoncircle @arc @lablabai tagados]

## 8. Circle Product Feedback (elegível a US$ 500 USDC)

Esboço inicial — finalizar em `docs/CIRCLE_FEEDBACK.md` no dia 5.

- **Products Used:** Arc L1 (settlement), USDC (unidade), Circle Nanopayments (metering per-call), Circle Dev-Controlled Wallets (identidade dos agentes).
- **Use Case:** marketplace agente-a-agente com cobrança sub-cent por chamada de API; sem gas overhead era requisito duro porque o ticket médio é ≤ 0,01 USDC.
- **Successes:** tempo de finalidade sub-segundo; dollar-denominated fee simplifica pricing; SDK dev-controlled removeu a curva de chave privada.
- **Challenges:** [preencher conforme aparecem — tipicamente: tooling local, docs fragmentadas, observabilidade de tx]
- **Recommendations:** [preencher — ex: webhook unificado de settlement, endpoint batch para quote+capture em um round-trip, simulador local de Arc pra CI]

## 9. Guardrail alignment

- `ALLOW_MAINNET_TRADING=false` permanece.
- `ENABLE_LIVE_TRADING=false` permanece.
- Nenhum agente pode submeter ordem a Binance mainnet.
- Arc é usado **apenas em testnet** durante o hackaton (variável `ARC_CHAIN_ID` deve
  apontar para testnet; adicionar check no startup).
- Sinais publicados continuam sendo **paper trading**; Consumer Agents executam
  paper trades, nunca ordens reais.
- Hooks do Nexus (`.nexus/hooks.js`) **não são alterados**.

## 10. Dispatch — como acionar o Nexus

Nexus está em `http://127.0.0.1:4116` com 14 salas e 50+ réplicas. O padrão
existente (TTM-001..010) é: issue criada no GitHub → Nexus puxa via `/api/tasks` e
distribui conforme `suggestedSquad`.

### Passo a passo (para o agente que vai executar o handoff)

1. Ler este documento na íntegra.
2. Criar 10 issues no GitHub a partir dos blocos TTM-011..TTM-020 da seção 6.
   Usar o template do repo (`.github/ISSUE_TEMPLATE/feature_request.md`).
3. Confirmar no Nexus UI que as issues apareceram em `/api/tasks` como `status=todo`.
4. Dispatch manual (se o auto-dispatch estiver off):
   - abrir a sala correspondente a `suggestedSquad` no Nexus UI
   - atribuir a task e marcar como `in_progress`
5. Monitorar `make api-test`, `make api-cov` e evidências em `ops/evidence/` ao final de cada milestone.
6. Ao fim de cada dia, rodar `make validation-evidence` e `make mirror-verify`.

### Comando resumido para outro agente (Claude Code, por exemplo)

```
Leia docs/HACKATHON_AGENTIC_ARC.md. Abra as 10 issues da seção 6 no GitHub via
`gh issue create` usando os blocos marcados `<!-- TTM-NNN START/END -->`.
Depois, para cada issue aberta, verifique se o Nexus (http://127.0.0.1:4116/api/tasks)
já a indexou e imprima um relatório final com id, status e branch sugerida.
Não execute código do produto nessa rodada — apenas filing e verificação.
```

## 11. O que este projeto **não** é

- Não é um robô que opera dinheiro real.
- Não é custódia — Circle mantém a custódia das wallets dev-controlled.
- Não é um oráculo de preço — preço de mercado vem da Binance testnet.
- Não é um fork do ToTheMoonTokens — é um *produto adjacente* que reusa módulos.
- Não substitui o escopo existente de pesquisa quantitativa; é uma monetização
  onchain do que já é produzido.
