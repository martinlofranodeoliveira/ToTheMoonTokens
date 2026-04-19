# Trading Guardrails

## Regras obrigatorias

- nunca assumir lucro garantido
- nunca ligar mainnet por default
- nunca armazenar seed phrase, private key ou mnemonics no repositorio
- nunca aceitar merge de estrategia sem backtest e paper trading
- usar Binance testnet antes de qualquer integracao executora
- tratar MetaMask e outras carteiras como assinatura/manual approval, nao como bot custodial

## Critérios minimos para considerar uma estrategia promissora

- retorno liquido positivo apos fees e slippage
- max drawdown abaixo do limite da carteira
- profit factor acima de 1.0
- numero minimo de trades para evitar overfitting obvio
- comportamento repetivel em janelas diferentes

## Status atual

- projeto inicial apenas em `research/paper`
- live trading real bloqueado por politica
- qualquer teste em exchange deve começar por testnet

