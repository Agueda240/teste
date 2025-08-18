require('dotenv').config();
const nodemailer = require('nodemailer');

// Variáveis definidas diretamente (ou você pode colocá-las no seu arquivo .env)
const EMAIL_HOST = "mail.tiagoagueda.pt";
const EMAIL_PORT = 465; // Porta 465 para conexão SSL
const EMAIL_SECURE = true; // Como a porta é 465, secure deve ser true
const EMAIL_USER = "tese@tiagoagueda.pt";
const EMAIL_PASS = "ao?trW9Zg5V";
const EMAIL_FROM = "tese@tiagoagueda.pt";

// Cria o transporter com a configuração correta
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_SECURE, // Usa o booleano diretamente
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  },
  tls: {
    // Se o certificado do servidor não for reconhecido, desabilite a verificação (somente para testes!)
    rejectUnauthorized: false
  }
});

// Verifica se a conexão SMTP foi estabelecida
transporter.verify((error, success) => {
  if (error) {
    console.error('Erro na configuração do SMTP:', error);
  } else {
    console.log('SMTP configurado corretamente!');
  }
});

const mailOptions = {
  from: `"Minha App" <${EMAIL_FROM}>`,
  to: 'agueda.tap@gmail.com',
  subject: 'Teste de envio de e-mail',
  html: '<p>Este é um teste de envio de e-mail usando o SMTP do seu domínio.</p>'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.error('Erro ao enviar e-mail:', error);
  }
  console.log('E-mail enviado com sucesso:', info.response);
});
