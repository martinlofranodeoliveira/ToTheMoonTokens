#!/usr/bin/env bash
# One-shot: create TTM-011..TTM-020 GitHub issues in the Nexus-compatible format.
# Idempotency: skips any TTM-NNN title that already exists.
set -euo pipefail

REPO="martinlofranodeoliveira/ToTheMoonTokens"
LABEL="status: backlog"

already_exists() {
  local prefix="$1"
  gh issue list -R "$REPO" --state all --search "$prefix in:title" \
    --json title --jq '.[].title' 2>/dev/null | grep -Fq "$prefix "
}

file_issue() {
  local id="$1" prio="$2" title="$3"
  local tag="TTM-${id}"
  if already_exists "$tag"; then
    echo "SKIP $tag (already exists)"
    return 0
  fi
  local body_file
  body_file="$(mktemp)"
  cat > "$body_file"
  echo "CREATE $tag [$prio] $title"
  gh issue create -R "$REPO" \
    --title "$tag [$prio] $title" \
    --label "$LABEL" \
    --body-file "$body_file"
  rm -f "$body_file"
}

# ---------- TTM-011 ----------
file_issue 011 P0 "Circle developer wallet bootstrap and USDC smoke transfer on Arc testnet" <<'EOF'
## Backlog ID
TTM-011

## Objective
Bootstrap da conta Circle Developer, criacao de 7 wallets dev-controlled na Arc testnet e smoke test de transferencia USDC sub-cent entre duas wallets para destravar o restante da esteira do hackaton Agentic Economy on Arc.

## Initial Nexus Status
backlog

## Priority
P0

## Phase
Hackathon Phase 1 - Foundations

## Suggested Squad
architecture + devops + backend

## Approved Scope
- criar entity secret e registrar em .env.hackathon fora do git
- provisionar wallet set e 7 wallets rotuladas (research_01, research_02, research_03, consumer_01, consumer_02, auditor, treasury)
- implementar services/api/src/tothemoon_api/payments/circle_client.py com create_wallet, get_balance, transfer_usdc
- criar scripts/smoke_circle_transfer.py que transfere 0.001 USDC entre duas wallets e imprime o hash do tx
- documentar onboarding em docs/HACKATHON_AGENTIC_ARC.md

## Acceptance Criteria
- o smoke test roda em menos de 3s e devolve um hash valido na Arc testnet
- nenhum segredo Circle aparece em logs, commits ou arquivos versionados
- circle_client.py tem testes com mock do SDK cobrindo sucesso, saldo insuficiente e erro de rede
- ARC_CHAIN_ID validado no startup bloqueia mainnet

## Dependencies
- none

## Known External Access Gaps
- credenciais Circle e fundos USDC de testnet precisam ser providos manualmente pelo owner da conta

## Explicitly Out of Scope For This Issue
- wallets user-controlled
- Paymaster
- CCTP
- mainnet Arc

## Agent Execution Rules
- Arc testnet only - nunca mainnet
- falhar explicitamente se CIRCLE_API_KEY nao estiver setado
- preservar hooks do Nexus sem alteracao
- seguir docs/HACKATHON_AGENTIC_ARC.md como fonte de verdade
EOF

# ---------- TTM-012 ----------
file_issue 012 P0 "AgentID, signed JWT identity and agent-to-wallet mapping" <<'EOF'
## Backlog ID
TTM-012

## Objective
Estabelecer identidade assinada dos agentes (AgentID com JWT HS256) e o mapping agent-to-wallet que todas as rotas paywalled do marketplace vao usar para autenticar chamadas de research, consumer, auditor e treasury.

## Initial Nexus Status
backlog

## Priority
P0

## Phase
Hackathon Phase 1 - Foundations

## Suggested Squad
architecture + backend

## Approved Scope
- modulo agents/identity.py com AgentID, assinatura HS256 e validacao de claims (role, wallet_id, exp)
- middleware FastAPI que injeta request.state.agent a partir do header X-Agent-Token
- rota POST /api/agents/register restrita a ambiente local para bootstrap
- testes cobrindo token valido, expirado, assinatura invalida e role incompativel

## Acceptance Criteria
- toda rota paywalled exige agente autenticado antes do metering
- auditor agent tem role separada de research e consumer
- AGENT_JWT_SIGNING_KEY vem de env var e nunca esta hardcoded
- cobertura de testes >= 85% no modulo identity

## Dependencies
- TTM-011 (wallets precisam existir para o mapping)

