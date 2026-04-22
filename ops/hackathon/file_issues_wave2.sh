#!/usr/bin/env bash
# Wave 2: parent epic, branch-slug fix, security, e2e, pitch deck, guardrail regression.
# Idempotent: skips any TTM-NNN title that already exists.
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

# ---------- TTM-021 ----------
file_issue 021 P1 "Parent epic tracking TTM-011 to TTM-020 hackathon delivery milestones" <<'EOF'
## Backlog ID
TTM-021

## Objective
Epic coordenadora que rastreia as 10 sub-tasks do hackaton Agentic Economy on Arc (TTM-011 a TTM-020), garante respeito as dependencias entre elas e reporta progresso diario ate o deadline 25 de abril de 2026.

## Initial Nexus Status
backlog

## Priority
P1

## Phase
Hackathon Phase 0 - Coordination

## Suggested Squad
pm + sm + architecture

## Approved Scope
- manter o board do hackaton atualizado com status diario das sub-tasks
- aplicar o calendario da secao 5 do docs/HACKATHON_AGENTIC_ARC.md como baseline
- bloquear avanco de fases quando dependencias nao estao done (ex: TTM-014 depende de TTM-011 e TTM-012)
- postar snapshot diario em ops/evidence/hackathon-daily-<data>.json com contagem por status

## Acceptance Criteria
- existe um snapshot por dia de 20 a 25 de abril em ops/evidence/
- nenhum TTM-01x ou TTM-020 fica bloqueado por mais de 8 horas sem investigacao registrada
- a submissao TTM-020 consegue fechar no prazo

## Dependencies
- none

## Known External Access Gaps
- none

## Explicitly Out of Scope For This Issue
- implementacao das sub-tasks
- branding ou marketing

## Agent Execution Rules
- nunca mexer no escopo de uma sub-task sem aprovacao do owner dela
- usar o canal de tasks do Nexus como fonte de verdade
EOF

# ---------- TTM-022 ----------
file_issue 022 P0 "Fix corrupted branch slugs on Nexus tasks TTM-011 to TTM-020" <<'EOF'
## Backlog ID
TTM-022

## Objective
Corrigir os slugs de branch que o Nexus gerou para 8 das 10 tasks do hackaton (aparecem como gtmny-0NN em vez de ttm-0NN) e garantir que os agentes comecem a trabalhar na branch correta antes do primeiro commit.

## Initial Nexus Status
backlog

## Priority
P0

## Phase
Hackathon Phase 0 - Coordination

## Suggested Squad
devops + architecture

## Approved Scope
- auditar Nexus API (/api/tasks) e identificar por que as branches ficaram com prefixo gtmny-0NN vinculado aos PRs gh-23 a gh-32
- renomear ou recriar as branches no padrao nexus/tasks/gh-<num>/ttm-<id>-<slug-do-titulo> antes do primeiro commit
- validar que o hook beforeToolCall nao esta afetado
- documentar o incidente em ops/evidence/nexus-branch-slug-incident.md

## Acceptance Criteria
- todas as 10 tasks TTM-011..020 tem branch coerente com o titulo
- nenhum commit aconteceu na branch errada
- doc de incidente registra causa provavel e mitigacao

## Dependencies
- none (bloqueia TTM-011 a TTM-020 ate ser tratado)

## Known External Access Gaps
- none

## Explicitly Out of Scope For This Issue
- refactor do gerador de slugs do Nexus fora do hackaton
- mudar o formato global de branch

## Agent Execution Rules
- nao deletar branches que ja tenham commits sem consultar o owner
- registrar qualquer comando de rename em ops/evidence
EOF

# ---------- TTM-023 ----------
file_issue 023 P0 "Pre-submission security review of wallet JWT payment and marketplace modules" <<'EOF'
## Backlog ID
TTM-023

## Objective
Revisao de seguranca antes da submissao final do hackaton, cobrindo handling de segredos Circle, escopo do JWT dos agentes, anti-replay do Nanopayments, bypass de rate limit e exfiltracao de payload premium.

## Initial Nexus Status
backlog

## Priority
P0

## Phase
Hackathon Phase 5 - Submission

## Suggested Squad
architecture + qa + security

## Approved Scope
- varredura estatica dos diffs das TTM-011, TTM-012, TTM-014, TTM-015, TTM-016 em busca de segredos, chaves ou prints sensiveis
- revisao manual de claims do JWT, expiracao e rotacao
- teste de replay do payment intent com 3 vetores (mesmo intent, intent de outro agente, intent expirado)
- teste de rate limit tentando estourar 5 rotas em paralelo
- tentativa de consumir payload premium antes do capture confirmado
- relatorio em ops/evidence/security-review-<data>.md com severidade e recomendacao por item

## Acceptance Criteria
- zero achados criticos ou altos antes do merge da release
- achados medios tem plano de mitigacao com owner e data
- report assinado por pelo menos dois agentes (um QA e um security ou architect)

## Dependencies
- TTM-014
- TTM-015
- TTM-016

## Known External Access Gaps
- none

## Explicitly Out of Scope For This Issue
- pen test externo
- auditoria formal de smart contracts

## Agent Execution Rules
- nunca logar segredos em claro durante a revisao
- reproduzir cenarios de ataque apenas em ambiente testnet
- respeitar todos os guardrails existentes
EOF

