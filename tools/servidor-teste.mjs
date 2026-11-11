#!/usr/bin/env node
/* =====================================================================
   Servidor local de teste.

   Serve os arquivos do site aplicando os MESMOS cabeçalhos de segurança
   declarados em netlify.toml. Serve para validar a CSP e os demais
   cabeçalhos antes do deploy, já que um servidor estático comum não
   envia nenhum deles.

       node tools/servidor-teste.mjs [porta]

   Uso exclusivo em desenvolvimento. Não é um servidor de produção.
   ===================================================================== */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import { readFileSync } from "node:fs";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const porta = Number(process.argv[2] || 8080);

/* Lê o bloco [[headers]] de "/*" do netlify.toml */
const toml = readFileSync(join(raiz, "netlify.toml"), "utf8");
const bloco = toml.split('for = "/*"')[1].split("[[headers]]")[0];
const cabecalhos = {};
for (const linha of bloco.split("\n")) {
  const m = linha.match(/^\s*([A-Za-z-]+)\s*=\s*"(.*)"\s*$/);
  if (m && m[1] !== "for") cabecalhos[m[1]] = m[2];
}

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

createServer(async (req, res) => {
  const caminhoUrl = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  /* normalize + prefixo obrigatório impedem path traversal (../) */
  let alvo = normalize(join(raiz, caminhoUrl));
  if (!alvo.startsWith(raiz)) {
    res.writeHead(403).end("403");
    return;
  }

  try {
    const info = await stat(alvo);
    if (info.isDirectory()) alvo = join(alvo, "index.html");
  } catch {
    alvo = join(raiz, "404.html");
    res.statusCode = 404;
  }

  try {
    const corpo = await readFile(alvo);
    res.writeHead(res.statusCode === 404 ? 404 : 200, {
      ...cabecalhos,
      "Content-Type": TIPOS[extname(alvo)] || "application/octet-stream"
    });
    res.end(corpo);
  } catch {
    res.writeHead(404, cabecalhos).end("404");
  }
}).listen(porta, () => {
  console.log(`Servidor de teste em http://localhost:${porta}`);
  console.log(`Cabeçalhos aplicados: ${Object.keys(cabecalhos).length}`);
});