## Known External Access Gaps
- none

## Explicitly Out of Scope For This Issue
- SSO ou login humano
- criacao implicita de wallet (reusar as da TTM-011)

## Agent Execution Rules
- preferir claims minimos (role, agent_id, wallet_id)
- nunca logar o token completo, apenas o hash truncado para auditoria
- seguir docs/HACKATHON_AGENTIC_ARC.md
EOF

# ---------- TTM-013 ----------
file_issue 013 P1 "Add Arc MCP server to development workflow" <<'EOF'
## Backlog ID
TTM-013

## Objective
Incorporar o Arc MCP server ao fluxo de desenvolvimento e gerar evidencia versionada do smoke test para que qualquer agente novo tenha contexto Arc em minutos.

## Initial Nexus Status
backlog

## Priority
P1

## Phase
Hackathon Phase 1 - Foundations

## Suggested Squad
devops + architecture

## Approved Scope
- documentar em docs/CONTRIBUTING.md o comando claude mcp add --transport http arc-docs https://docs.arc.network/mcp
- atualizar .claude/settings.local.json se necessario para o repo
- rodar um smoke de consulta ao MCP ("what smart contract standards does Arc support") e salvar a resposta em ops/evidence/arc-mcp-check.json

## Acceptance Criteria
- onboarding de novo dev ou agente ate o primeiro contexto Arc leva menos de 5 minutos
- evidencia versionada sem segredos
- referencia cruzada no docs/HACKATHON_AGENTIC_ARC.md

## Dependencies
- none

## Known External Access Gaps
- conectividade HTTPS ate docs.arc.network

## Explicitly Out of Scope For This Issue
- integracao do MCP em agentes de producao
- documentacao de MCPs nao relacionados ao Arc

## Agent Execution Rules
- nao expor tokens em logs
- nao adicionar o MCP a qualquer agente em modo live
EOF

# ---------- TTM-014 ----------
file_issue 014 P0 "Per-call nanopayment metering middleware with quote hold capture" <<'EOF'
## Backlog ID
TTM-014

## Objective
Middleware FastAPI que cotiza, reserva, captura e registra recibo de cada chamada paywalled usando Circle Nanopayments com liquidacao em USDC na Arc testnet.

## Initial Nexus Status
backlog

## Priority
P0

## Phase
Hackathon Phase 2 - Metering

## Suggested Squad
backend + architecture + qa

## Approved Scope
- payments/metering.py com funcoes quote, hold, capture e refund
- integracao como middleware FastAPI que roda antes do handler e captura depois
- tabela de precos inicial em payments/pricing.yaml (base, premium, realtime)
- integracao com journal.py gravando payment_captured e payment_refunded
- metricas Prometheus: nanopayment_total, nanopayment_latency_ms, nanopayment_failures_total
- idempotencia por header X-Payment-Intent-ID

## Acceptance Criteria
- consumer sem saldo recebe 402 Payment Required com preview publico do sinal
- rota nao paywalled continua gratuita
- cobertura de testes >= 80% no modulo metering
- p95 do overhead do middleware < 150ms com Circle sandbox
- capture nunca ocorre antes da validacao do handler
- nenhum payload premium liberado antes do capture confirmado

## Dependencies
- TTM-011
- TTM-012

## Known External Access Gaps
- latencia da Circle sandbox pode variar, mas deve atender SLA em condicoes normais

## Explicitly Out of Scope For This Issue
- pricing dinamico por reputacao (vem na TTM-016)
- refunds agendados por disputa manual

## Agent Execution Rules
- preservar mensagens explicitas de paper e testnet na response
- nunca devolver payload premium se capture falhar
- reusar guards existentes para rate limit
EOF

# ---------- TTM-015 ----------
file_issue 015 P0 "Signal marketplace with publish discover and paywalled consume" <<'EOF'
## Backlog ID
TTM-015

## Objective
Marketplace de sinais quantitativos onde Research Agents publicam, qualquer agente descobre em preview publico e Consumer Agents consomem o payload completo mediante pagamento sub-cent.

## Initial Nexus Status
backlog

## Priority
P0

## Phase
Hackathon Phase 2 - Marketplace

## Suggested Squad
backend + product + qa

