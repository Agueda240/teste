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

/** Janela de hoje em UTC [00:00, 23:59:59.999] */
function todayWindowUTC(now = new Date()) {
  const start = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0
  ));
  const end = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999
  ));
  return { start, end };
}

async function main() {
  const { start: startUTC, end: endUTC } = todayWindowUTC();
  console.log(`📅 Janela de hoje (UTC): ${startUTC.toISOString()} → ${endUTC.toISOString()}`);

  // Apenas follow-ups ativos
  const followUps = await FollowUp.find({ status: 'ativo' }).populate('patient');
  console.log(`🔍 Total de follow-ups encontrados: ${followUps.length}`);

  for (const followUp of followUps) {
    const patient = followUp.patient;
    if (!patient?.email) {
      console.log('⏩ Paciente sem email, ignorado.');
      continue;
    }

    // === LÓGICA CORRIGIDA: devidos ATÉ HOJE e nunca enviados hoje ===
    const todayForms = (followUp.questionnaires || []).filter(q => {
      if (!q) return false;
      if (q.filled === true) return false;
      if (!q.scheduledAt) return false;

      const sched = new Date(q.scheduledAt);
      const devidoAteHoje = sched <= endUTC;

      const sent = q.sentAt ? new Date(q.sentAt) : null;
      const podeReenviarHoje = !sent || sent < startUTC;

      const tentativasOK = (q.attempts || 0) < 4;
      const naoExpirado = q.estado ? q.estado !== 'expirado' : true;

      return devidoAteHoje && podeReenviarHoje && tentativasOK && naoExpirado;
    });

    console.log(`👤 ${patient.name} | ${patient.email} ⇢ ${todayForms.length} formulário(s) para enviar hoje.`);

    if (todayForms.length === 0) continue;

    const formIds = todayForms.map(q => q.formId);
    const slugMap = Object.fromEntries(todayForms.map(q => [q.formId, q.slug]));

    try {
      await sendFormEmail(patient.email, patient._id, patient.name, formIds, slugMap);
      console.log(`✅ Email enviado para ${patient.email} com os formulários: ${formIds.join(', ')}`);
    } catch (e) {
      console.error(`❌ Falha ao enviar email para ${patient.email}:`, e);
      continue; // não marca como enviado se o envio falhar
    }

    // Marca envio (sentAt=agora, updatedAt=agora, attempts++)
    const now = new Date();
    for (const q of followUp.questionnaires) {
      if (!q || !q.scheduledAt) continue;

      const sched = new Date(q.scheduledAt);
      const devidoAteHoje = sched <= endUTC;

      if (devidoAteHoje && formIds.includes(q.formId)) {
        q.sentAt = now;
        q.updatedAt = now;
        q.attempts = (q.attempts || 0) + 1;
      }
    }

    try {
      await followUp.save();
    } catch (e) {
      console.error(`⚠️ Falha ao persistir estado pós-envio para followUp ${followUp._id}:`, e);
    }
  }

  await mongoose.disconnect();
  console.log('🔌 Ligação à base de dados encerrada');
  console.log('🏁 Fim do script sendDailyFollowUps.js');
}

main().catch(e => {
  console.error('❌ Erro inesperado no envio diário de follow-ups:', e);
  mongoose.disconnect();
});
