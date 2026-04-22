# Final Handoff

Este documento junta o que voce precisa para gravar o video e submeter sem
reabrir o repositório para descobrir caminhos.

## Estado final

- o runtime do jurado **nao precisa de Nexus**
- o caminho principal e `request -> payment -> settlement -> review -> delivery`
- a prova onchain atual e:
  - tx hash: `0x6fc13745bd3b5137034ccfb2ebb177e8cd5cab2895befd7e2eaa426f4d7679a4`
  - explorer: `https://testnet.arcscan.app/tx/0x6fc13745bd3b5137034ccfb2ebb177e8cd5cab2895befd7e2eaa426f4d7679a4`

## Boot local sem Nexus

### Setup minimo

```bash
make api-install
make api-test
make demo-start
make demo-status
```

### URLs do demo

- Swagger UI: `http://127.0.0.1:8010/docs`
- sala operacional: `http://127.0.0.1:4173`
- pitch site: `http://127.0.0.1:4174`

### Encerrar

```bash
make demo-stop
```

## Roteiro de 90 segundos

1. Abra o pitch site em `:4174` e mostre o framing do produto.
2. Abra a Swagger UI em `:8010/docs`.
3. Rode `GET /api/payments/catalog`.
4. Rode `POST /api/payments/intent` com:
   ```json
   {
     "artifact_id": "artifact_review_bundle",
     "buyer_address": "0xBuyerAddress"
   }
   ```
5. Rode `POST /api/payments/verify` com o `payment_id` retornado e:
   - real: `0x6fc13745bd3b5137034ccfb2ebb177e8cd5cab2895befd7e2eaa426f4d7679a4`
   - fallback local: `0xMockTransactionHash`
6. Rode `POST /api/payments/execute` com:
   ```json
   {
     "artifact_id": "artifact_review_bundle"
   }
   ```
7. Rode o fluxo demo curto:
   - `POST /api/demo/jobs/request`
   - `POST /api/demo/jobs/{id}/pay`
   - `POST /api/demo/jobs/{id}/execute`
   - `POST /api/demo/jobs/{id}/review?approve=true`
   - `POST /api/demo/jobs/{id}/deliver`
8. Abra a sala operacional em `:4173`, clique em refresh e mostre:
   - guardrails
   - evidence journal
   - artifact board
   - market heartbeat como contexto, nao como produto principal

## O que dizer explicitamente

- "Nexus foi usado para construir e validar o sistema, mas o demo que o jurado roda localmente nao precisa iniciar Nexus."
- "O produto nao e live trading. E uma artifact room para machine work pago."
- "A entrega fica bloqueada ate settlement e review."
- "O tx hash em Arc testnet e a ancora onchain do walkthrough."

## Shot list para screenshots

- pitch site hero
- catalogo de artefatos / pricing
- Swagger UI com `POST /api/payments/intent`
- Arcscan com o tx hash real
- Swagger UI com `POST /api/payments/verify`
- sala operacional `apps/web`

## Arquivos para colar no formulario

- titulo e copy: `docs/hackathon/HACKATHON_SUBMISSION_DRAFT.md`
- deck: `docs/hackathon/pitch-deck.md`
- demo script: `docs/hackathon/demo-script.md`
- Q&A: `docs/hackathon/q-and-a.md`
- arquitetura: `docs/ARCHITECTURE.md`
- feedback Circle: `docs/CIRCLE_FEEDBACK.md`

## Ultimos checks de codigo

```bash
make api-test
make api-lint
make api-typecheck
python3 scripts/verify_guardrails.py
```

Se quiser logs dos servidores locais:

```bash
make demo-logs
```
