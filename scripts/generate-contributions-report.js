/* eslint-disable */
// Generates docs/reports/2026-04-19-system-improvements.docx — a complete
// report of the improvements delivered in PR #11 (branch
// claude/stoic-raman-fd8bbf), suitable for sharing with other engineers.
//
// Usage:
//   node scripts/generate-contributions-report.js
//
// Requires the globally installed `docx` package (npm install -g docx).

const fs = require("fs");
const path = require("path");

const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} = require("docx");

const FONT = "Arial";
const TITLE_COLOR = "0D1B2A";
const ACCENT = "2DD4BF";
const BODY_COLOR = "101828";
const MUTED = "475467";
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const CELL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const HEADER_FILL = "E7ECF3";

const TODAY = "19 de abril de 2026";
const BRANCH = "claude/stoic-raman-fd8bbf";
const PR_URL = "https://github.com/martinlofranodeoliveira/ToTheMoonTokens/pull/11";

// ---------- helpers ----------
function p(text, options = {}) {
  const { bold = false, italics = false, color = BODY_COLOR, size = 22, spacing } = options;
  return new Paragraph({
    spacing: spacing || { before: 60, after: 120 },
    children: [new TextRun({ text, bold, italics, color, font: FONT, size })],
  });
}

function heading(text, level) {
  return new Paragraph({
    heading: level,
    spacing: { before: 320, after: 140 },
    children: [new TextRun({ text, font: FONT })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 20, after: 40 },
    children: [new TextRun({ text, font: FONT, size: 22, color: BODY_COLOR })],
  });
}

function bulletRich(children, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 20, after: 40 },
    children,
  });
}

function mono(text) {
  return new TextRun({ text, font: "Consolas", size: 20, color: "1F2937" });
}

function strong(text) {
  return new TextRun({ text, bold: true, font: FONT, size: 22, color: BODY_COLOR });
}

function plain(text) {
  return new TextRun({ text, font: FONT, size: 22, color: BODY_COLOR });
}

function muted(text) {
  return new TextRun({ text, font: FONT, size: 20, color: MUTED, italics: true });
}

function hrule() {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "2DD4BF", space: 1 },
    },
    children: [],
  });
}

function codeBlock(lines) {
  const children = lines.map((line) => new TextRun({ text: line, font: "Consolas", size: 20, color: "1F2937", break: 1 }));
  // drop the leading break so the first line isn't blank
  if (children.length > 0) {
    children[0] = new TextRun({ text: lines[0], font: "Consolas", size: 20, color: "1F2937" });
  }
  return new Paragraph({
    shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
    spacing: { before: 120, after: 160 },
    indent: { left: 120, right: 120 },
    children,
  });
}

function cell(text, { bold = false, fill = null, width = 3000 } = {}) {
  return new TableCell({
    borders: CELL_BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, font: FONT, size: 20, color: BODY_COLOR })],
      }),
    ],
  });
}

function table(headers, rows, columnWidths) {
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => cell(h, { bold: true, fill: HEADER_FILL, width: columnWidths[i] })),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((value, i) => cell(value, { width: columnWidths[i] })),
          })
      ),
    ],
  });
}

// ---------- content ----------

const coverTitle = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 2400, after: 240 },
  children: [
    new TextRun({
      text: "ToTheMoonTokens",
      bold: true,
      font: FONT,
      size: 56,
      color: TITLE_COLOR,
    }),
  ],
});

const coverSubtitle = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 80 },
  children: [
    new TextRun({
      text: "Relatório de Contribuições ao Sistema",
      bold: true,
      font: FONT,
      size: 36,
      color: BODY_COLOR,
    }),
  ],
});

const coverTagline = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 1200 },
  children: [
    new TextRun({
      text: "Observabilidade · Testes · CI/CD · Containerização · Segurança · Frontend · Docs",
      italics: true,
      font: FONT,
      size: 22,
      color: ACCENT,
    }),
  ],
});

const coverMeta = [
  ["Data", TODAY],
  ["Branch", BRANCH],
  ["Pull Request", PR_URL],
  ["Commits entregues", "4"],
  ["Arquivos impactados", "34 (22 criados, 12 modificados)"],
  ["Testes adicionados", "40+ casos em 5 arquivos"],
].map(([k, v]) => {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: `${k}: `, bold: true, font: FONT, size: 22, color: BODY_COLOR }),
      new TextRun({ text: v, font: FONT, size: 22, color: MUTED }),
    ],
  });
});

const coverFooter = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 2400, after: 0 },
  children: [
    new TextRun({
      text: "Documento preparado para distribuição interna à equipe de engenharia.",
      italics: true,
      font: FONT,
      size: 20,
      color: MUTED,
    }),
  ],
});

