/* =====================================================================
   Estética Capilar por Lia Santos
   Script único: aplica a configuração, controla o menu mobile,
   o envio do formulário e pequenos ajustes de interface.
   ===================================================================== */

(function () {
  "use strict";

  var cfg = window.SITE || {};

  /* ---------- Utilidades ---------- */
  function linkZap(mensagem) {
    var texto = encodeURIComponent(mensagem || cfg.mensagemPadrao || "");
    return "https://wa.me/" + (cfg.whatsapp || "") + (texto ? "?text=" + texto : "");
  }

  function enderecoCompleto() {
    var e = cfg.endereco || {};
    var partes = [e.rua, e.bairro, (e.cidade ? e.cidade + "/" + (e.uf || "") : "")];
    return partes.filter(Boolean).join(" - ");
  }

  function preencher(seletor, valor, atributo) {
    var itens = document.querySelectorAll(seletor);
    for (var i = 0; i < itens.length; i++) {
      if (atributo) {
        itens[i].setAttribute(atributo, valor);
      } else {
        itens[i].textContent = valor;
      }
    }
  }

  /* ---------- 1. Aplica a configuração na página ---------- */
  function aplicarConfig() {
    preencher('[data-site="whatsapp-link"]', linkZap(), "href");
    preencher('[data-site="telefone"]', cfg.telefoneExibicao || "");
    preencher('[data-site="email"]', cfg.email || "");
    preencher('[data-site="email-link"]', "mailto:" + (cfg.email || ""), "href");
    preencher('[data-site="endereco"]', enderecoCompleto());
    preencher('[data-site="maps-link"]', (cfg.endereco && cfg.endereco.maps) || "#", "href");
    preencher('[data-site="horario"]', cfg.horario || "");
    preencher('[data-site="cnpj"]', cfg.cnpj ? "CNPJ " + cfg.cnpj : "");
    preencher('[data-site="ano"]', String(new Date().getFullYear()));

    var insta = cfg.instagram || "";
    preencher('[data-site="instagram"]', insta ? "@" + insta : "");
    preencher('[data-site="instagram-link"]', "https://instagram.com/" + insta, "href");

    var fixo = document.querySelectorAll('[data-site="telefone-fixo-bloco"]');
    for (var i = 0; i < fixo.length; i++) {
      if (cfg.telefoneFixo) {
        var alvo = fixo[i].querySelector('[data-site="telefone-fixo"]');
        if (alvo) {
          alvo.textContent = cfg.telefoneFixo;
          alvo.setAttribute("href", "tel:" + cfg.telefoneFixo.replace(/\D/g, ""));
        }
      } else {
        fixo[i].remove();
      }
    }
  }

  /* ---------- 2. Menu mobile ---------- */
  function iniciarMenu() {
    var botao = document.querySelector(".menu-botao");
    var menu = document.getElementById("menu-principal");
    if (!botao || !menu) return;

    function alternar(abrir) {
      menu.setAttribute("data-aberto", abrir ? "true" : "false");
      botao.setAttribute("aria-expanded", abrir ? "true" : "false");
    }

    botao.addEventListener("click", function () {
      alternar(menu.getAttribute("data-aberto") !== "true");
    });

    menu.addEventListener("click", function (ev) {
      if (ev.target.tagName === "A") alternar(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) alternar(false);
    });
  }

  /* ---------- 3. Formulário ---------- */
  function iniciarFormulario() {
    var form = document.getElementById("form-contato");
    if (!form) return;
    var retorno = form.querySelector(".formulario__retorno");

    function avisar(texto) {
      if (!retorno) return;
      retorno.textContent = texto;
      retorno.setAttribute("data-visivel", "true");
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;

      var dados = new FormData(form);
      var nome = (dados.get("nome") || "").toString().trim();
      var tel = (dados.get("whatsapp") || "").toString().trim();
      var assunto = (dados.get("assunto") || "").toString();
      var msg = (dados.get("mensagem") || "").toString().trim();

      /* Honeypot simples contra robôs */
      if ((dados.get("empresa") || "").toString() !== "") return;

      if (cfg.endpointFormulario) {
        var botao = form.querySelector('button[type="submit"]');
        if (botao) { botao.disabled = true; botao.textContent = "Enviando..."; }

        fetch(cfg.endpointFormulario, {
          method: "POST",
          body: dados,
          headers: { Accept: "application/json" }
        })
          .then(function (resp) {
            if (!resp.ok) throw new Error("falha");
            form.reset();
            avisar("Recebemos seu contato. Retornamos em breve pelo WhatsApp.");
          })
          .catch(function () {
            avisar("Não foi possível enviar agora. Fale com a gente pelo WhatsApp.");
          })
          .finally(function () {
            if (botao) { botao.disabled = false; botao.textContent = "Quero agendar minha avaliação"; }
          });
        return;
      }

      /* Sem endpoint configurado: abre o WhatsApp com os dados preenchidos */
      var texto =
        "Olá! Vim pelo site.\n" +
        "Nome: " + nome + "\n" +
        "WhatsApp: " + tel + "\n" +
        "Interesse: " + assunto +
        (msg ? "\nMensagem: " + msg : "");

      window.open(linkZap(texto), "_blank", "noopener");
      avisar("Abrimos o WhatsApp com seus dados. Se não abrir, chame no número acima.");
    });
  }

  /* ---------- 4. Início ---------- */
  function iniciar() {
    aplicarConfig();
    iniciarMenu();
    iniciarFormulario();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
