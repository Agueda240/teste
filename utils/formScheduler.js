// utils/formScheduler.js

// Importação dinâmica do nanoid para compatibilidade com CommonJS
const nanoid = async (size = 8) => {
  const mod = await import('nanoid');
  return mod.nanoid(size);
};

/**
 * Agenda os envios dos questionários e cria os objetos no FollowUp.
 * 
 * @param {Object} patient
 * @param {Object} followUp
 */
async function scheduleFollowUpEmails(patient, followUp) {
  if (!patient.email) {
    console.log('Email do paciente não fornecido; nenhum formulário agendado.');
    return;
  }

  const surgery = new Date(followUp.surgeryDate);
  const now = new Date();

  const etapas = [
    { formId: 'follow-up_preop',   date: now },
    { formId: 'eq5_preop',         date: now },
    { formId: 'follow-up_3dias',   date: new Date(surgery.getTime() + 3 * 24 * 60 * 60 * 1000) },
    { formId: 'follow-up_1mes',    date: new Date(surgery.getTime() + 30 * 24 * 60 * 60 * 1000) },
    { formId: 'follow-up_3meses',  date: new Date(surgery.getTime() + 90 * 24 * 60 * 60 * 1000) },
    { formId: 'eq5_3meses',        date: new Date(surgery.getTime() + 90 * 24 * 60 * 60 * 1000) },
    { formId: 'follow-up_6meses',  date: new Date(surgery.getTime() + 180 * 24 * 60 * 60 * 1000) },
    { formId: 'follow-up_1ano',    date: new Date(surgery.getTime() + 365 * 24 * 60 * 60 * 1000) },
    { formId: 'eq5_1ano',          date: new Date(surgery.getTime() + 365 * 24 * 60 * 60 * 1000) },
  ];

  const formIdsExistentes = new Set((followUp.questionnaires || []).map(q => q.formId));
  const novosQuestionarios = [];

  for (const etapa of etapas) {
    if (!formIdsExistentes.has(etapa.formId)) {
      const q = {
        formId: etapa.formId,
        slug: await nanoid(8),
        scheduledAt: etapa.date,
        filled: false,
        attempts: 0,
        answers: []
      };
      followUp.questionnaires = followUp.questionnaires || [];
      followUp.questionnaires.push(q);
      novosQuestionarios.push(q);
    }
  }

  await followUp.save(); // só guarda os dados no documento FollowUp
}

module.exports = { scheduleFollowUpEmails };
