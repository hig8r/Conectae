/* =====================================================================
   Estética Capilar por Lia Santos
   Script único: aplica a configuração, controla o menu mobile e o envio
   do formulário.

   Notas de segurança (ver SECURITY.md):
   - Todo texto é inserido com textContent. Não há innerHTML, eval,
     new Function, document.write nem execução dinâmica de código.
   - Toda URL vinda da configuração passa por validação de esquema antes
     de ir para um atributo href, o que bloqueia javascript: e data:.
   - Dados do usuário só entram em URL via encodeURIComponent e com
     tamanho limitado.
   - A validação feita aqui é de usabilidade e de redução de abuso.
     Validação com valor de segurança precisa ocorrer no serviço que
     recebe o formulário.
   ===================================================================== */

(function () {
  "use strict";

  var cfg = (typeof window.SITE === "object" && window.SITE !== null) ? window.SITE : {};

  /* Limites de tamanho aplicados antes de montar qualquer URL */
  var LIMITES = { nome: 80, telefone: 20, assunto: 60, mensagem: 600 };

  /* ---------- Utilidades de segurança ---------- */

  /* Remove caracteres de controle (Cc), de formatacao (Cf, inclusive os
     de direcao de texto usados em spoofing visual), e separadores de
     linha e paragrafo (Zl, Zp). Depois corta no limite definido. */
  function limpar(valor, limite) {
    return String(valor == null ? "" : valor)
      .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ")
      .trim()
      .slice(0, limite);
  }

  /* Só devolve a URL se ela usar um esquema da lista. Qualquer outra
     coisa (javascript:, data:, vbscript:, URL inválida) vira null. */
  function urlSegura(valor, esquemas) {
    if (!valor) return null;
    var url;
    try {
      url = new URL(String(valor), window.location.origin);
    } catch (e) {
      return null;
    }
    return esquemas.indexOf(url.protocol) === -1 ? null : url.href;
  }

  /* Telefone só com dígitos, no formato aceito pelo WhatsApp. */
  function somenteDigitos(valor) {
    return String(valor == null ? "" : valor).replace(/\D/g, "").slice(0, 15);
  }

  function linkZap(mensagem) {
    var numero = somenteDigitos(cfg.whatsapp);
    if (!numero) return null;
    var texto = encodeURIComponent(limpar(mensagem || cfg.mensagemPadrao || "", 900));
    return "https://wa.me/" + numero + (texto ? "?text=" + texto : "");
  }

  function enderecoCompleto() {
    var e = (typeof cfg.endereco === "object" && cfg.endereco !== null) ? cfg.endereco : {};
    var cidade = e.cidade ? e.cidade + (e.uf ? "/" + e.uf : "") : "";
    return [e.rua, e.bairro, cidade].filter(Boolean).join(" - ");
  }

  /* Define texto (nunca HTML) em todos os elementos do seletor. */
  function definirTexto(seletor, valor) {
    var itens = document.querySelectorAll(seletor);
    for (var i = 0; i < itens.length; i++) itens[i].textContent = valor;
  }

  /* Define href apenas se a URL passar na validação de esquema.
     Se não passar, o link é neutralizado em vez de receber valor sujo. */
  function definirLink(seletor, valor, esquemas) {
    var seguro = urlSegura(valor, esquemas || ["https:"]);
    var itens = document.querySelectorAll(seletor);
    for (var i = 0; i < itens.length; i++) {
      if (seguro) {
        itens[i].setAttribute("href", seguro);
      } else {
        itens[i].setAttribute("href", "#");
        itens[i].setAttribute("aria-disabled", "true");
      }
    }
  }

  /* ---------- 1. Aplica a configuração na página ---------- */
  function aplicarConfig() {
    definirLink('[data-site="whatsapp-link"]', linkZap(), ["https:"]);
    definirTexto('[data-site="telefone"]', limpar(cfg.telefoneExibicao, 24));
    definirTexto('[data-site="endereco"]', limpar(enderecoCompleto(), 160));
    definirTexto('[data-site="horario"]', limpar(cfg.horario, 80));
    definirTexto('[data-site="ano"]', String(new Date().getFullYear()));

    var email = limpar(cfg.email, 120);
    var emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
    definirTexto('[data-site="email"]', emailValido);
    definirLink('[data-site="email-link"]', emailValido ? "mailto:" + emailValido : "", ["mailto:"]);

    var cnpj = limpar(cfg.cnpj, 24);
    definirTexto('[data-site="cnpj"]', cnpj ? "CNPJ " + cnpj : "");

    /* Instagram: só o nome de usuário, nunca uma URL inteira da config */
    var perfil = limpar(cfg.instagram, 40).replace(/[^A-Za-z0-9._]/g, "");
    definirTexto('[data-site="instagram"]', perfil ? "@" + perfil : "");
    definirLink('[data-site="instagram-link"]', perfil ? "https://instagram.com/" + perfil : "", ["https:"]);

    definirLink('[data-site="maps-link"]', (cfg.endereco || {}).maps, ["https:"]);

    /* Bloco de telefone fixo: só aparece se estiver configurado */
    var blocos = document.querySelectorAll('[data-site="telefone-fixo-bloco"]');
    for (var i = 0; i < blocos.length; i++) {
      var numero = somenteDigitos(cfg.telefoneFixo);
      var alvo = blocos[i].querySelector('[data-site="telefone-fixo"]');
      if (numero && alvo) {
        alvo.textContent = limpar(cfg.telefoneFixo, 24);
        alvo.setAttribute("href", "tel:+" + numero);
      } else {
        blocos[i].remove();
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
      if (ev.target && ev.target.tagName === "A") alternar(false);
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") alternar(false);
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
    var botao = form.querySelector('button[type="submit"]');
    var rotuloBotao = botao ? botao.textContent : "";
    var abertoEm = Date.now();
    var ultimoEnvio = 0;

    function avisar(texto) {
      if (!retorno) return;
      retorno.textContent = texto;
      retorno.setAttribute("data-visivel", "true");
    }

    function bloquearBotao(bloqueado) {
      if (!botao) return;
      botao.disabled = bloqueado;
      botao.textContent = bloqueado ? "Enviando..." : rotuloBotao;
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;

      var dados = new FormData(form);

      /* Antiabuso 1: campo honeypot, invisível para pessoas. */
      if (limpar(dados.get("empresa"), 10) !== "") return;

      /* Antiabuso 2: envio em menos de 3 segundos indica automação. */
      if (Date.now() - abertoEm < 3000) {
        avisar("Confira os dados e tente novamente.");
        return;
      }

      /* Antiabuso 3: limite de um envio a cada 15 segundos por sessão.
         Isso é só conveniência. Rate limiting real precisa ser feito
         pelo serviço que recebe o formulário. */
      if (Date.now() - ultimoEnvio < 15000) {
        avisar("Aguarde alguns segundos antes de enviar de novo.");
        return;
      }
      ultimoEnvio = Date.now();

      var nome = limpar(dados.get("nome"), LIMITES.nome);
      var tel = limpar(dados.get("whatsapp"), LIMITES.telefone);
      var assunto = limpar(dados.get("assunto"), LIMITES.assunto);
      var msg = limpar(dados.get("mensagem"), LIMITES.mensagem);

      /* Envio por serviço externo, só se a URL for HTTPS válida.
         Lembre-se de liberar o domínio em connect-src na CSP. */
      var endpoint = urlSegura(cfg.endpointFormulario, ["https:"]);
      if (endpoint) {
        bloquearBotao(true);
        var corpo = new FormData();
        corpo.append("nome", nome);
        corpo.append("whatsapp", tel);
        corpo.append("assunto", assunto);
        corpo.append("mensagem", msg);

        fetch(endpoint, {
          method: "POST",
          body: corpo,
          mode: "cors",
          credentials: "omit",
          referrerPolicy: "no-referrer",
          headers: { Accept: "application/json" }
        })
          .then(function (resp) {
            if (!resp.ok) throw new Error("resposta nao ok");
            form.reset();
            abertoEm = Date.now();
            avisar("Recebemos seu contato. Retornamos em breve pelo WhatsApp.");
          })
          .catch(function () {
            /* Mensagem genérica de propósito: nenhum detalhe técnico,
               status HTTP ou stack trace é mostrado ao usuário. */
            avisar("Não foi possível enviar agora. Fale com a gente pelo WhatsApp.");
          })
          .then(function () {
            bloquearBotao(false);
          });
        return;
      }

      /* Sem endpoint: abre o WhatsApp com os dados já preenchidos. */
      var destino = linkZap(
        "Olá! Vim pelo site.\n" +
        "Nome: " + nome + "\n" +
        "WhatsApp: " + tel + "\n" +
        "Interesse: " + assunto +
        (msg ? "\nMensagem: " + msg : "")
      );

      if (!destino) {
        avisar("Canal de contato indisponível no momento. Tente pelo telefone.");
        return;
      }

      var janela = window.open(destino, "_blank", "noopener,noreferrer");
      if (!janela) {
        avisar("Libere a abertura de janelas ou chame direto no WhatsApp pelo número acima.");
      } else {
        avisar("Abrimos o WhatsApp com seus dados. Se não abrir, chame no número acima.");
      }
    });
  }

  /* ---------- 4. Defesa adicional contra clickjacking ----------
     A proteção efetiva vem dos cabeçalhos frame-ancestors e
     X-Frame-Options, que exigem controle do servidor. Em hospedagem
     sem cabeçalhos (GitHub Pages), este bloco é a única barreira, e
     sabidamente é uma barreira fraca. Ver SECURITY.md. */
  function protegerContraEnquadramento() {
    try {
      if (window.top !== window.self) {
        window.top.location = window.self.location.href;
      }
    } catch (e) {
      document.documentElement.style.display = "none";
    }
  }

  function iniciar() {
    protegerContraEnquadramento();
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
