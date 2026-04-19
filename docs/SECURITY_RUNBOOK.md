# Security Runbook

Este documento descreve procedimentos operacionais de seguranca para o
ToTheMoonTokens. Ele complementa o [TRADING_GUARDRAILS.md](TRADING_GUARDRAILS.md),
que documenta a logica de bloqueio em tempo de execucao.

## Principios

- **Mainnet e bloqueada por politica.** Nenhum procedimento abaixo desbloqueia
  mainnet. Qualquer tentativa deve ser tratada como incidente.
- **Privilegio minimo.** Tokens e chaves sao especificos por ambiente e
  rotacionaveis em minutos.
- **Tudo audit-loggable.** Eventos sensiveis (guardrail_blocked, live_arm_*)
  sao emitidos via structlog em JSON — preserve esses logs por 90 dias.

## Inventario de segredos

| Segredo                           | Onde vive                                | Rotacao |
|-----------------------------------|------------------------------------------|---------|
| `LIVE_TRADING_APPROVAL_TOKEN`     | `.env` local, vault CI, secret manager   | Trimestral ou ao suspeitar vazamento |
| `LIVE_TRADING_ACKNOWLEDGEMENT`    | `.env` local (valor fixo, nao sensivel)  | N/A — constante de protocolo |
| Binance testnet API key / secret  | `.env` local, vault CI                   | Mensal |
| GitHub PAT (CI mirror)            | GitLab CI variables                      | Trimestral |

## Procedimento: rotacao de `LIVE_TRADING_APPROVAL_TOKEN`

Use quando houver suspeita de vazamento, saida de membro com acesso, ou
auditoria trimestral agendada.

1. **Gere novo token** no secret manager do time (valor com >= 32 bytes de
   entropia, prefixo `ttm_approval_`).
2. **Atualize o `.env`** de cada desenvolvedor autorizado — substitua o valor
   antigo por completo, nao concatene.
3. **Reinicie a API** (`make api-run` ou `make docker-down && make docker-up`).
4. **Verifique via `/api/dashboard`** que `guardrails.reasons` nao lista
   `LIVE_TRADING_APPROVAL_TOKEN ausente`.
5. **Revogue o token antigo** no secret manager apenas depois de confirmar
   que o novo esta em uso.
6. **Registre** data, responsavel e motivo em
   `docs/INCIDENTS.md` (cria se nao existir).

## Procedimento: suspeita de vazamento de `.env`

1. **Nao comite.** Remova do stage: `git restore --staged .env`.
2. **Confirme** com `git log --all --diff-filter=A -- .env`. Se o arquivo
   aparecer, trate como vazamento real e pule para o proximo passo.
3. **Rotacione imediatamente** todos os segredos listados no inventario.
4. **Reescreva historia** com `git filter-repo --path .env --invert-paths` se
   o commit ainda nao foi publicado — caso contrario, considere o valor
   comprometido e mova para invalidacao.
5. **Abra incident report** com timeline.

## Procedimento: tentativa de desbloqueio de mainnet

`ALLOW_MAINNET_TRADING=true` combinado com as demais credenciais e uma
tentativa explicita de burlar a politica do projeto.

1. **Confirme** via logs (`runtime_mode=blocked_mainnet`) e metricas
   (`guardrail_evaluations_total{mode="blocked_mainnet"}`).
2. **Preserve** os logs em storage imutavel antes de qualquer mitigacao.
3. **Identifique** o autor via `git log` do `.env` ou via sessao SSH.
4. **Remova o acesso** do autor ao repositorio ate a investigacao concluir.
5. **Documente** em `docs/INCIDENTS.md` e comunique aos stakeholders.

## Procedimento: atualizacao de dependencia com CVE

1. `pip list --outdated` dentro de `services/api/.venv`.
2. Atualize a versao em `services/api/pyproject.toml` (mantendo os upper
   bounds de major).
3. `make api-install && make api-cov && make api-lint && make api-typecheck`.
4. Abra PR referenciando o CVE no titulo (ex.:
   `deps: bump fastapi to patch CVE-2026-xxxx`).

## Contatos

- Dono tecnico: Martin Lofrano (`martinlofranodeoliveira@...`)
- Secondary: _TBD_

## Checklist trimestral

- [ ] Rotacao de `LIVE_TRADING_APPROVAL_TOKEN`
- [ ] `detect-secrets scan --all-files` local (confirma que o baseline CI cobre tudo)
- [ ] Revisao do inventario de segredos
- [ ] Revisao de `docs/TRADING_GUARDRAILS.md` para regressoes
