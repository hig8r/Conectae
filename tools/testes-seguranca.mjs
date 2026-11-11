#!/usr/bin/env node
/* =====================================================================
   Testes de segurança da landing page.

   Pré-requisitos:
       npx playwright install chromium     (uma vez)
       node tools/servidor-teste.mjs &     (em outro terminal)
       node tools/testes-seguranca.mjs

   O que é verificado:
   1. Cabeçalhos de segurança presentes na resposta.
   2. Nenhuma violação de CSP ao carregar e usar a página.
   3. Nenhuma requisição para domínio de terceiro.
   4. XSS refletido via configuração: payload em texto e em href.
   5. Neutralização de esquemas perigosos (javascript:, data:).
   6. Honeypot e proteção contra envio automatizado.
   7. Ausência de armazenamento de dados no navegador.
   8. Script inline não autorizado é bloqueado pela CSP.
   ===================================================================== */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";

/* Aceita o playwright instalado no projeto ou global. */
async function carregarPlaywright() {
  try {
    return (await import("playwright")).chromium;
  } catch {
    const req = createRequire(import.meta.url);
    const globalDir = execSync("npm root -g", { encoding: "utf8" }).trim();
    return req(`${globalDir}/playwright`).chromium;
  }
}
const chromium = await carregarPlaywright();

const BASE = process.env.BASE || "http://localhost:8080";
const resultados = [];

function checar(nome, passou, detalhe = "") {
  resultados.push({ nome, passou, detalhe });
  console.log(`${passou ? "PASSOU " : "FALHOU "} ${nome}${detalhe ? "  -> " + detalhe : ""}`);
}

const navegador = await chromium.launch();

/* ---------- 1. Cabeçalhos ---------- */
{
  const pagina = await navegador.newPage();
  const resp = await pagina.goto(BASE + "/index.html");
  const h = resp.headers();
  const obrigatorios = [
    "content-security-policy",
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
    "cross-origin-opener-policy",
    "cross-origin-resource-policy"
  ];
  const faltando = obrigatorios.filter((k) => !h[k]);
  checar("Cabeçalhos de segurança presentes", faltando.length === 0, faltando.join(", "));
  checar("CSP sem unsafe-inline em script-src",
    !/script-src[^;]*unsafe-inline/.test(h["content-security-policy"] || ""));
  checar("CSP sem unsafe-eval",
    !/unsafe-eval/.test(h["content-security-policy"] || ""));
  checar("CSP com default-src 'none'",
    /default-src 'none'/.test(h["content-security-policy"] || ""));
  checar("Clickjacking bloqueado por frame-ancestors e X-Frame-Options",
    /frame-ancestors 'none'/.test(h["content-security-policy"] || "") && h["x-frame-options"] === "DENY");
  await pagina.close();
}

/* ---------- 2 e 3. Violações de CSP e terceiros ---------- */
{
  const pagina = await navegador.newPage();
  const violacoes = [];
  const externos = new Set();
  pagina.on("console", (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to/i.test(t)) violacoes.push(t);
  });
  pagina.on("request", (r) => {
    const u = new URL(r.url());
    if (u.origin !== new URL(BASE).origin && u.protocol !== "data:") externos.add(u.origin);
  });

  await pagina.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await pagina.click(".faq__item summary");
  await pagina.waitForTimeout(400);

  checar("Nenhuma violação de CSP na carga e no uso da página",
    violacoes.length === 0, violacoes.slice(0, 2).join(" | "));
  checar("Nenhuma requisição a domínio de terceiro",
    externos.size === 0, [...externos].join(", "));

  const fontesOk = await pagina.evaluate(() => document.fonts.size > 0);
  checar("Fontes carregadas do próprio domínio", fontesOk);
  await pagina.close();
}

