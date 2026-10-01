"use strict";

const CONFIG_ID = "rastracking-nod-4.8.5-config";
const INFO_ORIGIN = "https://info.rastrack.app";
const RUNTIME_URL = `${INFO_ORIGIN}/rastracking-info.js`;
const INSTALL_SNIPPET = /^\s*<script\s+id="rastracking-nod-4\.8\.5-config"\s+type="application\/json"\s*>([\s\S]*?)<\/script>\s*<script\s+src="https:\/\/info\.rastrack\.app\/rastracking-info\.js"\s+defer\s*><\/script>\s*$/;
const CONFIG_KEYS = ["collection_token", "endpoint", "schema_version", "source_public_id"];

function parseInstallSnippet(input) {
  const match = INSTALL_SNIPPET.exec(input);
  if (!match) {
    throw new Error("O código de instalação precisa conter somente os dois scripts oficiais.");
  }

  let config;
  try {
    config = JSON.parse(match[1]);
  } catch {
    throw new Error("O JSON da configuração é inválido.");
  }

  if (config === null || typeof config !== "object" || Array.isArray(config) ||
      Object.keys(config).sort().join(",") !== CONFIG_KEYS.join(",")) {
    throw new Error("A configuração precisa ter exatamente as quatro chaves oficiais.");
  }
  if (config.schema_version !== 1 ||
      typeof config.source_public_id !== "string" ||
      !/^[A-Za-z0-9_-]{8,128}$/.test(config.source_public_id) ||
      typeof config.collection_token !== "string" ||
      config.collection_token.trim().length < 8 ||
      config.collection_token.trim().length > 512 ||
      config.endpoint !== INFO_ORIGIN) {
    throw new Error("Os valores da configuração não correspondem à instalação de produção.");
  }

  return config;
}

if (typeof document !== "undefined") {
  const form = document.getElementById("install-form");
  const textarea = document.getElementById("install-snippet");
  const submitButton = document.getElementById("load-script");
  const status = document.getElementById("status");
  const resendButton = document.getElementById("resend-page-view");
  const resendStatus = document.getElementById("resend-status");
  let started = false;

  resendButton.addEventListener("click", async () => {
    if (resendButton.disabled) return;
    resendButton.disabled = true;
    resendStatus.hidden = false;
    resendStatus.textContent = "Enviando PageView…";
    resendStatus.dataset.state = "pending";
    let accepted = false;
    try {
      accepted = (await window.rastracking_info.forward("rastracking_page_view")) === true;
    } catch {
      accepted = false;
    }
    resendStatus.textContent = accepted
      ? "Envio aceito. Confirme o evento salvo no RastrackDash Info."
      : "Envio não aceito. Confira a conexão e tente novamente.";
    resendStatus.dataset.state = accepted ? "loaded" : "error";
    resendButton.disabled = false;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (started) return;

    const pasted = textarea.value;
    textarea.value = "";

    let config;
    try {
      config = parseInstallSnippet(pasted);
    } catch (error) {
      status.textContent = error.message;
      status.dataset.state = "error";
      textarea.focus();
      return;
    }

    started = true;
    submitButton.disabled = true;
    status.textContent = "Carregando o script de coleta…";
    status.dataset.state = "pending";

    const configScript = document.createElement("script");
    configScript.id = CONFIG_ID;
    configScript.type = "application/json";
    configScript.textContent = JSON.stringify(config);
    document.head.append(configScript);

    const runtimeScript = document.createElement("script");
    runtimeScript.src = RUNTIME_URL;
    runtimeScript.async = false;
    runtimeScript.addEventListener("load", () => {
      status.textContent = "Script carregado. Confirme a coleta no RastrackDash Info.";
      status.dataset.state = "loaded";
      resendButton.hidden = !window.rastracking_info || typeof window.rastracking_info.forward !== "function";
    });
    runtimeScript.addEventListener("error", () => {
      status.textContent = "O script não carregou. Confira a conexão e recarregue a página para tentar novamente.";
      status.dataset.state = "error";
      configScript.remove();
      runtimeScript.remove();
    });
    document.head.append(runtimeScript);
  });
}
