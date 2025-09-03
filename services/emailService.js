// services/emailService.js
const nodemailer = require('nodemailer');

function makeTransport({ port, secure }) {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,                  // mail.tiagoagueda.pt
    port,                                         // 465 ou 587
    secure,                                       // 465->true, 587->false (STARTTLS)
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    // ==== robustez/diagnóstico ====
    family: 4,                    // força IPv4 (evita AAAA com rota marada)
    connectionTimeout: 10000,     // 10s
    greetingTimeout: 8000,
    socketTimeout: 15000,
    tls: {
      servername: process.env.EMAIL_HOST, // SNI correto
      rejectUnauthorized: false           // REMOVE quando tiveres cert OK
    },
    logger: true,  // temporário: ver logs SMTP no console
    debug: true    // temporário
  });
}

// transport principal -> usa as tuas variáveis (465/true neste momento)
let transporter = makeTransport({
  port: Number(process.env.EMAIL_PORT || 587),
  secure: (process.env.EMAIL_SECURE === 'true') || Number(process.env.EMAIL_PORT) === 465
});

async function sendWithFallback(mail) {
  try {
    return await transporter.sendMail(mail);
  } catch (e) {
    console.warn('[EMAIL] Falhou envio no transporte principal:', e.code || e.message);
    // Fallback 1: se primeira tentativa foi 465/TLS, tenta 587/STARTTLS
    if (Number(process.env.EMAIL_PORT) === 465 || process.env.EMAIL_SECURE === 'true') {
      try {
        const t587 = makeTransport({ port: 587, secure: false });
        console.warn('[EMAIL] A tentar fallback 587/STARTTLS...');
        return await t587.sendMail(mail);
      } catch (e2) {
        console.error('[EMAIL] Fallback 587 também falhou:', e2.code || e2.message);
        throw e2;
      }
    }
    // Fallback 2: se começaste em 587 e falhou, tenta 465
    try {
      const t465 = makeTransport({ port: 465, secure: true });
      console.warn('[EMAIL] A tentar fallback 465/TLS...');
      return await t465.sendMail(mail);
    } catch (e3) {
      console.error('[EMAIL] Fallback 465 também falhou:', e3.code || e3.message);
      throw e3;
    }
  }
}

async function sendFormEmail(to, patientId, patientName, formIds, slugMap) {
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
        <a href="${url}" style="text-decoration:none;color:#fff;background:#007bff;padding:10px 14px;border-radius:4px;display:inline-block">
          ${label}
        </a>
      </li>`;
  }).join('');

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
    <div style="background:#007bff;padding:20px;color:#fff;text-align:center">
      <h1 style="margin:0;font-size:24px">Hospital Santa Marta</h1>
    </div>
    <div style="padding:20px;background:#f9f9f9">
      <p style="font-size:16px;color:#333">Olá ${patientName || ''},</p>
      <p style="font-size:16px;color:#333">Clique nos botões abaixo para preencher os questionários de follow-up:</p>
      <ul style="list-style:none;padding:0">${listItems}</ul>
      <p style="font-size:14px;color:#555">Caso já tenha preenchido, ignore esta mensagem.</p>
    </div>
    <div style="background:#f1f1f1;padding:12px;text-align:center;font-size:12px;color:#777">
      <p style="margin:0">© ${new Date().getFullYear()} Hospital Santa Marta</p>
    </div>
  </div>`;

  console.log('[EMAIL] A enviar para', to, 'via', process.env.EMAIL_HOST, process.env.EMAIL_PORT, process.env.EMAIL_SECURE);
  const info = await sendWithFallback({
    from: `"Hospital Santa Marta" <${process.env.EMAIL_FROM}>`,
    to,
    subject: 'Formulários de Follow-up Disponíveis',
    html
  });
  console.log('[EMAIL] Enviado. messageId:', info.messageId);
}

module.exports = { sendFormEmail };