## Approved Scope
- modelo SignalEnvelope reusando BacktestRequest e ProbabilityChecklist, adicionando price_usdc, ttl_s, publisher_agent_id
- rota POST /api/market/signals/publish restrita a role research
- rota GET /api/market/signals com preview publico (score, tier, publisher, price, ttl)
- rota GET /api/market/signals/{id} paywalled via middleware da TTM-014
- rota POST /api/market/signals/{id}/outcome restrita a auditor
- expiracao automatica via background task
- integracao com journal.py gravando signal_published e signal_consumed

## Acceptance Criteria
- preview publico nunca revela entry, stop ou target
- sinal expirado devolve 410 Gone
- cada consumo gera entrada no journal com tx hash e timestamp
- testes cobrem fluxo feliz, preview, expirado e replay

## Dependencies
- TTM-012
- TTM-014

## Known External Access Gaps
- none

## Explicitly Out of Scope For This Issue
- oraculo de preco externo (usar market_data existente)
- modelos de sinal alem do ja suportado por backtesting.py

## Agent Execution Rules
- preservar mensagens explicitas de paper e testnet
- reusar guards de rate limit
- nao prometer lucro em nenhuma copy
EOF

# ---------- TTM-016 ----------
file_issue 016 P1 "Reputation scoring and onchain settlement verification" <<'EOF'
## Backlog ID
TTM-016

## Objective
Sistema de reputacao reprodutivel por agente, regime e timeframe, e verificacao onchain do settlement antes de liberar qualquer payload premium (anti-replay e anti-double-spend).

## Initial Nexus Status
backlog

## Priority
P1

## Phase
Hackathon Phase 3 - Reputation and Audit

## Suggested Squad
backend + data + qa

## Approved Scope
- agents/reputation.py com score score(agent_id, regime, timeframe) derivado de PnL agregado e hit-rate do journal
- worker de background que recalcula a cada 60s e expoe GET /api/agents/{id}/reputation
- arc/settlement.py que verifica tx na Arc testnet via eth_getTransactionReceipt
- dedupe e anti-replay por payment_intent_id
- timeout de settlement > 3s dispara refund automatico via TTM-014

## Acceptance Criteria
- replay com mesmo intent_id e rejeitado deterministicamente
- score de reputacao e reprodutivel dado o mesmo journal
- refund por timeout tem evidencia no journal
- cobertura >= 80% nos modulos novos

## Dependencies
- TTM-014
- TTM-015

## Known External Access Gaps
- RPC da Arc testnet precisa estar reachable, fallback deve falhar explicito

## Explicitly Out of Scope For This Issue
- modelos de reputacao baseados em ML
- dispute resolution humana

## Agent Execution Rules
- nunca reverter saldo sem evidencia onchain
- logar motivo de cada refund em structlog
EOF

# ---------- TTM-017 ----------
file_issue 017 P2 "Treasury agent for wallet rebalance and reporting" <<'EOF'
## Backlog ID
TTM-017

## Objective
Treasury Agent que monitora saldo das 7 wallets, rebalanceia quando abaixo do floor operacional e expoe relatorio consolidado de fluxo USDC.

## Initial Nexus Status
backlog

## Priority
P2

## Phase
Hackathon Phase 3 - Treasury

## Suggested Squad
backend + devops

## Approved Scope
- rotina periodica de 60s que checa saldo de cada wallet e rebalanceia se < floor
- rota GET /api/treasury/report com saldo por wallet, receita acumulada e projecao 24h
- alerta via log estruturado quando floor e atingido 3x consecutivas
- floor e ceiling configuraveis via env TREASURY_FLOOR_USDC e TREASURY_CEILING_USDC

## Acceptance Criteria
- rebalance so ocorre em Arc testnet
- report responde em < 500ms com dados cacheados
- alerta e emitido em structlog com severity warn

## Dependencies
- TTM-011
- TTM-014

## Known External Access Gaps
- none

## Explicitly Out of Scope For This Issue
- rebalance cross-chain
- conversao para outros ativos

## Agent Execution Rules
- nunca tocar mainnet
- respeitar rate limits globais
EOF

# ---------- TTM-018 ----------
file_issue 018 P1 "Marketplace UI live signal feed agent dashboards treasury panel" <<'EOF'
## Backlog ID
TTM-018

## Objective
UI do marketplace em apps/web para demo live: feed de sinais em tempo real, painel por agente com saldo e reputacao, painel de treasury e mensagens persistentes de testnet e paper.

## Initial Nexus Status
backlog

## Priority
P1

## Phase
Hackathon Phase 4 - UX

## Suggested Squad
frontend + product + qa

