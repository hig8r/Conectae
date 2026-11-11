/* =====================================================================
   CONFIGURAÇÃO DO SITE
   Edite apenas este arquivo para trocar telefone, endereço e redes.
   O script main.js aplica estes valores em todos os pontos da página.
   ===================================================================== */

window.SITE = {
  /* Telefone no formato internacional, só números. Ex.: 5511968700937 */
  whatsapp: "5511999999999",

  /* Como o telefone aparece escrito na página */
  telefoneExibicao: "(11) 99999-9999",

  /* Telefone fixo para ligação. Deixe vazio ("") para esconder */
  telefoneFixo: "",

  email: "contato@esteticacapilarliasantos.com.br",

  instagram: "esteticacapilarliasantos",

  endereco: {
    rua: "Rua Exemplo, 000",
    bairro: "Bairro",
    cidade: "São Paulo",
    uf: "SP",
    cep: "00000-000",
    /* Link do Google Maps do estúdio */
    maps: "https://maps.google.com/?q=Rua+Exemplo+000+Sao+Paulo"
  },

  horario: "Terça a sábado, das 9h às 18h",

  cnpj: "00.000.000/0001-00",

  /* Mensagem que já vem escrita ao abrir o WhatsApp */
  mensagemPadrao: "Olá! Vim pelo site e gostaria de agendar uma avaliação.",

  /* Endpoint do formulário.
     Deixe vazio ("") para o formulário abrir o WhatsApp com os dados preenchidos.
     Para receber por e-mail, crie um formulário em formspree.io ou similar
     e cole a URL aqui. Ex.: "https://formspree.io/f/xxxxxxx" */
  endpointFormulario: ""
};