# ---------- TTM-024 ----------
file_issue 024 P0 "End-to-end integration test of the full nanopayment marketplace flow" <<'EOF'
## Backlog ID
TTM-024

## Objective
Suite pytest que exercita o fluxo completo: Research Agent publica sinal, Consumer Agent paga, Circle liquida na Arc testnet, Auditor valida settlement, payload entregue, journal atualizado e reputacao recalculada. Serve tanto de regressao quanto de referencia para a demo.

## Initial Nexus Status
backlog

## Priority
P0

## Phase
Hackathon Phase 4 - Demo

## Suggested Squad
qa + backend + architecture

## Approved Scope
- fixtures determinsticas para 7 agentes (research_01..03, consumer_01..02, auditor, treasury)
- cenarios:
  * happy path: publish -> pay -> settle -> deliver -> journal -> reputation
  * consumer sem saldo recebe 402
  * payload nunca liberado antes do capture confirmado
  * replay do mesmo intent_id rejeitado
  * settlement timeout aciona refund
- integracao com sandbox da Circle usando mock quando offline
- ops/evidence/e2e-<timestamp>.log gerado a cada run

## Acceptance Criteria
- suite roda em < 60s e passa 100% em modo mock
- suite roda em < 300s contra sandbox real
- cobertura do fluxo cross-module >= 70%
- falha qualquer etapa deixa trilha clara de onde quebrou

## Dependencies
- TTM-014
- TTM-015
- TTM-016
- TTM-017

## Known External Access Gaps
- sandbox Circle pode ficar indisponivel; deve haver modo mock local

## Explicitly Out of Scope For This Issue
- testes de carga (ficam na TTM-019)
- fuzzing

## Agent Execution Rules
- nunca tocar mainnet
- fixtures reprodutiveis com seed
- falhar explicito se sandbox cair em modo real
EOF

# ---------- TTM-025 ----------
file_issue 025 P1 "Pitch deck slides live demo script and Q and A prep for SF onsite" <<'EOF'
## Backlog ID
TTM-025

## Objective
Produzir o material de apresentacao para o onsite em SF (25 e 26 de abril): deck de 6 a 8 slides, roteiro da demo live de 3 minutos, e cheat sheet de Q and A cobrindo perguntas provaveis sobre Arc, Circle Nanopayments, reputacao e guardrails.

## Initial Nexus Status
backlog

## Priority
P1

## Phase
Hackathon Phase 5 - Submission

## Suggested Squad
product + pm + architecture

## Approved Scope
- deck em docs/hackathon/pitch-deck.pptx (ou equivalente exportavel)
- slides: problema, insight, arquitetura, demo, why Arc + Circle, metricas, roadmap, time
- roteiro sincronizado com run_demo.sh (TTM-019) de 3 min
- Q and A cobrindo pelo menos 10 perguntas: mainnet readiness, modelo economico, seguranca, escalabilidade, reputacao, dispute resolution, cold-start, competidores, price floor, legal
- ensaio gravado em ops/evidence/pitch-rehearsal-<data>.mp4 (ou link externo)

## Acceptance Criteria
- deck revisado por pelo menos dois agentes
- roteiro de demo cabe em 3 min com folga
- Q and A sheet tem resposta objetiva para todas as 10 perguntas

## Dependencies
- TTM-019

## Known External Access Gaps
- conta e ferramenta para deck (google slides, keynote, ppt)

## Explicitly Out of Scope For This Issue
- producao de video para X (fica na TTM-020)
- material pos-evento

## Agent Execution Rules
- nunca prometer lucro
- destacar paper mode e Arc testnet em toda comunicacao
EOF

# ---------- TTM-026 ----------
file_issue 026 P0 "Guardrail regression suite ensuring Nexus hooks still block after hackathon modules land" <<'EOF'
## Backlog ID
TTM-026

## Objective
Suite de regressao que garante que os hooks do Nexus (.nexus/hooks.js) continuam bloqueando mainnet trading, manipulacao de segredos, ativacao de live trading e qualquer bypass mesmo depois que os modulos novos do hackaton (payments, marketplace, agents, arc) forem integrados.

## Initial Nexus Status
backlog

## Priority
P0

## Phase
Hackathon Phase 3 - Reputation and Audit

## Suggested Squad
qa + security + devops

## Approved Scope
- testes que simulam prompts tentando:
  * setar ALLOW_MAINNET_TRADING=true
  * setar ENABLE_LIVE_TRADING=true
  * expor seed phrase, mnemonic ou private key em logs
  * emitir ordens Binance em mainnet
  * fazer transferencias USDC fora da Arc testnet
- validar que cada tentativa retorna blocked=true com motivo auditavel
- capturar evidencia em ops/evidence/guardrail-regression-<data>.json

## Acceptance Criteria
- 100% dos vetores sao bloqueados
- falha de qualquer vetor trava o merge da release
- cobertura dos novos modulos >= 80% nos caminhos sensiveis

## Dependencies
- TTM-011
- TTM-014
- TTM-015

## Known External Access Gaps
- none

## Explicitly Out of Scope For This Issue
- refactor dos hooks (so regressao, nao alteracao)
- expansao para novos vetores alem dos listados

## Agent Execution Rules
- nao afrouxar guardrails sob nenhum argumento
- preferir falso negativo de autonomia a falso positivo de seguranca
EOF

echo ""
echo "=========================================="
echo "Wave 2 filing complete."
echo "=========================================="
