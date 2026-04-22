# Contributing

Obrigado pelo interesse em contribuir com o ToTheMoonTokens. O repositório
agora prioriza o vertical de hackathon para **artefatos pagos**, com foco em
request, pagamento, settlement, review e delivery. A engine legada de
research permanece apenas como suporte de evidencia e contexto de mercado.

## Regras invariantes

1. **Mainnet e execucao real continuam bloqueadas.** Nenhum PR deve afrouxar
   a logica de guardrail em
   `services/api/src/tothemoon_api/guards.py` ou a validacao em
   `services/api/src/tothemoon_api/config.py`.
2. **Segredos ficam fora do repo.** `.env` esta no `.gitignore`. Use
   `.env.example` como referencia e o secret manager do time para valores
   reais. Ver [SECURITY_RUNBOOK.md](SECURITY_RUNBOOK.md).
3. **O caminho principal e economico, nao trading.** Toda mudanca deve
   proteger ou melhorar o fluxo `request -> payment -> settlement -> review -> delivery`.
4. **Wallets sao sempre manuais e auditaveis.** Nada de auto-signing,
   seed phrases ou fluxos custodiais escondidos.
5. **Engine legada so por compatibilidade.** Se voce tocar
   `backtesting.py`, `journal.py`, `news.py`, `scalp.py` ou `strategies.py`,
   explique claramente qual evidencia ou artefato do hackathon depende disso.

## Setup local

```bash
git clone git@github.com:martinlofranodeoliveira/ToTheMoonTokens.git
cd ToTheMoonTokens

cp .env.example .env

make api-install
make api-test
make api-run    # http://127.0.0.1:8010
make web-serve  # http://127.0.0.1:4173
make pitch-serve
```

Se preferir containers:

```bash
make docker-build
make docker-up
make docker-down
```

### Pre-commit hooks

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

Os hooks rodam `ruff`, `detect-secrets`, verificam YAML/TOML, bloqueiam merge
conflicts, chaves privadas, arquivos grandes e commits contendo `.env`.

### MCP do Arc

Para agentes e desenvolvedores terem contexto imediato da documentacao do Arc:

```bash
claude mcp add --transport http arc-docs https://docs.arc.network/mcp
```

Use como fonte principal os documentos atuais em `docs/hackathon/` e
`docs/ARCHITECTURE.md`. `docs/HACKATHON_AGENTIC_ARC.md` foi mantido apenas como
arquivo historico de exploracao inicial.

## Ciclo de contribuicao

1. **Abra uma issue** descrevendo o problema, o fluxo afetado e o resultado
   esperado. Prefira `ARC-HACK-*` ou issue GitHub atual em vez do backlog
   antigo `TTM-*`.
2. **Crie a branch** a partir de `main`.
3. **Implemente com testes** cobrindo o caminho principal e os casos sensiveis.
4. **Rode checks locais**:
   ```bash
   make api-cov
   make api-lint
   make api-format
   make api-typecheck
   ```
5. **Commit** com mensagem objetiva (`feat:`, `fix:`, `chore:`, `docs:`).
6. **Abra o PR** descrevendo:
   - o fluxo do hackathon afetado
   - a validacao executada
   - qualquer impacto na engine legada de evidencia

## Tocando a engine legada de evidencia

Esses modulos ainda existem para alimentar contexto, journal e provas de
estado. Eles nao devem voltar a ditar o posicionamento do produto.

- preserve contratos de `/api/dashboard` e `/api/journal/*`
- mantenha entradas deterministicas e trilha auditavel
- adicione regressao automatizada quando alterar score, snapshots ou agregados
- nao use esses modulos para reabrir narrativa de live trading, strategy lab ou signal marketplace

## Observabilidade em mudancas

- Toda rota nova em `main.py` deve continuar observavel via middlewares
  existentes.
- Eventos sensiveis devem emitir log via `observability.get_logger(__name__)`
  com campos estruturados.
- Metricas custom vao em
  [services/api/src/tothemoon_api/observability.py](../services/api/src/tothemoon_api/observability.py).

## Codigo de conduta

Seja direto, educado e baseado em evidencia. Decisoes de produto e escopo se
resolvem com comportamento validado, nao com hype.
