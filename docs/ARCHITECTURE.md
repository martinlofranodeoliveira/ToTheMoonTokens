# Architecture

## Objetivo

Montar uma esteira de request, pagamento, settlement, review e entrega para o hackathon Agentic Economy on Arc.

## Camadas

### API

- expõe catálogo pago, intents, settlement, jobs, demo flow e reputação
- centraliza guardrails e auditoria do vertical
- mantém conectores e journal como fonte de evidência do demo
- separa o produto hackathon da engine legada de research

### Web

- acompanha request, review, delivery e evidência
- mostra guardrails, jobs Arc e heartbeat de conectores
- deixa claro que o foco é o vertical do hackathon, não automação de trading

### Nexus

- usa hooks de projeto para bloquear comandos fora do escopo seguro
- usa skill local para manter os agentes no escopo do hackathon
- pode operar o backlog e validar com OpenCode antes de promover diffs

## Fluxo principal

1. buyer escolhe um artefato
2. API cria um payment intent
3. settlement é verificado
4. Nexus desbloqueia e roteia o job
5. review valida a saída
6. entrega só libera após pagamento e review

## Nota de escopo

Backtesting, sinais, contexto de mercado e journal continuam no repositório como motor de geração de evidência. Eles não são mais a mensagem principal do produto.