/* ---------- 4 e 5. XSS e esquemas perigosos via configuração ---------- */
{
  const pagina = await navegador.newPage();
  const alertas = [];
  pagina.on("dialog", async (d) => { alertas.push(d.message()); await d.dismiss(); });

  /* Substitui a configuração por uma versão hostil */
  await pagina.route("**/js/config.js", (rota) =>
    rota.fulfill({
      contentType: "text/javascript",
      body: `window.SITE = {
        whatsapp: "55'\\"><img src=x onerror=alert(1)>",
        telefoneExibicao: "<img src=x onerror=alert('tel')>",
        email: "javascript:alert('email')",
        instagram: "../../evil?<script>alert(1)</script>",
        endereco: { rua: "<svg onload=alert(2)>", maps: "javascript:alert('maps')" },
        horario: "</span><script>alert(3)</script>",
        cnpj: "x", mensagemPadrao: "oi", endpointFormulario: "javascript:alert('endpoint')"
      };`
    })
  );

  await pagina.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await pagina.waitForTimeout(600);

  checar("Nenhum alert disparado com configuração hostil", alertas.length === 0, alertas.join(" | "));

  const injetou = await pagina.evaluate(() =>
    document.querySelectorAll("img[src='x'], svg[onload], script:not([src]):not([type])").length);
  checar("Payload inserido como texto, sem criar elementos", injetou === 0, "elementos criados: " + injetou);

  const hrefs = await pagina.evaluate(() =>
    [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")));
  checar("Nenhum href com esquema javascript: ou data:",
    !hrefs.some((h) => /^\s*(javascript|data|vbscript):/i.test(h)));

  const zap = await pagina.evaluate(() =>
    document.querySelector('[data-site="whatsapp-link"]').getAttribute("href"));
  checar("Número de WhatsApp reduzido a dígitos", /^https:\/\/wa\.me\/\d+/.test(zap) || zap === "#", zap.slice(0, 60));

  const textoTel = await pagina.evaluate(() =>
    document.querySelector('[data-site="telefone"]').textContent);
  checar("Texto hostil permanece texto", textoTel.includes("<img"), JSON.stringify(textoTel).slice(0, 50));
  await pagina.close();
}

/* ---------- 6. Formulário ---------- */
{
  const pagina = await navegador.newPage();
  await pagina.goto(BASE + "/index.html", { waitUntil: "networkidle" });

  /* Honeypot preenchido: o envio deve ser descartado em silêncio */
  await pagina.fill("#nome", "Robo");
  await pagina.fill("#whatsapp", "11999999999");
  await pagina.evaluate(() => { document.querySelector("#empresa").value = "spam"; });
  await pagina.click('#form-contato button[type="submit"]');
  await pagina.waitForTimeout(300);
  let aviso = await pagina.evaluate(() =>
    document.querySelector(".formulario__retorno").getAttribute("data-visivel"));
  checar("Honeypot descarta o envio sem retorno", aviso !== "true");

  /* Campo obrigatório vazio não envia */
  await pagina.fill("#nome", "");
  const valido = await pagina.evaluate(() => document.querySelector("#form-contato").checkValidity());
  checar("Formulário inválido não passa na validação", valido === false);

  /* Limite de tamanho aplicado no HTML */
  const limites = await pagina.evaluate(() => ({
    nome: document.querySelector("#nome").maxLength,
    msg: document.querySelector("#mensagem").maxLength
  }));
  checar("Limites de tamanho nos campos", limites.nome === 80 && limites.msg === 600, JSON.stringify(limites));
  await pagina.close();

  /* Envio em menos de 3 segundos após abrir a página: comportamento
     típico de robô. Precisa de uma página nova para medir o tempo. */
  const rapida = await navegador.newPage();
  await rapida.goto(BASE + "/index.html", { waitUntil: "domcontentloaded" });
  await rapida.fill("#nome", "Robo Veloz");
  await rapida.fill("#whatsapp", "11999999999");
  await rapida.click('#form-contato button[type="submit"]');
  await rapida.waitForTimeout(250);
  const avisoRapido = await rapida.evaluate(() =>
    document.querySelector(".formulario__retorno").textContent);
  checar("Envio automatizado rápido é barrado", /Confira os dados/.test(avisoRapido), avisoRapido);
  await rapida.close();
}

/* ---------- 7. Armazenamento no navegador ---------- */
{
  const pagina = await navegador.newPage();
  await pagina.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  const estado = await pagina.evaluate(() => ({
    local: localStorage.length,
    sessao: sessionStorage.length,
    cookies: document.cookie
  }));
  checar("Nada gravado em localStorage, sessionStorage ou cookies",
    estado.local === 0 && estado.sessao === 0 && estado.cookies === "", JSON.stringify(estado));
  await pagina.close();
}

/* ---------- 8. Script inline não autorizado ---------- */
{
  const pagina = await navegador.newPage();
  const bloqueios = [];
  pagina.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) bloqueios.push(m.text()); });
  await pagina.route("**/index.html", async (rota) => {
    const resp = await rota.fetch();
    const corpo = (await resp.text()).replace("</body>", "<script>window.__injetado = true;<\/script></body>");
    await rota.fulfill({ response: resp, body: corpo });
  });
  await pagina.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  const executou = await pagina.evaluate(() => window.__injetado === true);
  checar("Script inline injetado é bloqueado pela CSP", executou === false, bloqueios.length + " bloqueio(s)");
  await pagina.close();
}

await navegador.close();

const falhas = resultados.filter((r) => !r.passou);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} testes passaram.`);
if (falhas.length) {
  console.log("Falhas:");
  falhas.forEach((f) => console.log("  - " + f.nome + " " + f.detalhe));
  process.exit(1);
}
