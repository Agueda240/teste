// services/emailService.js
// Envio via SendGrid API (HTTP) — funciona no Railway sem bloqueios SMTP

const sgMail = require("@sendgrid/mail");

// 🔑 Usa a tua API Key do SendGrid
sgMail.setApiKey("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");

// Remetente autenticado
const FROM = { email: "tese@tiagoagueda.pt", name: "Hospital Santa Marta" };

// ————————————————————————————————————————————————
// HTML builders
// ————————————————————————————————————————————————
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

  const listItems = formIds
    .map((formId) => {
      const slug = slugMap[formId];
      const label = labels[formId] || formId;
      const url = `https://hospital-santa-marta.tiagoagueda.pt/followup/${slug}`;
      return `
        <li style="margin-bottom:12px">
          <a href="${url}" style="text-decoration:none;color:#ffffff;background-color:#007bff;padding:10px 14px;border-radius:4px;display:inline-block">
            ${label}
          </a>
        </li>`;
    })
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
      <div style="background-color:#007bff;padding:20px;color:#ffffff;text-align:center">
        <h1 style="margin:0;font-size:24px">Hospital Santa Marta</h1>
      </div>
      <div style="padding:20px;background-color:#f9f9f9">
        <p style="font-size:16px;color:#333333">Olá ${patientName || ""},</p>
        <p style="font-size:16px;color:#333333">Por favor, clique nos botões abaixo para preencher os questionários de follow-up:</p>
        <ul style="list-style:none;padding:0">${listItems}</ul>
        <p style="font-size:14px;color:#555555">Caso já tenha preenchido, ignore esta mensagem.</p>
      </div>
      <div style="background-color:#f1f1f1;padding:12px;text-align:center;font-size:12px;color:#777777">
        <p style="margin:0">© ${new Date().getFullYear()} Hospital Santa Marta</p>
      </div>
    </div>`;
}

function buildPasswordHtml(name, link) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
      <div style="background-color:#007bff;padding:20px;color:#ffffff;text-align:center">
        <h1 style="margin:0;font-size:24px">Hospital Santa Marta</h1>
      </div>
      <div style="padding:20px;background-color:#f9f9f9">
        <p style="font-size:16px;color:#333333">Olá ${name || ""},</p>
        <p style="font-size:16px;color:#333333">Para definir a sua senha de acesso à plataforma, clique no botão abaixo:</p>
        <ul style="list-style:none;padding:0">
          <li style="margin-bottom:12px">
            <a href="${link}" style="text-decoration:none;color:#ffffff;background-color:#007bff;padding:10px 14px;border-radius:4px;display:inline-block">
              Definir Senha
            </a>
          </li>
        </ul>
        <p style="font-size:14px;color:#555555">Este link é válido por 24 horas.</p>
      </div>
      <div style="background-color:#f1f1f1;padding:12px;text-align:center;font-size:12px;color:#777777">
        <p style="margin:0">© ${new Date().getFullYear()} Hospital Santa Marta</p>
      </div>
    </div>`;
}

// ————————————————————————————————————————————————
// Funções públicas
// ————————————————————————————————————————————————
async function sendFormEmail(to, patientId, patientName, formIds, slugMap) {
  const html = buildFollowupHtml(patientName, formIds, slugMap);

  const msg = {
    from: FROM,
    to,
    subject: "Formulários de Follow-up Disponíveis",
    html,
  };

  const result = await sgMail.send(msg);
  console.log("[EMAIL/SENDGRID] Follow-up enviado:", result[0].statusCode);
  return result;
}

async function sendPasswordSetupEmail(to, name, link) {
  const html = buildPasswordHtml(name, link);

  const msg = {
    from: FROM,
    to,
    subject: "Definir senha de acesso",
    html,
  };

  const result = await sgMail.send(msg);
  console.log("[EMAIL/SENDGRID] Password setup enviado:", result[0].statusCode);
  return result;
}

module.exports = { sendFormEmail, sendPasswordSetupEmail };