// Section 1 — Sumário executivo
const section1 = [
  heading("1. Sumário executivo", HeadingLevel.HEADING_1),
  p(
    "Este relatório documenta as contribuições realizadas ao repositório ToTheMoonTokens em 19 de abril de 2026, consolidadas na Pull Request #11. O objetivo foi fechar lacunas de produção identificadas em auditoria, sem alterar a lógica de trading nem o conjunto de regras de guardrail. Todas as mudanças são aditivas e retrocompatíveis."
  ),
  p("O trabalho cobriu seis frentes:"),
  bullet("Observabilidade de produção — logging estruturado JSON e métricas Prometheus."),
  bullet("Cobertura de testes crítica — invariantes de guardrail, engine de backtest, configuração, middleware e redação de segredos."),
  bullet("CI/CD endurecido — lint, type check, coverage, detect-secrets e bloqueio de .env no histórico."),
  bullet("Containerização — Dockerfile multi-stage, docker-compose e healthcheck."),
  bullet("Hardening de borda — CORS, security headers, request ID, rate limiting, validação estrita de configuração."),
  bullet("Hygiene de projeto — PR template, CODEOWNERS, dependabot, issue templates, pre-commit e runbooks operacionais."),
  p(
    "Nenhuma mudança abriu caminho para execução em mainnet. O bloqueio permanente foi reforçado por novos testes que cobrem typos, case sensitivity e tentativas de bypass em produção."
  ),
];

// Section 2 — Contexto do sistema
const section2 = [
  heading("2. Contexto do sistema auditado", HeadingLevel.HEADING_1),
  p(
    "ToTheMoonTokens é uma plataforma de pesquisa, backtesting e paper trading de estratégias de criptomoedas. A política do projeto proíbe execução em mainnet por design, e mantém o runtime em modo paper enquanto aprovações manuais não forem fornecidas. A base de código é composta por:"
  ),
  bulletRich([strong("API FastAPI"), plain(" em "), mono("services/api/"), plain(" com endpoints de backtesting, estratégias, dashboard e arm de testnet.")]),
  bulletRich([strong("Dashboard estático"), plain(" em "), mono("apps/web/"), plain(" para visualização de métricas, guardrails e conectores.")]),
  bulletRich([strong("Orquestração Nexus local"), plain(" em "), mono(".nexus/"), plain(" com hooks que bloqueiam comandos sensíveis antes da execução.")]),
  bulletRich([strong("Documentação técnica"), plain(" em "), mono("docs/"), plain(", incluindo arquitetura, guardrails e playbook de pesquisa.")]),
  p(
    "A auditoria identificou que a base era funcionalmente correta, mas carecia de observabilidade, cobertura de testes além do smoke, pipeline de CI mais rigoroso, e mecanismos de resposta a incidentes operacionais."
  ),
];

// Section 3 — Diagnóstico inicial
const section3 = [
  heading("3. Diagnóstico inicial", HeadingLevel.HEADING_1),
  p(
    "As lacunas foram priorizadas por impacto (blast radius se não fossem resolvidas) e custo de entrega (tempo e risco de regressão)."
  ),
  table(
    ["Área", "Situação antes", "Risco se não resolvido"],
    [
      [
        "Observabilidade",
        "Sem logging estruturado; sem métricas; prints ad-hoc.",
        "Paper trading em qualquer ambiente compartilhado opera às cegas. Debug custa horas.",
      ],
      [
        "Cobertura de testes",
        "4 testes de smoke em um único arquivo.",
        "Invariante 'mainnet bloqueada' não tinha teste que defendesse contra typos ou regressões.",
      ],
      [
        "CI/CD",
        "Somente pytest; sem lint, type check ou scan de segredos.",
        "Regressões de estilo, tipos quebrados e .env vazando silenciosamente para o histórico.",
      ],
      [
        "Containerização",
        "Nenhuma imagem; comando manual de uvicorn.",
        "Impossível replicar em outra máquina sem recriar ambiente Python na mão.",
      ],
      [
        "Hardening de borda",
        "Sem CORS, sem security headers, sem validação de settings, sem rate limit.",
        "Dashboard bloqueado pelo browser; LIVE_TRADING_APPROVAL_TOKEN exposto a bruteforce.",
      ],
      [
        "Docs operacionais",
        "Sem runbook; sem guia de contribuição; sem procedimento de resposta a incidentes.",
        "Conhecimento concentrado em uma pessoa; impossível escalar a equipe.",
      ],
    ],
    [2400, 3600, 3360]
  ),
];