## Approved Scope
- apps/web/marketplace.html e marketplace.js com feed live de sinais, botao subscribe and pay, historico de compras
- apps/web/agent-dashboard.html com saldo USDC, receita e reputacao por regime
- banner persistente "Arc testnet - paper signals only" em toda a UI
- fallback legivel quando API ou Circle sandbox caem

## Acceptance Criteria
- UI continua funcional com API offline mostrando mensagem clara
- zero copy prometendo lucro ou live trading
- smoke test de click em subscribe and pay leva a 402 quando sem saldo

## Dependencies
- TTM-014
- TTM-015

## Known External Access Gaps
- none

## Explicitly Out of Scope For This Issue
- branding final
- i18n alem de pt-BR e en

## Agent Execution Rules
- preservar mensagens explicitas de paper e testnet
- nao sugerir prontidao para live trading
EOF

# ---------- TTM-019 ----------
file_issue 019 P0 "Reproducible 5 minute demo scenario for video and onsite pitch" <<'EOF'
## Backlog ID
TTM-019

## Objective
Cenario reprodutivel de 5 minutos que sobe toda a stack do hackaton, gera >= 50 nanopagamentos, popula dashboards e emite evidencia auditavel para o video e para a apresentacao onsite.

## Initial Nexus Status
backlog

## Priority
P0

## Phase
Hackathon Phase 4 - Demo

## Suggested Squad
devops + qa + product

## Approved Scope
- ops/demo/seed_agents.py provisiona 7 wallets e saldo inicial via TTM-011
- ops/demo/run_demo.sh orquestra API, web e Nexus e inicia loop de sinais
- loop: 1 research publica 1 sinal a cada 10s, 2 consumers competem pelo melhor score, treasury e reputacao atualizam
- stress mini de 100 transacoes em 60s para mostrar sub-cent viability
- evidencia em ops/evidence/demo-run-<timestamp>.json

## Acceptance Criteria
- rerun produz resultado equivalente (tolerancia de preco de mercado)
- >= 50 nanopagamentos no log de 5 min
- zero erros 5xx na API durante o cenario
- vidio captura feed de sinais + dashboards atualizando

## Dependencies
- TTM-014
- TTM-015
- TTM-016
- TTM-018

## Known External Access Gaps
- requer Circle sandbox estavel e RPC Arc testnet disponivel

## Explicitly Out of Scope For This Issue
- stress de producao
- chaos engineering

## Agent Execution Rules
- nunca rodar contra mainnet
- capturar logs mascarados para incluir no vidio
EOF

# ---------- TTM-020 ----------
file_issue 020 P0 "Hackathon submission video X post form release PR and tag" <<'EOF'
## Backlog ID
TTM-020

## Objective
Preparar e executar a submissao completa no lablab.ai: video, post no X tagando @buildoncircle @arc @lablabai, preenchimento do formulario, feedback detalhado para o premio de US 500 USDC e PR de release com tag.

## Initial Nexus Status
backlog

## Priority
P0

## Phase
Hackathon Phase 5 - Submission

## Suggested Squad
product + devops

## Approved Scope
- gravar video de 2 a 3 min com pitch, demo e arquitetura
- postar video no X tagando @buildoncircle @arc @lablabai e coletar link
- preencher formulario lablab.ai com textos da secao 7 do docs/HACKATHON_AGENTIC_ARC.md
- finalizar docs/CIRCLE_FEEDBACK.md com dados reais observados durante o build
- abrir PR feature/hackathon-arc-agent-market -> main
- taggear release hackathon-arc-v1 apos merge

## Acceptance Criteria
- link do X post colado no formulario
- screenshot do formulario enviado salvo em ops/evidence/submission-<timestamp>.png
- PR mergeado antes do deadline de 25 de abril
- tag hackathon-arc-v1 publicada

## Dependencies
- TTM-019

## Known External Access Gaps
- acesso a conta X do time
- acesso a conta lablab.ai

## Explicitly Out of Scope For This Issue
- campanhas de marketing pos-hackaton

## Agent Execution Rules
- nao prometer lucro ou live trading em nenhum material
- respeitar guardrails do Nexus em toda a copy
EOF

echo ""
echo "=========================================="
echo "Issue filing complete."
echo "=========================================="
gh issue list -R "$REPO" --state open --label "status: backlog" \
  --search "TTM-01 in:title OR TTM-02 in:title" \
  --json number,title --jq '.[] | "\(.number)  \(.title)"' | sort
