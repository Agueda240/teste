// services/emailService.js
// Envio via Brevo API oficial (sib-api-v3-sdk)

const SibApiV3Sdk = require('sib-api-v3-sdk');

// 🔑 API Key v3 da Brevo
const BREVO_API_KEY = "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";

// Configurar cliente
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Remetente (usa o login do Brevo enquanto não verificares domínio)
const FROM = { email: "962924001@smtp-brevo.com", name: "Hospital Santa Marta" };

// ————————————————————————————————————————————————————————————————
function buildFollowupHtml(patientName, formIds, slugMap) {
  const labels = {
    "follow-up_preop": "Follow-up pré-operatório",
    "eq5_preop": "EQ-5D pré-operatório",
    "follow-up_3dias": "Follow-up 3 dias pós-cirurgia",
    "follow-up_1mes": "Follow-up 1 mês pós-cirurgia",
    "follow-up_3meses": "Follow-up 3 meses pós-cirurgia",
    "eq5_3meses": "EQ-5D 3 meses pós-cirurgia",
    "follow-up_6meses": "Follow-up 6 meses pós-cirurgia",
    "follow-up_1ano": "Follow-up 1 ano pós-cirurgia",
    "eq5_1ano": "EQ-5D 1 ano pós-cirurgia",
  };

  const listItems = formIds.map(formId => {
    const slug = slugMap[formId];
    const label = labels[formId] || formId;
    const url = `https://hospital-santa-marta.tiagoagueda.pt/followup/${slug}`;
    return `<li><a href="${url}" style="background:#007bff;color:#fff;padding:10px 14px;border-radius:4px;text-decoration:none">${label}</a></li>`;
  }).join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Olá ${patientName || ""},</h2>
      <p>Por favor, clique nos botões abaixo para preencher os questionários:</p>
      <ul style="list-style:none;padding:0">${listItems}</ul>
    </div>`;
}

function buildPasswordHtml(name, link) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Olá ${name || ""},</h2>
      <p>Para definir a sua senha de acesso à plataforma, clique abaixo:</p>
      <a href="${link}" style="background:#007bff;color:#fff;padding:10px 14px;border-radius:4px;text-decoration:none">Definir Senha</a>
    </div>`;
}

// ————————————————————————————————————————————————————————————————
async function sendFormEmail(to, patientId, patientName, formIds, slugMap) {
  const html = buildFollowupHtml(patientName, formIds, slugMap);

  const sendSmtpEmail = {
    sender: FROM,
    to: [{ email: to, name: patientName }],
    subject: "Formulários de Follow-up Disponíveis",
    htmlContent: html,
  };

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("[EMAIL/BREVO API] Follow-up enviado:", data.messageId || data);
    return data;
  } catch (error) {
    console.error("[EMAIL/BREVO API] Erro no envio Follow-up:", error.response?.body || error);
    throw error;
  }
}

async function sendPasswordSetupEmail(to, name, link) {
  const html = buildPasswordHtml(name, link);

  const sendSmtpEmail = {
    sender: FROM,
    to: [{ email: to, name }],
    subject: "Definir senha de acesso",
    htmlContent: html,
  };

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("[EMAIL/BREVO API] Password enviado:", data.messageId || data);
    return data;
  } catch (error) {
    console.error("[EMAIL/BREVO API] Erro no envio Password:", error.response?.body || error);
    throw error;
  }
}

module.exports = { sendFormEmail, sendPasswordSetupEmail };