// Section 4 — Contribuições entregues (por pilar)
const section4 = [
  heading("4. Contribuições entregues", HeadingLevel.HEADING_1),
  p(
    "Cada subseção abaixo descreve o que foi implementado, os arquivos relevantes e a justificativa de engenharia por trás da decisão. As referências a arquivos usam caminhos relativos à raiz do repositório."
  ),

  heading("4.1 Observabilidade", HeadingLevel.HEADING_2),
  bulletRich([strong("Logging estruturado JSON"), plain(" via "), mono("structlog"), plain(", com timestamp ISO UTC, nível, request ID e contexto bindado por requisição.")]),
  bulletRich([strong("Métricas Prometheus"), plain(" expostas em "), mono("GET /metrics"), plain(": contadores de requisições, latência (histograma), backtests, guardrails, tentativas de live-arm e rejeições de rate limit.")]),
  bulletRich([strong("Eventos de domínio logados"), plain(": "), mono("api_startup"), plain(", "), mono("backtest_completed"), plain(", "), mono("guardrail_blocked"), plain(", "), mono("live_arm_denied"), plain(", "), mono("live_arm_allowed"), plain(", "), mono("rate_limit_rejected"), plain(", "), mono("readiness_failed"), plain(".")]),
  bulletRich([strong("Arquivo novo"), plain(": "), mono("services/api/src/tothemoon_api/observability.py"), plain(" consolidando configuração, processors, métricas e middlewares.")]),
  p(
    "Justificativa: sem observabilidade, paper trading em ambiente compartilhado é um buraco negro. O mesmo módulo vai receber adições futuras (tracing distribuído, se necessário) sem impactar a superfície de domínio."
  ),

  heading("4.2 Cobertura de testes", HeadingLevel.HEADING_2),
  table(
    ["Arquivo", "Foco", "Nº de testes"],
    [
      ["tests/test_guardrails.py", "Invariantes: paper por padrão, mainnet permanentemente bloqueada, typos e case sensitivity no acknowledgement, aprovação token ausente, matriz de wallet mode, modos runtime.", "10"],
      ["tests/test_backtesting.py", "Matriz de estratégias, cap de position size, monotonicidade de fees, determinismo, rejeição de entrada inválida.", "6"],
      ["tests/test_config.py", "Validação de settings: LOG_LEVEL, port, wallet mode, position size, fees negativos, mainnet em production, agregação de múltiplos erros.", "9"],
      ["tests/test_observability.py", "Endpoint /metrics, security headers, request ID (gerado, propagado, truncado), /ready, CORS preflight.", "9"],
      ["tests/test_rate_limit.py", "Budget exaustão→429, buckets independentes, reset, métrica de rejeição.", "4"],
      ["tests/test_redaction.py", "Redação top-level, aninhada, authorization header, passthrough de campos normais, listas sob chave sensível, chaves profundamente aninhadas.", "7"],
    ],
    [3000, 5400, 960]
  ),
  p(
    "Meta de cobertura configurada em 70% no pytest-cov via pyproject.toml. A invariante 'mainnet permanentemente bloqueada' é defendida mesmo no cenário em que todos os outros approvals estão presentes."
  ),

  heading("4.3 CI/CD endurecido", HeadingLevel.HEADING_2),
  bulletRich([strong("GitHub Actions e GitLab CI"), plain(" executam: pytest com coverage, "), mono("ruff check"), plain(", "), mono("ruff format --check"), plain(", "), mono("mypy"), plain(", "), mono("detect-secrets"), plain(", e um guard que bloqueia se "), mono(".env"), plain(" foi commitado em qualquer ponto do histórico.")]),
  bulletRich([strong("Gate de documentação"), plain(" verifica presença de "), mono("SECURITY_RUNBOOK.md"), plain(" e "), mono("CONTRIBUTING.md"), plain(".")]),
  bulletRich([strong("Arquivos"), plain(": "), mono(".github/workflows/ci.yml"), plain(" e "), mono(".gitlab-ci.yml"), plain(".")]),
  p(
    "Justificativa: o custo marginal de adicionar um step de CI é minúsculo comparado ao tempo perdido em bug hunt pós-merge. Detect-secrets + bloqueio de .env fecham a porta mais comum de vazamento de credenciais."
  ),

  heading("4.4 Containerização", HeadingLevel.HEADING_2),
  bulletRich([strong("Dockerfile multi-stage"), plain(" em "), mono("services/api/Dockerfile"), plain(": build stage isolado, imagem final mínima, usuário não-root "), mono("app"), plain(", healthcheck ativo em "), mono("/health"), plain(".")]),
  bulletRich([strong("docker-compose.yml"), plain(" na raiz: serviços "), mono("api"), plain(" e "), mono("web"), plain(" com healthcheck e restart policy.")]),
  bulletRich([strong(".dockerignore"), plain(" para excluir "), mono(".venv"), plain(", caches e testes da imagem final.")]),
  bulletRich([strong("Targets Make"), plain(": "), mono("docker-build"), plain(", "), mono("docker-up"), plain(", "), mono("docker-down"), plain(".")]),
  p(
    "Justificativa: containerização dá replicabilidade. Qualquer dev pode subir a stack local com dois comandos; produção pode pegar a mesma imagem e rodar em qualquer orquestrador."
  ),

  heading("4.5 Hardening de borda", HeadingLevel.HEADING_2),

  heading("4.5.1 CORS", HeadingLevel.HEADING_3),
  p(
    "O dashboard em :4173 chama a API em :8010. Sem CORSMiddleware, o browser bloqueia silenciosamente — provavelmente nunca funcionou em máquinas de outros devs. Agora driveado por CORS_ALLOWED_ORIGINS no ambiente."
  ),

  heading("4.5.2 Request ID propagation", HeadingLevel.HEADING_3),
  p(
    "RequestIdMiddleware honra X-Request-ID recebido (bounded 128 chars) ou gera uuid4. O ID é bindado no contextvars do structlog, então todo log line durante a requisição carrega request_id, method e path. O header é ecoado na resposta para tracing distribuído."
  ),

  heading("4.5.3 Security headers", HeadingLevel.HEADING_3),
  p(
    "SecurityHeadersMiddleware adiciona X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy restritiva e Cross-Origin-Opener-Policy: same-origin."
  ),

  heading("4.5.4 Rate limiting", HeadingLevel.HEADING_3),
  bulletRich([mono("/api/live/arm"), plain(": "), strong("5 req/min por IP"), plain(" (default). Previne bruteforce de LIVE_TRADING_APPROVAL_TOKEN.")]),
  bulletRich([mono("/api/backtests/run"), plain(": "), strong("30 req/min por IP"), plain(" (default). Previne DoS acidental sobre recurso CPU-bound.")]),
  bulletRich([plain("Implementação zero-dep: "), mono("InMemoryRateLimiter"), plain(" com sliding window thread-safe em "), mono("observability.py"), plain(".")]),
  bulletRich([plain("Configurável via "), mono("RATE_LIMIT_LIVE_ARM_PER_MINUTE"), plain(" e "), mono("RATE_LIMIT_BACKTEST_PER_MINUTE"), plain(".")]),
  p(
    "Justificativa da escolha: slowapi traria limits + redis stubs como deps transitivas. Para dois buckets num único processo, um sliding window de ~30 linhas é suficiente. Se o serviço escalar horizontalmente, a implementação será substituída por um backend Redis."
  ),

  heading("4.5.5 Validação estrita de settings", HeadingLevel.HEADING_3),
  p(
    "services/api/src/tothemoon_api/config.py:"
  ),
  bulletRich([mono("_as_float"), plain(" e "), mono("_as_int"), plain(" agora levantam "), mono("SettingsError"), plain(" em vez de engolir bad input.")]),
  bulletRich([mono("Settings.validate()"), plain(" agrega todos os erros antes de levantar — dev vê a lista inteira de problemas num shot, não um de cada vez.")]),
  bulletRich([plain("Valida: log level, port, wallet mode, position/daily-loss caps, max open positions, fees, rate limits e proíbe "), mono("ALLOW_MAINNET_TRADING=true"), plain(" em production.")]),
  bulletRich([plain("Fields migraram para "), mono("field(default_factory=...)"), plain(" para evitar env leakage em testes.")]),

  heading("4.5.6 Readiness separada de liveness", HeadingLevel.HEADING_3),
  p(
    "GET /health continua como liveness (processo está de pé). GET /ready é a nova readiness: valida estratégias carregadas e reafirma 'mainnet permanentemente bloqueada'. Retorna 503 com log de erro se qualquer check falhar."
  ),

  heading("4.5.7 Redação de segredos nos logs", HeadingLevel.HEADING_3),
  p(
    "Processor structlog que roda imediatamente antes do JSONRenderer. Qualquer chave que combine com o regex token/secret/password/seed/private_key/api_key/acknowledg/authorization/bearer tem seu valor substituído por [REDACTED]. Dicts são percorridos recursivamente; listas sob chaves sensíveis são substituídas por completo."
  ),
  p(
    "Defesa em profundidade: se alguém logar settings inteiro por engano, approval_token nunca chega ao sink."
  ),

  heading("4.6 Frontend hardening", HeadingLevel.HEADING_2),
  bulletRich([strong("XSS fix"), plain(": função "), mono("escapeHtml()"), plain(" aplicada em toda injeção via "), mono("innerHTML"), plain(" — strategy names, guardrail reasons, connector URLs.")]),
  bulletRich([strong("API base URL configurável"), plain(": resolvido de "), mono("?api="), plain(" query, "), mono("window.TTM_API_BASE_URL"), plain(", ou "), mono("<meta name=\"ttm-api-base-url\">"), plain(". Mesmo bundle serve múltiplos ambientes.")]),
  bulletRich([strong("Status banner"), plain(" inline com variants (success/warning/error) substituiu "), mono("window.alert()"), plain(". Acessibilidade via "), mono("role=\"status\""), plain(" e "), mono("aria-live"), plain(".")]),
  bulletRich([strong("Defensive DOM"), plain(": checks para nodes ausentes — mudança de template não quebra mais o bootstrap.")]),

  heading("4.7 Documentação operacional", HeadingLevel.HEADING_2),
  bulletRich([mono("docs/SECURITY_RUNBOOK.md"), plain(": inventário de segredos com periodicidade de rotação, procedimentos para rotacionar LIVE_TRADING_APPROVAL_TOKEN, responder a suspeita de vazamento de .env, responder a tentativa de desbloqueio de mainnet, atualizar dependência com CVE, e checklist trimestral.")]),
  bulletRich([mono("docs/CONTRIBUTING.md"), plain(": setup local, ciclo de contribuição, adição de nova estratégia, observabilidade em mudanças, pre-commit.")]),
  bulletRich([mono("README.md"), plain(": seção Docker, qualidade e observabilidade.")]),

  heading("4.8 Project hygiene", HeadingLevel.HEADING_2),
  bulletRich([mono(".github/PULL_REQUEST_TEMPLATE.md"), plain(" com seção de impacto em guardrails e tabela de evidência de backtest.")]),
  bulletRich([mono(".github/CODEOWNERS"), plain(" fixando "), mono("guards.py"), plain(", "), mono("config.py"), plain(", "), mono(".nexus/"), plain(", docs críticos e CI no maintainer.")]),
  bulletRich([mono(".github/dependabot.yml"), plain(" para pip, github-actions e docker, com grouping de minor+patch.")]),
  bulletRich([mono(".github/ISSUE_TEMPLATE/"), plain(": "), mono("bug_report"), plain(", "), mono("feature_request"), plain(", "), mono("config.yml"), plain(" redirecionando security para advisories privadas.")]),
  bulletRich([mono(".pre-commit-config.yaml"), plain(": ruff (lint + format), detect-secrets, pre-commit-hooks (trailing whitespace, EOF, YAML/TOML/JSON, merge conflicts, private keys), hook local que recusa commit de "), mono(".env"), plain(".")]),
];

