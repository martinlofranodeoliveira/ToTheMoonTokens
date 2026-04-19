# Contributing

Obrigado pelo interesse em contribuir com o ToTheMoonTokens. Este projeto
prioriza **seguranca de capital** e **reprodutibilidade de research**; as
regras abaixo refletem isso.

## Regras invariantes

1. **Mainnet nunca e liberada.** Nenhum PR deve tocar a logica de guardrail
   de mainnet em `services/api/src/tothemoon_api/guards.py` sem discussao
   previa com os mantenedores.
2. **Segredos fora do repo.** `.env` esta no `.gitignore`. Use
   `.env.example` como referencia e o secret manager do time para valores
   reais. Ver [SECURITY_RUNBOOK.md](SECURITY_RUNBOOK.md).
3. **Paper por padrao.** Qualquer nova estrategia ou conector precisa rodar
   em paper mode por no minimo duas janelas de backtest antes de ser
   considerado para testnet guarded mode.

## Setup local

```bash
# Clonar e entrar no repo
git clone git@github.com:martinlofranodeoliveira/ToTheMoonTokens.git
cd ToTheMoonTokens

# Copiar template de env (nao commitar o .env gerado!)
cp .env.example .env

# Instalar API
make api-install

# Rodar testes
make api-test

# Rodar API local
make api-run   # http://127.0.0.1:8010/health

# Servir dashboard web
make web-serve # http://127.0.0.1:4173
```

Se preferir containers:

```bash
make docker-build
make docker-up    # API em :8010, web em :4173
make docker-down
```

### Pre-commit hooks (opcional, mas recomendado)

```bash
pip install pre-commit
pre-commit install                 # instala o hook no .git/hooks
pre-commit run --all-files         # primeira execucao varre o repo inteiro
```

Os hooks rodam `ruff` (lint + format), `detect-secrets`, verificam YAML/TOML,
bloqueiam merge conflicts, chaves privadas, arquivos enormes (> 512 KB) e um
hook local que recusa commit de `.env`.

## Ciclo de contribuicao

1. **Abrir issue** descrevendo o problema, hipotese ou estrategia proposta.
   Referencie ticket TTM-xxx quando aplicavel.
2. **Branch** a partir de `main`: `git checkout -b feat/ttm-xxx-descricao`.
3. **Implementar** com testes novos cobrindo a mudanca.
4. **Rodar checks locais**:
   ```bash
   make api-cov        # testes com cobertura (alvo >= 70%)
   make api-lint       # ruff check
   make api-format     # ruff format
   make api-typecheck  # mypy no pacote tothemoon_api
   ```
5. **Commit** com mensagem seguindo o padrao existente
   (`feat:`, `fix:`, `chore:`, `docs:`).
6. **PR** descrevendo o que mudou, por que, e resultado de backtest (se
   aplicavel). Inclua metricas (`ending_equity`, `max_drawdown_pct`,
   `edge_status`) como evidencia.

## Adicionando uma nova estrategia

As estrategias vivem em
[services/api/src/tothemoon_api/strategies.py](../services/api/src/tothemoon_api/strategies.py).
Para registrar uma nova:

1. Acrescente o `StrategyId` em
   [models.py](../services/api/src/tothemoon_api/models.py)
   (`Literal["ema_crossover", "breakout", "mean_reversion", "<nova>"]`).
2. Adicione o `StrategyDescriptor` na lista `STRATEGIES` em
   `strategies.py`.
3. Estenda `build_signals()` com o bloco da sua estrategia retornando
   `"buy"`, `"sell"` ou `"hold"` por candle.
4. Adicione casos em `tests/test_backtesting.py` (o parametrizado
   `test_each_strategy_returns_valid_metrics` cobre automaticamente, mas
   acrescente asserts especificos ao comportamento esperado).
5. Execute `make api-cov` e anexe o resultado no PR.

## Observabilidade em mudancas

- Toda rota nova em `main.py` deve ser coberta pelo `PrometheusMiddleware`
  (automatico).
- Eventos sensiveis (decisoes de guardrail, falhas de integracao) devem
  emitir log via `observability.get_logger(__name__)` com campos
  estruturados (nao use `f-strings` no event name).
- Metricas custom vao em
  [services/api/src/tothemoon_api/observability.py](../services/api/src/tothemoon_api/observability.py).

## Codigo de conduta

Seja direto, educado e baseado em dados. Decisoes de trading sao discutidas
com backtest e grafico, nao com opiniao.
