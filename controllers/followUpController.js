// controllers/followUpControllerfollowUpController.js
const FollowUp = require('../Models/FollowUp');
const Patient = require('../Models/Patient');
const { scheduleFollowUpEmails } = require('../utils/formScheduler');

// Criar novo acompanhamento
exports.createFollowUp = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { surgeryDate, surgeryType, medications } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Paciente não encontrado.' });

    const { nanoid } = await import('nanoid');
    const { sendFormEmail } = require('../services/emailService');
    const { scheduleFollowUpEmails } = require('../utils/formScheduler');

    function addDays(date, days) {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    }
    function addMonths(date, months) {
      const d = new Date(date);
      d.setMonth(d.getMonth() + months);
      return d;
    }
    function addYears(date, years) {
      const d = new Date(date);
      d.setFullYear(d.getFullYear() + years);
      return d;
    }

    const surgery = new Date(surgeryDate);
    const now = new Date();

    const questionnaires = [
      { formId: 'follow-up_preop',   scheduledAt: now,                   slug: nanoid(8) },
      { formId: 'eq5_preop',         scheduledAt: now,                   slug: nanoid(8) },
      { formId: 'follow-up_3dias',   scheduledAt: addDays(surgery, 3),   slug: nanoid(8) },
      { formId: 'follow-up_1mes',    scheduledAt: addMonths(surgery, 1), slug: nanoid(8) },
      { formId: 'follow-up_3meses',  scheduledAt: addMonths(surgery, 3), slug: nanoid(8) },
      { formId: 'eq5_3meses',        scheduledAt: addMonths(surgery, 3), slug: nanoid(8) },
      { formId: 'follow-up_6meses',  scheduledAt: addMonths(surgery, 6), slug: nanoid(8) },
      { formId: 'follow-up_1ano',    scheduledAt: addYears(surgery, 1),  slug: nanoid(8) },
      { formId: 'eq5_1ano',          scheduledAt: addYears(surgery, 1),  slug: nanoid(8) }
    ];

    const followUp = new FollowUp({
      patient: patientId,
      doctor: req.user.id,
      surgeryDate,
      surgeryType,
      medications,
      questionnaires
    });

    await followUp.save();

    // Enviar formulários agendados para hoje ou antes
    const todayForms = followUp.questionnaires.filter(q =>
      !q.filled &&
      q.scheduledAt <= now &&
      (!q.sentAt || q.sentAt < q.scheduledAt)
    );

    if (todayForms.length > 0 && patient.email) {
      const formIds = todayForms.map(q => q.formId);
      const slugMap = Object.fromEntries(todayForms.map(q => [q.formId, q.slug]));

      try {
        await sendFormEmail(patient.email, patient._id, patient.name, formIds, slugMap);
        todayForms.forEach(q => q.sentAt = new Date());
        await followUp.save();
        console.log(`📩 Email pré-operatório enviado para ${patient.email}`);
      } catch (e) {
        console.error(`❌ Erro ao enviar email pré-operatório para ${patient.email}:`, e);
      }
    }

    await scheduleFollowUpEmails(patient, followUp);

    res.status(201).json(followUp);

  } catch (err) {
    console.error('Erro em createFollowUp:', err);
    res.status(400).json({ message: err.message });
  }
};