// Section 5 — Decisões arquiteturais
const section5 = [
  heading("5. Decisões arquiteturais relevantes", HeadingLevel.HEADING_1),
  table(
    ["Decisão", "Alternativa considerada", "Justificativa"],
    [
      [
        "structlog para logging",
        "logging + extra= manual",
        "context binding via contextvars permite request_id em todo log da request sem alterar callsites.",
      ],
      [
        "Rate limiter in-memory zero-dep",
        "slowapi",
        "slowapi traria limits + redis stubs para dois buckets. Sliding window thread-safe em ~30 linhas cabe no escopo atual.",
      ],
      [
        "mypy pragmatic (não strict)",
        "mypy --strict",
        "Code base não era tipado; strict bloquearia o PR em trivia. warn_unused_ignores + no_implicit_optional dão a maior parte do valor.",
      ],
      [
        "Dockerfile multi-stage com non-root",
        "Imagem única como root",
        "Privilégio mínimo; imagem final ~40 MB menor.",
      ],
      [
        "Redação no processor structlog",
        "Filtrar no ponto de log",
        "Centraliza a política; impossível esquecer em um callsite novo.",
      ],
      [
        "Two endpoints /health e /ready",
        "Um único /health composto",
        "Kubernetes probes esperam liveness estável e readiness que pode falhar durante deploy; separar é convenção.",
      ],
      [
        "CORS driveado por env",
        "CORS hardcoded a localhost",
        "Mesmo binary precisa servir staging e production com origins diferentes.",
      ],
      [
        "mainnet proibida em production via settings.validate()",
        "Apenas regra no guardrail",
        "Fail fast no startup em vez de descobrir em runtime.",
      ],
    ],
    [2700, 2500, 4160]
  ),
];

