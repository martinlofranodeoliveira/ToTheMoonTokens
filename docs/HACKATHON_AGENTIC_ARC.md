# Hackathon Agentic Arc

## Introdução

Este documento detalha o contexto e integração do protocolo Arc ao nosso ambiente de desenvolvimento (Hackathon Phase 1).

## Contexto do Protocolo Arc

A documentação completa pode ser acessada de forma inteligente em nosso fluxo local via MCP (Model Context Protocol). A inclusão do servidor MCP `arc-docs` permite que qualquer dev ou agente consulte diretamente os contratos inteligentes e padrões suportados pelo Arc.

## Setup Inicial (Onboarding)

Para configurar o MCP do Arc no seu ambiente:

```bash
claude mcp add --transport http arc-docs https://docs.arc.network/mcp
```

Isso criará/atualizará as configurações locais necessárias para consultar a base de conhecimento do Arc de forma agêntica. Em menos de 5 minutos, você terá todo o contexto necessário!

## Evidência de Integração

O comando de smoke test utilizado para validar a conectividade:

- "What smart contract standards does Arc support"

Os resultados desta consulta são registrados na nossa pasta de métricas e evidências em `ops/evidence/arc-mcp-check.json`.
