require('dotenv').config();
const mongoose = require('mongoose');
const Patient = require('./Models/Patient');
const FollowUp = require('./Models/FollowUp');
const { sendFormEmail } = require('./services/emailService');

console.log('🚀 Início do script sendDailyFollowUps.js');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conexão à base de dados estabelecida'))
  .catch(err => {
    console.error('❌ Erro ao ligar à base de dados:', err);
    process.exit(1);
  });

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log(`📅 Data de hoje: ${today.toISOString()}`);

  const followUps = await FollowUp.find().populate('patient');
  console.log(`🔍 Total de follow-ups encontrados: ${followUps.length}`);

  for (const followUp of followUps) {
    const patient = followUp.patient;
    if (!patient?.email) {
      console.log('⏩ Paciente sem email, ignorado.');
      continue;
    }

    const todayForms = (followUp.questionnaires || []).filter(q =>
      !q.filled &&
      q.scheduledAt &&
      new Date(q.scheduledAt) <= today &&
      (!q.sentAt || !sameDay(new Date(q.sentAt), today)) &&
      (q.attempts || 0) < 4
    );

    console.log(`👤 ${patient.name} | ${patient.email} ⇢ ${todayForms.length} formulários para enviar hoje.`);

    if (todayForms.length > 0) {
      const formIds = todayForms.map(q => q.formId);
      const slugMap = Object.fromEntries(todayForms.map(q => [q.formId, q.slug]));

      try {
        await sendFormEmail(patient.email, patient._id, patient.name, formIds, slugMap);
        console.log(`✅ Email enviado para ${patient.email} com os formulários: ${formIds.join(', ')}`);
      } catch (e) {
        console.error(`❌ Falha ao enviar email para ${patient.email}:`, e);
        continue;
      }

      for (const q of followUp.questionnaires) {
        if (
          formIds.includes(q.formId) &&
          new Date(q.scheduledAt) <= today
        ) {
          q.sentAt = new Date();
          q.attempts = (q.attempts || 0) + 1;
        }
      }
      await followUp.save();
    }
  }

  await mongoose.disconnect();
  console.log('🔌 Ligação à base de dados encerrada');
  console.log('🏁 Fim do script sendDailyFollowUps.js');
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

main().catch(e => {
  console.error('❌ Erro inesperado no envio diário de follow-ups:', e);
  mongoose.disconnect();
});