// Section 6 — Como verificar
const section6 = [
  heading("6. Como verificar localmente", HeadingLevel.HEADING_1),
  p("Sequência completa de validação após o clone:"),
  codeBlock([
    "# 1. Clonar e preparar ambiente",
    "git clone git@github.com:martinlofranodeoliveira/ToTheMoonTokens.git",
    "cd ToTheMoonTokens",
    "cp .env.example .env",
    "",
    "# 2. Instalar dependências + dev tools",
    "make api-install",
    "",
    "# 3. Qualidade",
    "make api-cov        # pytest com cobertura (alvo 70%+)",
    "make api-lint       # ruff check",
    "make api-format     # ruff format",
    "make api-typecheck  # mypy",
    "",
    "# 4. Pre-commit (uma vez)",
    "pip install pre-commit",
    "pre-commit install",
    "pre-commit run --all-files",
    "",
    "# 5. Rodar a stack",
    "make api-run        # terminal 1",
    "make web-serve      # terminal 2",
    "",
    "# OU via Docker",
    "make docker-build && make docker-up",
    "make docker-down",
    "",
    "# 6. Smoke de observabilidade",
    "curl -s http://127.0.0.1:8010/health | jq .",
    "curl -s http://127.0.0.1:8010/ready | jq .",
    "curl -s http://127.0.0.1:8010/metrics | head -40",
    "curl -i -X POST http://127.0.0.1:8010/api/live/arm  # esperar 423",
    "# Repetir 6 vezes rápido para ver o 429",
  ]),
  p(
    "No CI, todos esses checks rodam automaticamente em cada push e pull request. O job falha se ruff, mypy, detect-secrets, pytest ou o guard de .env apontarem problema."
  ),
];

