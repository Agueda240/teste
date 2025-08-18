const nodemailer = require('nodemailer');

/**
 * Envia um email com vários links de acesso aos formulários de follow-up.
 * Aplica styling inline para um layout mais apelativo.
 *
 * @param {string} to         – e-mail do paciente
 * @param {string} patientId  – ID do paciente (opcional para log/debug)
 * @param {string[]} formIds  – lista de formId
 * @param {Object} slugMap    – mapeamento { formId: slug }
 */
async function sendFormEmail(to, patientId, patientName, formIds, slugMap) {
  // Labels para cada formId
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

  // Configurar transportador
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false }
  });

  // Montar lista de links estilizada
  const listItems = formIds.map(formId => {
    const slug = slugMap[formId];
    const label = labels[formId] || formId;
    const url = `https://hospital-santa-marta.tiagoagueda.pt/followup/${slug}`;
    return `
      <li style="margin-bottom: 12px;">
        <a href="${url}" style="text-decoration: none; color: #ffffff; background-color: #007bff; padding: 10px 14px; border-radius: 4px; display: inline-block;">
          ${label}
        </a>
      </li>
    `;
  }).join('');

  // Corpo do email com container central
  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #007bff; padding: 20px; color: #ffffff; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Hospital Santa Marta</h1>
    </div>
    <div style="padding: 20px; background-color: #f9f9f9;">
      <p style="font-size: 16px; color: #333333;">Olá ${patientName || ''},</p>
      <p style="font-size: 16px; color: #333333;">Por favor, clique nos botões abaixo para preencher os questionários de follow-up:</p>
      <ul style="list-style: none; padding: 0;">
        ${listItems}
      </ul>
      <p style="font-size: 14px; color: #555555;">Caso já tenha preenchido, ignore esta mensagem.</p>
    </div>
    <div style="background-color: #f1f1f1; padding: 12px; text-align: center; font-size: 12px; color: #777777;">
      <p style="margin: 0;">© ${new Date().getFullYear()} Hospital Santa Marta</p>
    </div>
  </div>
  `;

  // Enviar email
  await transporter.sendMail({
    from: `"Hospital Santa Marta" <${process.env.EMAIL_FROM}>`,
    to,
    subject: 'Formulários de Follow-up Disponíveis',
    html
  });
}

async function sendPasswordSetupEmail(to, name, link) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

    const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #007bff; padding: 20px; color: #ffffff; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Hospital Santa Marta</h1>
    </div>
    <div style="padding: 20px; background-color: #f9f9f9;">
      <p style="font-size: 16px; color: #333333;">Olá ${name},</p>
      <p style="font-size: 16px; color: #333333;">Para definir a sua senha de acesso à plataforma, clique no botão abaixo:</p>
      <ul style="list-style: none; padding: 0;">
        <li style="margin-bottom: 12px;">
        <a href="${link}" style="text-decoration: none; color: #ffffff; background-color: #007bff; padding: 10px 14px; border-radius: 4px; display: inline-block;">
          Definir Senha
        </a>
      </li>
      </ul>
      <p style="font-size: 14px; color: #555555;">Este link é válido por 24 horas.</p>
    </div>
    <div style="background-color: #f1f1f1; padding: 12px; text-align: center; font-size: 12px; color: #777777;">
      <p style="margin: 0;">© ${new Date().getFullYear()} Hospital Santa Marta</p>
    </div>
  </div>
  `;



  await transporter.sendMail({
    from: `"Hospital Santa Marta" <${process.env.EMAIL_FROM}>`,
    to,
    subject: 'Definir senha de acesso',
    html
  });
}


module.exports = { sendFormEmail, sendPasswordSetupEmail };
