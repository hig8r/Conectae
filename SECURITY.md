# Segurança

Documento técnico da postura de segurança desta landing page.
Última auditoria: 11/11/2026.

## Superfície de ataque

Site estático, sem backend, sem banco de dados, sem autenticação,
sem cookies e sem dependências de runtime. Isso elimina por construção
as classes de vulnerabilidade de injeção em banco, falha de controle de
acesso, exposição de sessão e desserialização insegura.

O que sobra, e que esta auditoria tratou:

| Ponto de entrada | Origem do dado | Risco tratado |
|---|---|---|
| Formulário de contato | Digitação do visitante | XSS, abuso automatizado, injeção em URL |
| `js/config.js` | Editado pelo operador do site | XSS via href, esquemas perigosos |
| Parâmetros de URL | Não são lidos pela aplicação | Sem superfície |
| Recursos de terceiros | Eliminados | Supply chain, vazamento de IP |

## Controles implementados

**Content Security Policy sem `unsafe-inline` e sem `unsafe-eval`.**
`default-src 'none'` como base, com liberação explícita por tipo de
recurso. Os dois blocos de dados estruturados JSON-LD são autorizados
por hash SHA-256, não por `unsafe-inline`. Os hashes são gerados por
`tools/gerar-csp.mjs` e verificados no CI, de modo que um script inline
novo quebra o build em vez de exigir afrouxar a política.

**Zero recursos de terceiros.** As fontes Cormorant Garamond e Jost
(licença OFL) foram baixadas e passaram a ser servidas pelo próprio
domínio, em `assets/fonts/`, apenas nos subsets latin e latin-ext e nos
pesos realmente usados. Com isso não há mais requisição a
`fonts.googleapis.com` nem a `fonts.gstatic.com`. Além de reduzir a
cadeia de suprimentos, isso elimina o envio do IP do visitante a um
terceiro, que é um ponto sensível sob a LGPD.

**Saneamento de saída.** Todo texto dinâmico é inserido com
`textContent`. Não existe `innerHTML`, `eval`, `new Function`,
`document.write` nem execução dinâmica de código em nenhum arquivo.

**Validação de URL por esquema.** Qualquer valor de `config.js` que vá
para um atributo `href` passa por `new URL()` e por uma lista de
esquemas permitidos. `javascript:`, `data:` e `vbscript:` são
rejeitados e o link é neutralizado. O número de WhatsApp é reduzido a
dígitos, e o perfil do Instagram a caracteres alfanuméricos, antes de
entrarem em qualquer URL.

**Limites e limpeza de entrada.** Cada campo tem `maxlength` no HTML e
é truncado de novo no JavaScript antes de compor qualquer URL.
Caracteres de controle, de formatação (incluindo os de direção de
texto, usados em spoofing visual) e separadores de linha e parágrafo
são removidos.

**Antiabuso no formulário.** Três camadas: campo honeypot invisível,
rejeição de envios feitos em menos de três segundos após a carga e
intervalo mínimo de quinze segundos entre envios na mesma sessão.

**Mensagens de erro genéricas.** Falha de envio não expõe status HTTP,
corpo de resposta nem stack trace.

**Cabeçalhos de segurança** configurados em `netlify.toml` e
`vercel.json`: CSP, HSTS com `includeSubDomains` e `preload`,
`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy` negando câmera, microfone, geolocalização e
pagamento, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`,
`Cross-Origin-Embedder-Policy`, `X-DNS-Prefetch-Control` e
`X-Permitted-Cross-Domain-Policies`.

**Exposição de arquivos.** O workflow do GitHub Pages monta um pacote
com apenas os arquivos públicos. Documentação, configuração de deploy e
scripts de build não vão para o ar. Em Netlify e Vercel, o mesmo é
feito por regras de redirecionamento.

**CI com portão de segurança.** Antes de publicar, o workflow verifica
a sincronia da CSP e procura por padrões de segredo no código.

**Sem armazenamento no navegador.** Nenhum uso de `localStorage`,
`sessionStorage`, IndexedDB ou cookies. Nada do visitante fica no
dispositivo.

## Riscos residuais

**ALTO quando hospedado no GitHub Pages: ausência de cabeçalhos HTTP.**
O GitHub Pages não permite definir cabeçalhos de resposta. Nesse
ambiente valem apenas as diretivas que funcionam via `<meta>`, o que
deixa de fora `frame-ancestors`, `X-Frame-Options` e HSTS. A defesa
contra clickjacking passa a ser só o bloqueio por JavaScript em
`main.js`, que é reconhecidamente fraco e pode ser contornado com
`sandbox` no iframe. Para produção, prefira Netlify, Vercel ou
Cloudflare Pages, onde os cabeçalhos deste repositório são aplicados.

**MÉDIO: validação só no cliente.** O formulário, no modo padrão, não
passa por servidor: ele monta uma mensagem e abre o WhatsApp. Não há,
portanto, onde aplicar rate limiting ou validação confiável. Se você
configurar `endpointFormulario`, a validação e o controle de abuso
passam a ser responsabilidade daquele serviço. Nada do que é validado
aqui no navegador deve ser considerado garantia de segurança.

**MÉDIO: dependência do WhatsApp.** Ao enviar o formulário, os dados do
visitante seguem para a Meta Platforms. Isso está declarado na política
de privacidade e precisa continuar declarado.

**BAIXO: actions do GitHub fixadas por tag.** `actions/checkout@v4` e
similares apontam para uma tag mutável. Para ambiente de alta
exigência, troque cada tag pelo SHA do commit correspondente. Não fiz
essa troca porque exigiria fixar SHAs que não pude verificar nesta
auditoria.

**BAIXO: `preload` no HSTS.** O cabeçalho já declara `preload`, mas a
inclusão na lista exige submissão em hstspreload.org e torna o domínio
inteiro HTTPS-only de forma difícil de reverter. Só submeta quando o
domínio e todos os subdomínios estiverem definitivamente em HTTPS.

## Pendências de configuração externa

1. Forçar HTTPS e o redirecionamento de HTTP no painel da hospedagem.
   No GitHub Pages, a opção "Enforce HTTPS".
2. Publicar com domínio próprio e atualizar as URLs canônicas,
   Open Graph, `sitemap.xml`, `robots.txt` e `.well-known/security.txt`.
3. Preencher o e-mail real em `.well-known/security.txt`.
4. Se ativar `endpointFormulario`: usar somente HTTPS, acrescentar o
   domínio em `connect-src` dentro de `tools/gerar-csp.mjs`, rodar
   `node tools/gerar-csp.mjs` e confirmar que o serviço aplica rate
   limiting e proteção contra spam.
5. Nunca colocar chave de API, token ou senha em `js/config.js`. O
   arquivo é entregue ao navegador e é legível por qualquer visitante.

## Como rodar as verificações

```bash
# Conferir se a CSP está sincronizada com os scripts inline
node tools/gerar-csp.mjs --verificar

# Subir o site com os mesmos cabeçalhos do netlify.toml
node tools/servidor-teste.mjs 8080

# Rodar a bateria de testes de segurança (precisa do Playwright)
npx playwright install chromium
node tools/testes-seguranca.mjs
```

## Dependências

Zero dependências de runtime e zero dependências de build. Não há
`package.json`, `node_modules` nem lockfile, então não há superfície
para `npm audit`. As únicas ferramentas de desenvolvimento são o Node
(módulos nativos apenas) e, para os testes, o Playwright, que não é
publicado junto com o site.

## Reportar um problema

Use o canal descrito em `.well-known/security.txt`.
