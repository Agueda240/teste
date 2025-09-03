// services/emailService.js
// Envio por API (Resend) — evita bloqueios SMTP e melhora entregabilidade

const { Resend } = require('resend');

// 🔑 COLOCA A TUA CHAVE AQUI (outra boa prática é usar variável de ambiente)
const RESEND_API_KEY = 're_N8VMEPwv_7LPUtzKmVvuvdvJSY2FMkxsh';

// Remetentes (escolhe um)
// - Se já verificaste o domínio no Resend, usa o VERIFICADO.
// - Caso contrário, usa o FALLBACK (funciona já).
const FROM_VERIFIED = 'Hospital Santa Marta <noreply@tiagoagueda.pt>';
const FROM_FALLBACK = 'Hospital Santa Marta <onboarding@resend.dev>';

// Usa o FALLBACK por defeito para começar a enviar já
const FROM = FROM_FALLBACK;

const resend = new Resend(RESEND_API_KEY);

// ————————————————————————————————————————————————————————————————
// HTML builders (mantêm o teu design)
// ————————————————————————————————————————————————————————————————
function buildFollowupHtml(patientName, formIds, slugMap) {
  const labels = {
    'follow-up_preop':  'Follow-up pré-operatório',
    'eq5_preop':        'EQ-5D pré-operatório',
    'follow-up_3dias':  'Follow-up 3 dias pós-cirurgia',
    'follow-up_1mes':   'Follow-up 1 mês pós-cirurgia',
    'follow-up_3meses': 'Follow-up 3 meses pós-cirurgia',
    'eq5_3meses':       'EQ-5D 3 meses pós-cirurgia',
    'follow-up_6meses': 'Follow-up 6 meses pós-cirurgia',
    'follow-up_1ano':   'Follow-up 1 ano pós-cirurgia',
    'eq5_1ano':         'EQ-5D 1 ano pós-cirurgia'
  };

  const listItems = formIds.map(formId => {
    const slug = slugMap[formId];
    const label = labels[formId] || formId;
    const url = `https://hospital-santa-marta.tiagoagueda.pt/followup/${slug}`;
    return `
      <li style="margin-bottom:12px">
        <a href="${url}" style="text-decoration:none;color:#ffffff;background-color:#007bff;padding:10px 14px;border-radius:4px;display:inline-block">
          ${label}
        </a>
      </li>`;
  }).join('');

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
    <div style="background-color:#007bff;padding:20px;color:#ffffff;text-align:center">
      <h1 style="margin:0;font-size:24px">Hospital Santa Marta</h1>
    </div>
    <div style="padding:20px;background-color:#f9f9f9">
      <p style="font-size:16px;color:#333333">Olá ${patientName || ''},</p>
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
      <p style="font-size:16px;color:#333333">Olá ${name || ''},</p>
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

// ————————————————————————————————————————————————————————————————
// Funções públicas (mesma assinatura que tinhas)
// ————————————————————————————————————————————————————————————————
async function sendFormEmail(to, patientId, patientName, formIds, slugMap) {
  const html = buildFollowupHtml(patientName, formIds, slugMap);

  const result = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Formulários de Follow-up Disponíveis',
    html
  });

  console.log('[EMAIL/API] Follow-up enviado:', result?.id || result);
}

async function sendPasswordSetupEmail(to, name, link) {
  const html = buildPasswordHtml(name, link);

  const result = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Definir senha de acesso',
    html
  });

  console.log('[EMAIL/API] Password setup enviado:', result?.id || result);
}

module.exports = { sendFormEmail, sendPasswordSetupEmail };
