# QA Validation Matrix

Este documento define a matriz de testes e critérios de regressão para as jornadas críticas do NexusOrchestrator. Ele mapeia Test IDs explícitos contra comportamentos verificáveis no código, garantindo que "implementado" seja "provado".

## Baseline Reproduzível

Para reproduzir a baseline localmente:
```bash
make api-test
```
Ou manualmente no ambiente isolado:
```bash
cd services/api
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[dev]'
.venv/bin/python -m pytest -q
```

## Critérios de Regressão

Qualquer modificação que afete o comportamento de ordens, aprovações, coleta de dados de mercado ou rate limits DEVE manter os Test IDs desta matriz passando. Uma regressão em qualquer cenário crítico (especialmente PERM e ERR) é um bloqueador automático para merge. A cobertura para casos de falha (borda/erro) possui a mesma prioridade que o fluxo feliz.

## Matriz de Validação

| Test ID | Jornada | Cenário | Cobertura Mínima (Critério de Aceite) |
|---|---|---|---|
| **QA-PERM-001** | Permissão | Paper Mode Blocks All | Garantir que o modo paper bloqueie todas as ordens (tanto mainnet quanto testnet), independente do pedido. |
| **QA-PERM-002** | Permissão | Mainnet Always Blocked | Validar que mesmo com full approval e modo testnet habilitado, a execução em mainnet é sempre bloqueada por default no framework de research. |
| **QA-PERM-003** | Permissão | Token/Typo Validation | Qualquer erro de digitação ou falta do `approval_token` deve bloquear execução em testnet e retornar 423 Locked. |
| **QA-PERM-004** | Permissão | High Risk is Research Only | Confirmar que tiers de alto risco nunca ativam ordens reais, sendo forçados para research-only independente das permissões. |
| **QA-PERM-005** | Permissão | Manual Signature Required | Para `wallet_mode=manual`, a operação não deve emitir assinatura automática e deve exigir confirmação via manual signature. |
| **QA-ERR-001** | Error | Rate Limiting Enforcement | Requisições exaustivas aos endpoints críticos (ex: `/api/live/arm`) devem retornar `429 Too Many Requests`. |
| **QA-ERR-002** | Error | Market Data API Fallbacks | Falhas de comunicação com a Exchange (API out, Timeout) devem ser capturadas, fazendo fallback para dados sintéticos ou levantando erro estruturado (`MarketDataError`). |
| **QA-ERR-003** | Error | Config Validation | Inputs inválidos de configuração (ex: size negativo, fee negativo, out of range, log levels inválidos) devem rejeitar a inicialização. |
| **QA-ERR-004** | Error | Live Arm sem Reconhecimento | Bloquear a ativação "live arm" se não for providenciado o termo de aceitação manual. |
| **QA-EMPTY-001** | Empty | Dashboard Inicial | Endpoint de dashboard sem histórico deve carregar sem erro com listas vazias e estatísticas zeradas. |
| **QA-EMPTY-002** | Empty | Diário sem Operações | Diário de trading sem nenhuma operação registrada deve responder vazio com estrutura correta e metadata presente. |
| **QA-HAPPY-001** | Happy | Market Data Klines | Dados de candles retornam uma lista correta de OHLCV em condições normais de API. |
| **QA-HAPPY-002** | Happy | Backtest Consistente | Backtest com os mesmos inputs retorna as mesmas métricas, e com as chaves corretas (equity final, edge_status). |
| **QA-HAPPY-003** | Happy | Walk Forward Split | Endpoint de validação (walk forward) retorna métricas divididas e estruturadas em splits In-Sample e Out-of-Sample. |
| **QA-HAPPY-004** | Happy | Health Probes | /health retorna informações de conexão de mercado e configuração do paper mode ativo. |
| **QA-HAPPY-005** | Happy | Scalp Setup Clean | Regras de scalp validadas aceitam configuração de baixo risco limpa corretamente. |
| **QA-HAPPY-006** | Happy | Redaction de Segredos | Qualquer token sensível nos payloads, logs ou metadata deve ser redigido. |

---
**Nota QA**: Os testes estão marcados com `@pytest.mark.test_id("ID")` na suíte do `pytest`. Use `pytest -m test_id` (com a flag adequada ou customizada) para rodar isoladamente.
