# Hackathon Agentic Arc

## Introducao

Este documento detalha o contexto e integracao do protocolo Arc ao nosso ambiente de desenvolvimento (Hackathon Phase 1).

## Contexto do Protocolo Arc

A documentacao completa pode ser acessada de forma inteligente em nosso fluxo local via MCP (Model Context Protocol). A inclusao do servidor MCP `arc-docs` permite que qualquer dev ou agente consulte diretamente os contratos inteligentes e padroes suportados pelo Arc.

## Setup Inicial (Onboarding)

Para configurar o MCP do Arc no seu ambiente:

```bash
claude mcp add --transport http arc-docs https://docs.arc.network/mcp
```

Isso criara/atualizara as configuracoes locais necessarias para consultar a base de conhecimento do Arc de forma agentica.

## Evidencia de Integracao

O comando de smoke test utilizado para validar a conectividade:

- "What smart contract standards does Arc support"

Os resultados desta consulta sao registrados na pasta de evidencias em `ops/evidence/arc-mcp-check.json`.
