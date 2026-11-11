#!/usr/bin/env node
/* =====================================================================
   Gerador da Content Security Policy

   O que faz:
   1. Lê cada arquivo HTML, encontra os blocos <script> inline
      (os dados estruturados JSON-LD) e calcula o hash SHA-256 de cada um.
   2. Monta a política com esses hashes, sem 'unsafe-inline'.
   3. Grava a versão meta dentro de cada HTML e a versão cabeçalho
      dentro de netlify.toml e vercel.json.

   Rode sempre que alterar um script inline ou o JSON-LD:
       node tools/gerar-csp.mjs
   Para apenas conferir, sem gravar (uso em CI):
       node tools/gerar-csp.mjs --verificar

   Sem dependências externas de propósito: menos superfície de ataque
   e nada de node_modules no deploy.
   ===================================================================== */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGINAS = ["index.html", "politica-de-privacidade.html", "404.html"];
const verificar = process.argv.includes("--verificar");

/* Diretivas comuns às duas versões da política.
   connect-src fica em 'self': se você configurar endpointFormulario
   em js/config.js, acrescente aqui o domínio do serviço,
   por exemplo "connect-src 'self' https://formspree.io". */
const base = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "media-src 'none'",
  "worker-src 'none'",
  "upgrade-insecure-requests"
];

function hashesDe(html) {
  const blocos = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  return blocos.map((m) => "'sha256-" + createHash("sha256").update(m[1], "utf8").digest("base64") + "'");
}

function politica(hashes, { comFrameAncestors }) {
  const partes = [`script-src 'self' ${hashes.join(" ")}`.trim(), ...base];
  /* frame-ancestors é ignorado quando entregue por <meta>.
     Só entra na versão de cabeçalho HTTP. */
  if (comFrameAncestors) partes.push("frame-ancestors 'none'");
  return partes.sort().join("; ") + ";";
}

let divergencias = 0;
let politicaCabecalho = null;
const todosHashes = new Set();

for (const pagina of PAGINAS) {
  const caminho = join(raiz, pagina);
  const html = readFileSync(caminho, "utf8");
  const hashes = hashesDe(html);
  hashes.forEach((h) => todosHashes.add(h));

  const meta = politica(hashes, { comFrameAncestors: false });
  const atual = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/i);

  if (!atual) {
    console.error(`FALHA: ${pagina} não tem a meta tag de CSP.`);
    process.exitCode = 1;
    continue;
  }

  if (atual[1] === meta) {
    console.log(`ok       ${pagina} (${hashes.length} script inline)`);
    continue;
  }

  divergencias++;
  if (verificar) {
    console.error(`DIVERGE  ${pagina}: a CSP está desatualizada. Rode: node tools/gerar-csp.mjs`);
    process.exitCode = 1;
  } else {
    writeFileSync(
      caminho,
      html.replace(
        /(<meta http-equiv="Content-Security-Policy" content=")[^"]*(")/i,
        (_, a, b) => a + meta + b
      )
    );
    console.log(`gravado  ${pagina} (${hashes.length} script inline)`);
  }
}

/* A política de cabeçalho cobre todas as páginas, então usa a união dos hashes. */
politicaCabecalho = politica([...todosHashes].sort(), { comFrameAncestors: true });

function sincronizar(arquivo, regex, montar) {
  const caminho = join(raiz, arquivo);
  const texto = readFileSync(caminho, "utf8");
  const novo = texto.replace(regex, montar);
  if (novo === texto) {
    console.log(`ok       ${arquivo}`);
    return;
  }
  divergencias++;
  if (verificar) {
    console.error(`DIVERGE  ${arquivo}: cabeçalho de CSP desatualizado.`);
    process.exitCode = 1;
  } else {
    writeFileSync(caminho, novo);
    console.log(`gravado  ${arquivo}`);
  }
}

sincronizar(
  "netlify.toml",
  /(Content-Security-Policy = ")[^"]*(")/,
  (_, a, b) => a + politicaCabecalho + b
);

sincronizar(
  "vercel.json",
  /("key": "Content-Security-Policy", "value": ")[^"]*(")/,
  (_, a, b) => a + politicaCabecalho + b
);

console.log("\nPolítica de cabeçalho HTTP:\n" + politicaCabecalho);
if (!verificar && divergencias === 0) console.log("\nNada a mudar.");
