# Archived Real-Money Blocker Record

Este arquivo foi mantido apenas como registro de bloqueio. O repositorio atual
nao possui roadmap ativo para live trading ou dinheiro real.

## Politica dura

- nenhuma execucao com fundos reais e permitida neste escopo
- nenhuma rota de mainnet e aprovada neste repositorio
- nenhum wallet flow pode virar auto-signing
- qualquer acao de wallet continua manual-signature only
- qualquer discussao futura sobre dinheiro real exigiria aprovacao humana fora do runtime

## Como ler este arquivo

Use este documento apenas para entender por que o bloqueio permanece:

- falta governanca aprovada
- falta separacao de segredos em fronteiras confiaveis
- falta processo humano de aprovacao, revogacao e auditoria
- falta qualquer autorizacao legal, operacional ou de custodia

## O que continua verdadeiro no codigo

- `ALLOW_MAINNET_TRADING` segue proibido
- `ENABLE_LIVE_TRADING` nao muda o fato de que a execucao real continua fora de escopo
- guardrails devem falhar fechado
- qualquer mudanca que reduza esses bloqueios esta fora do MVP

## Escopo atual do produto

O foco ativo e o vertical de hackathon para request, pagamento, settlement,
review e delivery de artefatos pagos. Este arquivo nao deve ser usado como
plano de implementacao.
