# ToTheMoonTokens

ToTheMoonTokens agora existe como vertical segura do hackathon para o Nexus Orchestrator. O objetivo nao e operar um bot de trading. O objetivo e empacotar artefatos pagos com journal, metricas, contexto de mercado e guardrails claros para uma demo economica auditavel.

## Escopo atual

- marketplace de artefatos e entregas do hackathon
- fluxo pago de request -> settlement -> review -> delivery
- journal estruturado para evidencia auditavel
- reputacao, status de job e verificação de settlement
- contexto de mercado como insumo do vertical, nao como produto-fim
- bloqueio permanente de envio de ordens

## O que saiu de foco

- qualquer narrativa de bot de trading
- fluxos de `live arm` e ativacao manual
- paper runtime continuo como produto principal
- qualquer narrativa de prontidao para execucao

## Estrutura

- `services/api`: API FastAPI com pagamentos, settlement, jobs, demo flow, reputacao e artefatos do vertical
- `apps/web`: sala visual do hackathon para ler request, review, delivery e evidencia
- `.nexus`: perfil local e skill do projeto para manter o foco do Nexus
- `docs/hackathon`: narrativa, plano e material de submissao
- `ops/arc_circle_hackathon_backlog.json`: backlog ativo do hackathon

Os modulos legados de research ainda existem como engine interna para gerar evidencia e enriquecer o vertical, mas nao definem mais o pitch do produto.

## API principal

- `GET /api/payments/catalog`, `POST /api/payments/intent`, `POST /api/payments/verify`, `POST /api/payments/execute`: cobrança, verificação e unlock de artefatos
- `GET /api/jobs`, `POST /api/jobs`, `POST /api/jobs/{id}/unlock_payment`, `.../reserve_work`, `.../request_review`, `.../deliver`: ciclo do job no Nexus
- `POST /api/demo/jobs/request`, `.../pay`, `.../execute`, `.../review`, `.../deliver`: fluxo demo de request -> delivery
- `POST /api/settlements/verify`: gate de settlement com proteção contra replay e timeout
- `GET /api/agents/{id}/reputation`: reputação reprodutível do agente
- `GET /api/dashboard`: snapshot único do vertical com guardrails, conectores, journal e performance
- `POST /api/journal/trades`, `GET /api/journal/trades`, `GET /api/journal/performance`: journal estruturado e agregados
- `GET /api/market/health`, `GET /api/market/ticker`, `GET /api/market/depth`: leitura de mercado usada como contexto do vertical

## Quickstart

1. Copie `.env.example` para `.env`.
2. Rode `make api-install`.
3. Rode `make api-test`.
4. Rode `make api-run`.
5. Em outro terminal, rode `make web-serve`.
6. Em outro terminal, rode `make pitch-serve`.
7. Abra `http://127.0.0.1:4173` (web funcional) e `http://127.0.0.1:4174` (pitch).

Ou use containers:

```bash
make docker-build && make docker-up
# API:  http://127.0.0.1:8010
# Web:  http://127.0.0.1:4173
# Pitch: http://127.0.0.1:4174
make docker-down
```

## Qualidade e operacao

- `make api-cov`: testes com cobertura
- `make api-lint` / `make api-format`: `ruff`
- `make api-typecheck`: `mypy`
- `make mirror-verify`: compara branches esperadas entre GitHub e GitLab
- `make validation-evidence`: coleta evidencias locais do runtime do projeto e do review gate
- metricas Prometheus em `GET /metrics`
- logs estruturados em JSON via `structlog`

## Nexus local

- rode `make nexus-start` para subir uma instancia isolada do Nexus em `http://127.0.0.1:4116`
- o profile versionado em `.nexus/nexus-launch.env` aponta o Nexus para este repo, para o mirror GitLab e para o backlog ativo do hackathon no GitHub
- o foco operacional deve ficar no backlog `ARC-HACK-*` e nas tasks de entrega do MVP
- `NEXUS_AUTO_DISPATCH=true` continua ativo, mas os guardrails mantem o projeto fora de qualquer fluxo de execucao
- use `make nexus-status` para validar `instance_id=tothemoontokens-local` e `make nexus-stop` para parar a instancia

## Regra principal

Se uma mudanca empurra o repo de volta para um "bot de trading", ela esta fora do escopo atual. O vertical do hackathon precisa provar request, pagamento, settlement, review e entrega de artefato, nao autonomia de mercado.