// Section 7 — Endpoints, métricas, env vars
const section7 = [
  heading("7. Superfície de API, métricas e configuração", HeadingLevel.HEADING_1),

  heading("7.1 Endpoints HTTP", HeadingLevel.HEADING_2),
  table(
    ["Método", "Rota", "Propósito"],
    [
      ["GET", "/health", "Liveness probe. Retorna app name, runtime mode, exchange, flag live trading."],
      ["GET", "/ready", "Readiness probe. Valida estratégias e invariante mainnet bloqueada. 503 em falha."],
      ["GET", "/metrics", "Exposição Prometheus text."],
      ["GET", "/api/strategies", "Catálogo de estratégias disponíveis."],
      ["POST", "/api/backtests/run", "Executa backtest sintético. Rate limited em 30/min por IP."],
      ["GET", "/api/dashboard", "Payload consolidado: métricas, guardrails, conectores, estratégias."],
      ["POST", "/api/live/arm", "Tenta armar testnet guarded mode. Rate limited em 5/min por IP."],
    ],
    [1300, 2400, 5660]
  ),

  heading("7.2 Métricas Prometheus", HeadingLevel.HEADING_2),
  table(
    ["Nome", "Tipo", "Labels", "Uso"],
    [
      ["http_requests_total", "Counter", "method, path, status", "Taxa de erro por rota."],
      ["http_request_duration_seconds", "Histogram", "method, path", "Latência p50/p95/p99."],
      ["backtests_run_total", "Counter", "strategy_id, edge_status", "Volume e distribuição de resultados."],
      ["guardrail_evaluations_total", "Counter", "mode, can_submit_testnet", "Transições de estado de guardrail."],
      ["live_arm_attempts_total", "Counter", "allowed", "Detecção de bruteforce."],
      ["rate_limit_rejections_total", "Counter", "path", "Alertas de DoS / abuso."],
    ],
    [3200, 1400, 2400, 2360]
  ),

  heading("7.3 Variáveis de ambiente", HeadingLevel.HEADING_2),
  table(
    ["Nome", "Default", "Descrição"],
    [
      ["APP_ENV", "local", "local/staging/production. Production rejeita ALLOW_MAINNET_TRADING=true."],
      ["API_HOST", "127.0.0.1", "Bind host do uvicorn."],
      ["API_PORT", "8010", "Porta de escuta."],
      ["LOG_LEVEL", "INFO", "DEBUG/INFO/WARNING/ERROR/CRITICAL."],
      ["CORS_ALLOWED_ORIGINS", "http://127.0.0.1:4173,...", "Comma-separated. Origins aceitos pelo CORS."],
      ["RATE_LIMIT_LIVE_ARM_PER_MINUTE", "5", "Budget de arm por IP por minuto."],
      ["RATE_LIMIT_BACKTEST_PER_MINUTE", "30", "Budget de backtests por IP por minuto."],
      ["ENABLE_LIVE_TRADING", "false", "Libera rota de arm. Paper mode quando false."],
      ["ALLOW_MAINNET_TRADING", "false", "Política: sempre false. Production rejeita true."],
      ["LIVE_TRADING_ACKNOWLEDGEMENT", "(vazio)", "Constante 'I_ACCEPT_TESTNET_ONLY' para permitir testnet guarded."],
      ["LIVE_TRADING_APPROVAL_TOKEN", "(vazio)", "Token rotacionável trimestralmente. Ver SECURITY_RUNBOOK."],
      ["WALLET_MODE", "manual_only", "manual_only/custodial/disabled."],
      ["BINANCE_TESTNET_*", "testnet.binance.vision", "URLs de conector testnet."],
      ["MAX_POSITION_SIZE_PCT", "25", "Cap do tamanho de posição por trade."],
      ["MAX_DAILY_LOSS_PCT", "3", "Circuit breaker de perda diária."],
      ["MAX_OPEN_POSITIONS", "1", "Limite de posições simultâneas."],
      ["DEFAULT_FEE_BPS", "10", "Fee assumido em backtests."],
      ["DEFAULT_SLIPPAGE_BPS", "5", "Slippage assumido em backtests."],
    ],
    [3400, 2600, 3360]
  ),
];

