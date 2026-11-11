# Estética Capilar por Lia Santos

Landing page institucional de estética capilar (próteses, laces, perucas e mega hair).
Site estático, sem framework e sem build: HTML, CSS e JavaScript puros.

## Estrutura

```
.
├── index.html                    página principal
├── politica-de-privacidade.html  política LGPD (modelo base)
├── 404.html                      página de erro
├── css/styles.css                estilo único, com tokens da marca
├── js/config.js                  CONFIGURAÇÃO: telefone, endereço, redes
├── js/main.js                    menu mobile, formulário e aplicação da config
├── assets/img/                   logo, favicons e imagem social
├── robots.txt · sitemap.xml      SEO
├── site.webmanifest              ícone na tela inicial do celular
├── netlify.toml · vercel.json    deploy em Netlify ou Vercel
└── .github/workflows/            deploy automático no GitHub Pages
```

## Como configurar

Todo o conteúdo variável fica em um único arquivo: **`js/config.js`**.
Edite telefone, e-mail, endereço, Instagram, horário e CNPJ lá, e os valores
são aplicados automaticamente no cabeçalho, no hero, no rodapé, no botão
flutuante e no formulário.

```js
window.SITE = {
  whatsapp: "5511999999999",        // só números, com 55 na frente
  telefoneExibicao: "(11) 99999-9999",
  email: "contato@exemplo.com.br",
  instagram: "perfil",
  endereco: { rua: "...", bairro: "...", cidade: "...", uf: "SP", cep: "...", maps: "..." },
  horario: "Terça a sábado, das 9h às 18h",
  cnpj: "00.000.000/0001-00",
  endpointFormulario: ""            // vazio = formulário abre o WhatsApp
};
```

### Formulário de contato

Sem backend, por padrão. Com `endpointFormulario` vazio, o envio monta a
mensagem e abre o WhatsApp já preenchido. Para receber por e-mail, crie um
formulário gratuito em [Formspree](https://formspree.io) e cole a URL em
`endpointFormulario`.

## O que ainda precisa ser substituído

Os textos entre colchetes marcam o que depende de informação real:

- `index.html`: biografia da Lia, frase de abertura, três depoimentos reais,
  prazo de durabilidade praticado e informação de preço no FAQ.
- `assets/img/`: foto principal do hero (vertical 4:5), retrato da Lia (3:4)
  e três imagens de antes e depois (4:3). Publique somente com autorização
  de imagem assinada.
- `politica-de-privacidade.html`: data da última atualização.
- Domínio: trocar `esteticacapilarliasantos.com.br` nas tags canonical,
  Open Graph, `robots.txt`, `sitemap.xml` e nos dados estruturados do
  `index.html`.

## Rodar localmente

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Publicar

**GitHub Pages:** em Settings › Pages, escolha "GitHub Actions". O workflow
já incluído publica a cada push na branch `main`.

**Netlify ou Vercel:** conecte o repositório. Não há etapa de build,
o diretório raiz já é o site publicado.

## Características técnicas

- Sem dependências, sem bundler. Carrega apenas o CSS da página e as fontes do Google.
- Responsivo de 320px a telas largas, com menu mobile acessível.
- Acessibilidade: HTML semântico, link de pular para o conteúdo, foco visível,
  alvos de toque de no mínimo 48px, contraste de texto acima de 4.5:1 e
  suporte a `prefers-reduced-motion`.
- SEO: meta description, canonical, Open Graph, sitemap e dados estruturados
  Schema.org (HairSalon e FAQPage).
- Imagens em WebP com fallback PNG e carregamento preguiçoso.
- Campo honeypot contra envio automatizado no formulário.

## Licença

Código de uso exclusivo da Estética Capilar por Lia Santos.
Logo e identidade visual são propriedade da marca.
