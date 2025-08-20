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

    // 👇 Normaliza e preserva o score
    const normalized = (answers || []).map(a => ({
      question: a.question,
      answer: a.answer,
      conditionalLabel: a.conditionalLabel ?? null,
      additional: a.additional ?? null,
      score: typeof a.score === 'number'
        ? a.score
        : (a.score != null ? Number(a.score) : undefined)
    }));

    questionnaire.answers = normalized;

    // 👇 (Opcional) total por questionário
    questionnaire.totalScore = normalized.reduce((sum, a) => sum + (a.score ?? 0), 0);

    questionnaire.dateFilled = new Date();
    questionnaire.filled = true;

    req.followUp.markModified('questionnaires');
    await req.followUp.save();

    return res.status(200).json({ message: 'Formulário preenchido com sucesso.' });
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