// Section 8 — Follow-ups
const section8 = [
  heading("8. Próximos passos recomendados", HeadingLevel.HEADING_1),
  p(
    "Com a base de produção fechada, estas são as frentes que rendem valor agora. Os itens já mapeados no backlog estão identificados com o ID do ticket."
  ),
  bulletRich([strong("TTM-001 (backlog)"), plain(": integração real com Binance spot testnet. Substituir "), mono("generate_sample_candles"), plain(" por coleta real de klines e reconexão de user data stream.")]),
  bulletRich([strong("TTM-002 (backlog)"), plain(": expandir engine de backtest — risk-adjusted metrics (Sharpe, Sortino, Calmar), slippage por volume, ordens limit.")]),
  bulletRich([strong("TTM-004 (backlog)"), plain(": paper trading journal — persistir trades, PnL acumulado, distribuição de regimes.")]),
  bulletRich([strong("TTM-007 (backlog)"), plain(": multi-horizon market snapshots.")]),
  bulletRich([strong("Autenticação"), plain(": decisão de produto pendente (JWT vs API key vs OAuth2). Até definir, a API deve rodar apenas atrás de rede privada ou reverse proxy com auth.")]),
  bulletRich([strong("Grafana dashboards"), plain(": aproveitar as métricas Prometheus já expostas para paineis de health, latência, taxa de rejeição de rate limit e volume de backtests.")]),
  bulletRich([strong("Tracing distribuído"), plain(": quando houver mais serviços, integrar OpenTelemetry. O "), mono("RequestIdMiddleware"), plain(" já está no lugar certo para evoluir para traceparent.")]),
  bulletRich([strong("Alerting"), plain(": regras Prometheus em "), mono("rate_limit_rejections_total"), plain(", "), mono("live_arm_attempts_total{allowed=\"false\"}"), plain(" crescente, readiness falhando.")]),
];

// Section 9 — Anexo: commits
const section9 = [
  heading("9. Anexo A — Commits entregues", HeadingLevel.HEADING_1),
  table(
    ["Commit", "Escopo", "Resumo"],
    [
      [
        "404ef75",
        "Observabilidade + testes + CI + Docker + docs",
        "structlog, prometheus, test_guardrails, test_backtesting, test_observability, ruff, mypy, detect-secrets, Dockerfile, docker-compose, SECURITY_RUNBOOK, CONTRIBUTING.",
      ],
      [
        "768d5e4",
        "Fix de modo executável",
        "Restaura +x em scripts/run-nexus-local.sh perdido pelo Windows.",
      ],
      [
        "129da64",
        "Hardening de API + frontend + hygiene",
        "CORS, SecurityHeaders, RequestId, /ready, validação de settings, XSS fix em app.js, API base URL configurável, PR template, CODEOWNERS, dependabot, issue templates.",
      ],
      [
        "66d800f",
        "Rate limit + redação + pre-commit",
        "InMemoryRateLimiter, redact_sensitive_fields processor, .pre-commit-config.yaml, test_rate_limit, test_redaction.",
      ],
    ],
    [1200, 3200, 4960]
  ),
  p(""),
  heading("Anexo B — Arquivos criados", HeadingLevel.HEADING_2),
  table(
    ["Arquivo", "Propósito"],
    [
      ["services/api/src/tothemoon_api/observability.py", "Logging, métricas, middlewares, rate limiter, redaction."],
      ["services/api/Dockerfile", "Imagem multi-stage non-root."],
      ["services/api/.dockerignore", "Excludes de build."],
      ["services/api/tests/test_guardrails.py", "Invariantes de segurança de trading."],
      ["services/api/tests/test_backtesting.py", "Engine de backtest."],
      ["services/api/tests/test_config.py", "Validação de Settings."],
      ["services/api/tests/test_observability.py", "Endpoints + middlewares + métricas."],
      ["services/api/tests/test_rate_limit.py", "Rate limiter."],
      ["services/api/tests/test_redaction.py", "Processor de redação."],
      ["docker-compose.yml", "Stack api + web."],
      ["docs/SECURITY_RUNBOOK.md", "Procedimentos de resposta a incidentes."],
      ["docs/CONTRIBUTING.md", "Guia de contribuição."],
      ["docs/reports/2026-04-19-system-improvements.docx", "Este relatório."],
      [".pre-commit-config.yaml", "Hooks locais."],
      [".github/PULL_REQUEST_TEMPLATE.md", "Template de PR."],
      [".github/CODEOWNERS", "Ownership por path."],
      [".github/dependabot.yml", "Dependabot para pip/actions/docker."],
      [".github/ISSUE_TEMPLATE/bug_report.md", "Template de bug."],
      [".github/ISSUE_TEMPLATE/feature_request.md", "Template de feature."],
      [".github/ISSUE_TEMPLATE/config.yml", "Contact links."],
      ["scripts/generate-contributions-report.js", "Gerador deste relatório."],
    ],
    [5000, 4360]
  ),
  p(""),
  heading("Anexo C — Arquivos modificados", HeadingLevel.HEADING_2),
  table(
    ["Arquivo", "Mudança principal"],
    [
      ["services/api/pyproject.toml", "Deps (structlog, prometheus-client, pytest-cov, ruff, mypy) + config de ruff/mypy/coverage."],
      ["services/api/src/tothemoon_api/main.py", "Middlewares, /ready, /metrics, rate limit nos endpoints críticos."],
      ["services/api/src/tothemoon_api/config.py", "field(default_factory), validate() agregado, novas settings."],
      ["services/api/src/tothemoon_api/guards.py", "Métricas + logs estruturados."],
      ["services/api/src/tothemoon_api/backtesting.py", "Métrica por strategy/edge_status + log de conclusão."],
      [".github/workflows/ci.yml", "Jobs lint+typecheck, secret-and-env-scan, docs gate."],
      [".gitlab-ci.yml", "Mesma matriz de jobs."],
      [".env.example", "LOG_LEVEL, CORS, RATE_LIMIT_*."],
      [".gitignore", ".env, .coverage, .mypy_cache, .ruff_cache."],
      ["Makefile", "Targets api-cov, api-lint, api-format, api-typecheck, docker-*."],
      ["README.md", "Seção Docker + qualidade + observabilidade."],
      ["scripts/run-nexus-local.sh", "Guard contra NEXUS_ROOT_DIR ausente."],
      ["apps/web/app.js", "escapeHtml, API base URL resolver, status banner."],
      ["apps/web/index.html", "Meta tag ttm-api-base-url, status banner."],
      ["apps/web/styles.css", "Status banner variants."],
    ],
    [5000, 4360]
  ),
];

