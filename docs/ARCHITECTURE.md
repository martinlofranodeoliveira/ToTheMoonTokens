# Architecture

## Objetivo

Montar uma esteira de pesquisa e validacao para estrategias quantitativas antes de qualquer execucao real.

## Camadas

### API

- expõe health, estrategias, dashboard e backtests
- mede retorno, drawdown, win rate e profit factor
- centraliza guardrails de risco
- prepara conectores para Binance testnet e carteira manual

### Web

- acompanha metricas e status do runtime
- mostra estrategias e conectores
- deixa claro quando o sistema esta travado em paper mode

### Nexus

- usa hooks de projeto para bloquear comandos de live trading/mainnet
- usa skill local para manter os agentes no escopo de pesquisa
- pode operar o backlog e validar com OpenCode antes de promover diffs

## Fases recomendadas

1. backtesting com dados sinteticos e datasets historicos
2. paper trading em tempo quase real
3. Binance testnet com ordem pequena e aprovacao manual
4. somente depois discutir qualquer modo live real

