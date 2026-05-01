/* eslint-disable */
// Usage:
//   node scripts/generate-docx-report.js \
//     docs/reports/2026-04-19-final-integration-report.md \
//     docs/reports/2026-04-19-final-integration-report.docx
//
// Requires the `docx` package to be available to Node. In this environment
// it is installed globally already.

const fs = require("fs");
const path = require("path");
const {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} = require("docx");

const [,, inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("usage: node scripts/generate-docx-report.js <input.md> <output.docx>");
  process.exit(1);
}

const absoluteInput = path.resolve(process.cwd(), inputPath);
const absoluteOutput = path.resolve(process.cwd(), outputPath);
const markdown = fs.readFileSync(absoluteInput, "utf8");
const lines = markdown.split(/\r?\n/);

function cleanInlineMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)")
    .trim();
}

function paragraph(text, options = {}) {
  return new Paragraph({
    heading: options.heading,
    spacing: options.spacing || { before: 80, after: 120 },
    bullet: options.bullet ? { level: 0 } : undefined,
    children: [
      new TextRun({
        text: cleanInlineMarkdown(text),
        bold: options.bold || false,
        size: options.size || 24,
        font: "Arial",
      }),
    ],
  });
}

const children = [];
let buffer = [];

function flushBuffer() {
  if (buffer.length === 0) {
    return;
  }
  children.push(paragraph(buffer.join(" ")));
  buffer = [];
}

for (const rawLine of lines) {
  const line = rawLine.trimEnd();

  if (!line.trim()) {
    flushBuffer();
    continue;
  }

  if (line.startsWith("# ")) {
    flushBuffer();
    children.push(
      paragraph(line.slice(2), {
        heading: HeadingLevel.TITLE,
        bold: true,
        size: 34,
        spacing: { before: 240, after: 220 },
      })
    );
    continue;
  }

  if (line.startsWith("## ")) {
    flushBuffer();
    children.push(
      paragraph(line.slice(3), {
        heading: HeadingLevel.HEADING_1,
        bold: true,
        size: 28,
        spacing: { before: 220, after: 160 },
      })
    );
    continue;
  }

  if (line.startsWith("### ")) {
    flushBuffer();
    children.push(
      paragraph(line.slice(4), {
        heading: HeadingLevel.HEADING_2,
        bold: true,
        size: 25,
        spacing: { before: 180, after: 140 },
      })
    );
    continue;
  }

  if (line.startsWith("- ")) {
    flushBuffer();
    children.push(
      paragraph(line.slice(2), {
        bullet: true,
        size: 23,
        spacing: { before: 30, after: 50 },
      })
    );
    continue;
  }

  if (/^\d+\.\s/.test(line)) {
    flushBuffer();
    children.push(
      paragraph(line.replace(/^\d+\.\s/, ""), {
        bullet: true,
        size: 23,
        spacing: { before: 30, after: 50 },
      })
    );
    continue;
  }

  buffer.push(line);
}

flushBuffer();

const doc = new Document({
  sections: [
    {
      properties: {},
      children,
    },
  ],
});

fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });

Packer.toBuffer(doc)
  .then((bufferOutput) => {
    fs.writeFileSync(absoluteOutput, bufferOutput);
    console.log(`written ${absoluteOutput}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