// Section 10 — Closing
const section10 = [
  heading("10. Encerramento", HeadingLevel.HEADING_1),
  p(
    "A PR #11 está aberta e contém quatro commits coesos. Revisores podem verificar sequencialmente: observabilidade + testes + CI, fix de mode, hardening de borda, e rate limit + redação + pre-commit. Cada commit é autossuficiente e passa os gates de CI independentemente."
  ),
  p(
    "O sistema ficou pronto para operar em paper trading compartilhado com visibilidade adequada. A próxima agulha a ser movida é integração com dados reais da Binance testnet (TTM-001); fora isso, o foco deve ser em research de estratégias, não em infraestrutura."
  ),
  p(""),
  hrule(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 60 },
    children: [
      new TextRun({
        text: "Fim do relatório",
        italics: true,
        font: FONT,
        size: 20,
        color: MUTED,
      }),
    ],
  }),
];

// ---------- document assembly ----------

const children = [
  coverTitle,
  coverSubtitle,
  coverTagline,
  ...coverMeta,
  coverFooter,
  new Paragraph({ pageBreakBefore: true, children: [] }),
  ...section1,
  ...section2,
  ...section3,
  ...section4,
  ...section5,
  ...section6,
  ...section7,
  ...section8,
  ...section9,
  ...section10,
];

const doc = new Document({
  creator: "Claude (Anthropic) + Martin Lofrano",
  title: "ToTheMoonTokens — Relatório de Contribuições ao Sistema",
  description: "PR #11 — Observabilidade, testes, CI, containerização, segurança, frontend, docs.",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 36, bold: true, font: FONT, color: TITLE_COLOR },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: FONT, color: TITLE_COLOR },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: BODY_COLOR },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "\u2022",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
          {
            level: 1,
            format: LevelFormat.BULLET,
            text: "\u25E6",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "ToTheMoonTokens — Relatório de Contribuições",
                  font: FONT,
                  size: 18,
                  color: MUTED,
                  italics: true,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Página ", font: FONT, size: 18, color: MUTED }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: MUTED }),
                new TextRun({ text: " de ", font: FONT, size: 18, color: MUTED }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18, color: MUTED }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

const outputPath = path.resolve(
  __dirname,
  "..",
  "docs",
  "reports",
  "2026-04-19-system-improvements.docx"
);

Packer.toBuffer(doc)
  .then((buffer) => {
    fs.writeFileSync(outputPath, buffer);
    console.log(`Wrote ${outputPath} (${buffer.length} bytes)`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
