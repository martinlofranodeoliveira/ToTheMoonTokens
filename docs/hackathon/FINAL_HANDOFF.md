# Final Handoff

Este documento junta o que voce precisa para gravar o video e submeter sem
reabrir o repositorio para descobrir caminhos.

## Estado final

- o runtime do jurado **nao precisa de Nexus**
- Part 1 do video ja gravado pode ser reaproveitado
- Part 2 deve ser regravado com o chat flutuante em `/ops/`
- o caminho principal e `Gemini chat -> checkout -> Circle payment -> Arc settlement -> review -> delivery`
- deploy publico:
  - pitch: `http://34.56.193.221/`
  - marketplace/chat: `http://34.56.193.221/ops/`
  - health: `http://34.56.193.221/health`
- prova onchain:
  - para o video final, use o tx hash fresco retornado pelo chat
  - sample validado: `0xf94442055fe5d2a95064c4f11bd09a16696011b3dfb3ebdb89c9277b79b28837`
  - explorer sample: `https://testnet.arcscan.app/tx/0xf94442055fe5d2a95064c4f11bd09a16696011b3dfb3ebdb89c9277b79b28837`

## Boot local sem Nexus

### Setup minimo

```bash
make api-install
make api-test
make demo-start
make demo-status
```

### URLs do demo local

- Swagger UI: `http://127.0.0.1:8010/docs`
- marketplace: `http://127.0.0.1:4173`
- pitch site: `http://127.0.0.1:4174`

### Demo local Arc/Circle/Nexus lifecycle

Use o painel `Paid Agent Lifecycle` no marketplace para exercitar o caminho
fixture-stable: `Create payment requirement` -> `Verify payment` -> `Unlock delivery`.
Ele usa Arc testnet/demo-safe data, USDC em ambiente de teste, Circle wallet
fixtures quando as credenciais reais nao estao configuradas, e Nexus apenas como
estado de orquestracao embutido no backend.

O caminho bloqueado esperado e: criar payment requirement e confirmar que
`Unlock delivery` continua desabilitado e a entrega fica `locked` ate a
verificacao do pagamento.

### Encerrar

```bash
make demo-stop
```

## Roteiro final de gravacao

1. Reaproveite o Part 1 ja gravado (`apps/pitch/pitch-video.html`, 90s).
2. Regrave apenas o Part 2.
3. Abra `http://34.56.193.221/ops/` e de `Ctrl+F5`.
4. Clique no botao flutuante de chat no canto inferior direito.
5. Envie:
   ```text
   What artifacts can you buy right now?
   ```
6. Depois envie:
   ```text
   Buy the Delivery Packet and unlock it.
   ```
7. Mostre o rastro de ferramentas no chat:
   - catalogo
   - checkout
   - Circle payment
   - Arc settlement verification
   - artifact unlock
8. Copie ou deixe visivel o tx hash retornado pelo chat.
9. Mostre a transacao correspondente no Circle Console, se ela aparecer sem expor dados privados.
10. Cole o tx hash no `https://testnet.arcscan.app` e mostre status de sucesso.

## O que dizer explicitamente

- "Nexus foi usado para construir e validar o sistema, mas o demo que o jurado roda localmente nao precisa iniciar Nexus."
- "O produto nao e live trading. E um marketplace de artefatos pagos para machine work."
- "Gemini e a interface compradora; Circle executa o pagamento; Arc fornece o recibo verificavel."
- "A entrega fica bloqueada ate settlement e review."
- "O tx hash em Arc testnet e a ancora onchain do walkthrough."

## Shot list para screenshots

- pitch site hero
- marketplace `/ops/` com botao flutuante de chat
- chat aberto com prompts e tool events
- chat mostrando artifact unlocked e tx hash
- Circle Console com a transacao, se seguro mostrar
- Arcscan com o tx hash real
- health endpoint mostrando `programmatic` e `agent_chat_ready`

## Arquivos para colar no formulario

- titulo e copy: `docs/hackathon/HACKATHON_SUBMISSION_DRAFT.md`
- deck: `docs/hackathon/pitch-deck.md`
- demo script: `docs/hackathon/demo-script.md`
- Q&A: `docs/hackathon/q-and-a.md`
- roteiro de video: `docs/hackathon/VIDEO_SHOOTING_SCRIPT.md`
- narracao: `docs/hackathon/narration-script.md`
- arquitetura: `docs/ARCHITECTURE.md`
- feedback Circle: `docs/CIRCLE_FEEDBACK.md`

## Ultimos checks de codigo

Checks estreitos que cobrem o lifecycle pago e o caminho bloqueado sem rodar a
suite inteira:

```bash
cd services/api && pytest tests/test_payments.py -q
cd apps/web-next && npm run test:e2e -- tests/e2e/saas.spec.ts -g "paid agent lifecycle"
```

Checks amplos antes de publicar/submeter:

```bash
make api-test
make api-lint
make api-typecheck
python3 scripts/verify_guardrails.py
```

Risco residual: o e2e usa fixtures deterministicas para Arc/Circle/Nexus. Antes
de gravar com servicos reais, valide um tx hash fresco no Circle Console e no
Arcscan testnet sem mostrar segredos, entity secret, API keys ou cookies.

Se quiser logs dos servidores locais:

```bash
make demo-logs
```