// Obter todos os acompanhamentos de um paciente
exports.getAllFollowUps = async (req, res) => {
  try {
    const { patientId } = req.params;
    const followUps = await FollowUp.find({ patient: patientId });
    res.status(200).json(followUps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Obter todos os acompanhamentos do sistema (para o dashboard)
exports.getAllFollowUpsGlobal = async (req, res) => {
  try {
    const followUps = await FollowUp.find().populate('patient');
    res.status(200).json(followUps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Obter um acompanhamento específico
exports.getFollowUpById = async (req, res) => {
  res.status(200).json(req.followUp);
};


// Atualizar um acompanhamento
exports.updateFollowUp = async (req, res) => {
  try {
    const followUp = req.followUp;
    if (followUp.patient.toString() !== req.params.patientId) {
      return res.status(404).json({ message: 'Acompanhamento não pertence ao paciente indicado.' });
    }

    Object.assign(followUp, req.body);
    await followUp.save();
    res.status(200).json(followUp);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};



// Eliminar um acompanhamento
exports.deleteFollowUp = async (req, res) => {
  try {
    await req.followUp.deleteOne();
    res.status(200).json({ message: 'Acompanhamento eliminado com sucesso' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ------------------- QUESTIONÁRIOS -------------------

// Adicionar novo questionário
exports.addQuestionnaire = async (req, res) => {
  try {
    const { formId, answers } = req.body;
    const q = new Questionnaire({ formId, answers });
    await q.save();
    return res.status(201).json(q);
  } catch (err) {
    console.error('Erro em addQuestionnaire ⇢', err);
    return res.status(400).json({ message: err.message });
  }
};

// Listar todos os questionários
exports.getAllQuestionnaires = async (req, res) => {
  res.status(200).json(req.followUp.questionnaires);
};



// Atualizar questionário
exports.updateQuestionnaire = async (req, res) => {
  try {
    const { questionnaireId } = req.params;
    const { formId, answers, dateFilled } = req.body;

    const questionnaire = req.followUp.questionnaires.id(questionnaireId);
    if (!questionnaire) return res.status(404).json({ message: 'Questionário não encontrado' });

    if (formId) questionnaire.formId = formId;
    if (answers) questionnaire.answers = answers;
    if (dateFilled) questionnaire.dateFilled = dateFilled;

    await req.followUp.save();
    res.status(200).json({ message: 'Questionário atualizado com sucesso' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


// Remover questionário
exports.deleteQuestionnaire = async (req, res) => {
  try {
    const { questionnaireId } = req.params;
    req.followUp.questionnaires = req.followUp.questionnaires.filter(q => q._id.toString() !== questionnaireId);
    await req.followUp.save();
    res.status(200).json({ message: 'Questionário removido com sucesso' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Verificar estado de formulário (ex: EQ5)
exports.checkFormStatus = async (req, res) => {
  try {
    const followUp = req.followUp;

    const questionnaire = followUp.questionnaires.find(q => {
      if (q.formId !== 'eq5') return false;
      if (q.filled) return false;
      const expirationDate = new Date(q.sentAt);
      expirationDate.setDate(expirationDate.getDate() + 14);
      return new Date() <= expirationDate;
    });

    if (!questionnaire) {
      return res.status(400).json({ message: 'Formulário expirado ou já preenchido.' });
    }

    return res.status(200).json({ message: 'Formulário ativo.', questionnaire });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @typedef {{ score?: number|null }} Answer
 */

/**
 * Calcula a média dos scores (1..3) e o "verified"
 * @param {Answer[]} answers
 * @returns {{ scoreAvg: number|null, verified: boolean|null }}
 */
function computeAvgAndVerified(answers) {
  const scored = (answers || [])
    .map(a => (a && Number.isFinite(a.score) ? Number(a.score) : null))
    .filter(s => s !== null && s >= 1 && s <= 3);

  if (!scored.length) return { scoreAvg: null, verified: null };

  const sum = scored.reduce((acc, n) => acc + n, 0);
  const scoreAvg = sum / scored.length;

  const rounded = Math.max(1, Math.min(3, Math.round(scoreAvg)));
  const verified = rounded !== 1; // false se preocupante (1), true se médio/bom (2/3)

  return { scoreAvg, verified };
}



// Submeter questionário preenchido

exports.submitQuestionnaire = async (req, res) => {
  try {
    const { questionnaireId } = req.params;
    const { answers } = req.body;

    const questionnaire = req.followUp.questionnaires.id(questionnaireId);
    if (!questionnaire) {
      return res.status(404).json({ message: 'Questionário não encontrado neste acompanhamento.' });
    }
    if (questionnaire.filled) {
      return res.status(400).json({ message: 'Este questionário já foi preenchido.' });
    }

    const base = new Date(questionnaire.sentAt || questionnaire.createdAt || new Date());
    const expiration = new Date(base.getTime() + 14 * 24 * 60 * 60 * 1000);
    if (new Date() > expiration) {
      return res.status(400).json({ message: 'O questionário expirou.' });
    }

    // normaliza e força score numérico quando existir
    const normalized = (answers || []).map(a => ({
      question: a?.question,
      answer: a?.answer,
      conditionalLabel: a?.conditionalLabel ?? null,
      additional: a?.additional ?? null,
      score: a?.score == null ? undefined : Number(a.score)
    }));

    // calcula média e verified
    const { scoreAvg, verified } = computeAvgAndVerified(normalized);

    questionnaire.answers = normalized;
    questionnaire.totalScore = normalized
      .map(a => a.score)
      .filter(s => Number.isFinite(s))
      .reduce((sum, s) => sum + s, 0);

    questionnaire.metrics = questionnaire.metrics || {};
    questionnaire.metrics.scoreAvg = scoreAvg;

    questionnaire.verified = verified;
    questionnaire.verifiedAt = verified === null ? null : new Date();

    questionnaire.dateFilled = new Date();
    questionnaire.filled = true;

    req.followUp.markModified('questionnaires');
    await req.followUp.save();

    return res.status(200).json({
      message: 'Formulário preenchido com sucesso.',
      metrics: { scoreAvg },
      verified
    });
  } catch (error) {
    console.error('submitQuestionnaire ⇢', error);
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};







// Enviar formulário ao paciente via e-mail (manual)
exports.sendFormToPatient = async (req, res) => {
  try {
    const { formId } = req.params;
    const followUp = await req.followUp.populate('patient');
    const patient = followUp.patient;

    const questionnaire = followUp.questionnaires.find(q => q.formId === formId);



    if (!questionnaire) {
      followUp.questionnaires.push({ formId });
      await followUp.save();


      return res.status(200).json({ message: `Formulário ${formId} enviado pela primeira vez.` });

    } else {


      return res.status(200).json({ message: `Formulário ${formId} reenviado para ${patient.email}` });
    }

  } catch (error) {
    console.error('Erro ao enviar formulário manual:', error);
    return res.status(500).json({ message: 'Erro ao enviar formulário manual.' });
  }
};



exports.getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const followUp = await FollowUp.findOne({ 'questionnaires.slug': slug });
    if (!followUp) return res.status(404).json({ message: 'Link inválido' });

    const questionnaire = followUp.questionnaires.find(q => q.slug === slug);
    if (!questionnaire) return res.status(404).json({ message: 'Questionário não encontrado' });

    // devolve também o formId
    return res.status(200).json({
      patientId:       followUp.patient.toString(),
      followUpId:      followUp._id.toString(),
      questionnaireId: questionnaire._id.toString(),
      formId:          questionnaire.formId
    });
  } catch (err) {
    console.error('Erro em getBySlug ⇢', err);
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

exports.getQuestionnaireById = async (req, res) => {
  try {
    const questionnaire = req.followUp.questionnaires.id(req.params.questionnaireId);
    if (!questionnaire) {
      return res.status(404).json({ message: 'Questionário não encontrado.' });
    }
    return res.json(questionnaire);
  } catch (err) {
    console.error('getQuestionnaireById ⇢', err);
    return res.status(500).json({ message: 'Erro no servidor.' });
  }
};





// GET /api/followups/verify/:patientId/:followUpId
exports.verifyQuestionnaire = async (req, res) => {
  try {
    const followUp = req.followUp;

    if (followUp.patient.toString() !== req.params.patientId) {
      return res.status(404).json({ message: 'Follow-up não pertence ao paciente indicado.' });
    }

    const questionnaire = followUp.questionnaires.find(
      q => q._id.toString() === req.params.questionnaireId && !q.filled
    );

    if (!questionnaire) {
      return res.status(404).json({ message: 'Formulário não encontrado ou já preenchido.' });
    }

    return res.status(200).json({ formId: questionnaire.formId });
  } catch (error) {
    console.error('Erro na verificação do questionário:', error);
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};




exports.getAllSurgeryTypes = async (req, res) => {
  try {
    const surgeryTypes = await FollowUp.distinct('surgeryType', { surgeryType: { $ne: null } });
    res.json(surgeryTypes);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao obter tipos de cirurgia.' });
  }
};

// Usado pelo middleware .param('followUpId')
exports.getFollowUpDocumentById = async (followUpId) => {
  return await FollowUp.findById(followUpId);
};



// controllers/followUpController.js
exports.getCritical = async (req, res, next) => {
  try {
    const maxAvg = req.query.maxAvg ? Number(req.query.maxAvg) : 2;          // < 2
    const onlyUnverified = req.query.onlyUnverified !== 'false';            // default: true

    // carrega followups com patient e doctor; depois “achata” os questionários
    const followups = await FollowUp
      .find({})
      .populate('patient')
      .populate('doctor')
      .lean();

    const now = Date.now();
    const out = [];

    for (const fu of followups) {
      for (const q of fu.questionnaires || []) {
        const avg = q?.metrics?.scoreAvg ?? null;
        if (avg == null || avg >= maxAvg) continue;
        if (onlyUnverified && q.verified === true) continue;
        if (!q.filled) continue; // só interessa já preenchido

        // calcula estado (ativo/expirado) com base em 14 dias após o envio
        const base = q.sentAt ? new Date(q.sentAt).getTime()
                              : (q.createdAt ? new Date(q.createdAt).getTime() : null);
        let estado = 'ativo';
        if (base != null) {
          const expiry = base + 14 * 24 * 60 * 60 * 1000;
          estado = now > expiry ? 'expirado' : 'ativo';
        }

        out.push({
          // shape do teu Questionnaire + patient + doctor
          formId: q.formId,
          sentAt: q.sentAt ?? null,
          updatedAt: q.updatedAt ?? null,
          filled: !!q.filled,
          attempts: q.attempts ?? 0,
          dateFilled: q.dateFilled ?? null,
          estado,
          answers: q.answers ?? [],
          verified: q.verified ?? null,
          metrics: { scoreAvg: avg },

          // anexos
          patient: fu.patient || null,
          doctor: fu.doctor || null,

          // úteis para ações no front
          followUpId: fu._id,
          questionnaireId: q._id
        });
      }
    }

    // ordenar piores primeiro
    out.sort((a, b) => (a.metrics.scoreAvg ?? 99) - (b.metrics.scoreAvg ?? 99));

    return res.json(out);
  } catch (err) {
    next(err);
  }
};

exports.markQuestionnaireVerified = async (req, res) => {
  try {
    const fu = req.followUp;
    if (!fu) return res.status(404).json({ message: 'Acompanhamento não encontrado.' });

    // Garantir que o followUp pertence ao patientId da rota
    if (fu.patient.toString() !== req.params.patientId) {
      return res.status(404).json({ message: 'Acompanhamento não pertence ao paciente indicado.' });
    }

    const q = fu.questionnaires.id(req.params.questionnaireId);
    if (!q) return res.status(404).json({ message: 'Questionário não encontrado.' });

    q.verified   = true;
    q.verifiedAt = new Date();

    await fu.save();
    return res.json({ ok: true, verified: true, verifiedAt: q.verifiedAt });
  } catch (err) {
    console.error('markQuestionnaireVerified ⇢', err);
    return res.status(500).json({ message: 'Erro ao verificar questionário.' });
  }
};

const SCHEDULE_FROM_DISCHARGE = {
  'follow-up_3dias'  : d => addDays(d, 3),
  'follow-up_1mes'   : d => addMonths(d, 1),
  'follow-up_3meses' : d => addMonths(d, 3),
  'eq5_3meses'       : d => addMonths(d, 3),
  'follow-up_6meses' : d => addMonths(d, 6),
  'follow-up_1ano'   : d => addYears(d, 1),
  'eq5_1ano'         : d => addYears(d, 1),
};

exports.setDischargeDate = async (req, res) => {
  try {
    const { patientId, followUpId } = req.params;
    const { dischargeDate } = req.body;

    if (!dischargeDate) {
      return res.status(400).json({ message: 'dischargeDate é obrigatório' });
    }

    const followUp = await FollowUp.findById(followUpId).populate('patient');
    if (!followUp || followUp.patient.toString() !== patientId) {
      return res.status(404).json({ message: 'Acompanhamento não encontrado para o paciente' });
    }

    const alta = new Date(dischargeDate);
    if (isNaN(+alta)) return res.status(400).json({ message: 'dischargeDate inválida' });

    // guarda a alta
    followUp.dischargeDate = alta;

    // agenda apenas os pós-op que ainda não têm scheduledAt
    for (const q of followUp.questionnaires) {
      const f = q.formId;
      if (SCHEDULE_FROM_DISCHARGE[f] && !q.scheduledAt) {
        q.scheduledAt = SCHEDULE_FROM_DISCHARGE[f](alta);
      }
    }

    // envia os que já estão “a horas” e ainda não foram enviados/preenchidos
    const now = new Date();
    const due = followUp.questionnaires.filter(q =>
      !q.filled && q.scheduledAt && q.scheduledAt <= now && !q.sentAt
    );

    if (due.length && followUp.patient?.email) {
      const { sendFormEmail } = require('../services/emailService');
      const formIds = due.map(q => q.formId);
      const slugMap = Object.fromEntries(due.map(q => [q.formId, q.slug]));
      try {
        await sendFormEmail(followUp.patient.email, followUp.patient._id, followUp.patient.name, formIds, slugMap);
        due.forEach(q => { q.sentAt = new Date(); q.attempts = (q.attempts || 0) + 1; });
      } catch (e) {
        console.error('❌ Erro ao enviar pós-op:', e);
      }
    }

    await followUp.save();
    res.json(followUp);
  } catch (err) {
    console.error('setDischargeDate ⇢', err);
    res.status(500).json({ message: 'Erro ao definir alta.' });
  }
};
