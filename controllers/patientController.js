// controllers/patientController.js
// Ajusta 'Models' vs 'models' conforme o teu diretório real
const Patient  = require('../Models/Patient');
const FollowUp = require('../Models/FollowUp');
const { toUtcNoonKeepingLisbonDay } = require('../utils/date');
const { nanoid } = require('nanoid');

exports.sendFormToPatient = async (req, res) => {
  try {
    const { patientId, formId } = req.params;
    return res.status(200).json({ message: `Formulário ${formId} enviado para o paciente ${patientId}` });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao enviar formulário.', error: error.message });
  }
};

exports.createPatient = async (req, res) => {
  try {
    const { processNumber, name, dateOfBirth, gender, email, phone, doctor, surgeryDate, surgeryType, medications } = req.body;
    if (!doctor || !surgeryDate || !surgeryType) {
      return res.status(400).json({ message: 'Campos obrigatórios em falta: médico, tipo de cirurgia ou data da cirurgia.' });
    }

    const { sendFormEmail } = require('../services/emailService');
    const { scheduleFollowUpEmails } = require('../utils/formScheduler');

    const patient = new Patient({
      processNumber, name, email, phone,
      dateOfBirth: dateOfBirth ? toUtcNoonKeepingLisbonDay(dateOfBirth) : null,
      gender, estado: 'ativo'
    });
    await patient.save();

    const now = new Date();
    const questionnaires = [
      { formId: 'follow-up_preop', scheduledAt: now, slug: nanoid(8) },
      { formId: 'eq5_preop',       scheduledAt: now, slug: nanoid(8) },
      { formId: 'follow-up_3dias',  scheduledAt: null, slug: nanoid(8) },
      { formId: 'follow-up_1mes',   scheduledAt: null, slug: nanoid(8) },
      { formId: 'follow-up_3meses', scheduledAt: null, slug: nanoid(8) },
      { formId: 'eq5_3meses',       scheduledAt: null, slug: nanoid(8) },
      { formId: 'follow-up_6meses', scheduledAt: null, slug: nanoid(8) },
      { formId: 'follow-up_1ano',   scheduledAt: null, slug: nanoid(8) },
      { formId: 'eq5_1ano',         scheduledAt: null, slug: nanoid(8) },
    ];

    const followUp = new FollowUp({
      patient: patient._id,
      doctor,
      surgeryDate: toUtcNoonKeepingLisbonDay(surgeryDate),
      surgeryType,
      medications: medications || [],
      questionnaires
    });
    await followUp.save();

    res.status(201).json({ patient, followUp });

    queueMicrotask(async () => {
      try {
        const ready = followUp.questionnaires.filter(q =>
          q.scheduledAt && !q.filled && (!q.sentAt || q.sentAt < q.scheduledAt) && q.scheduledAt <= now
        );
        if (ready.length && patient.email) {
          const formIds = ready.map(q => q.formId);
          const slugMap = Object.fromEntries(ready.map(q => [q.formId, q.slug]));
          await sendFormEmail(patient.email, patient._id, patient.name, formIds, slugMap);
          ready.forEach(q => { q.sentAt = new Date(); q.attempts = (q.attempts || 0) + 1; });
          await followUp.save();
        }
      } catch (e) { console.error('Pré-op async:', e); }

      try { await scheduleFollowUpEmails(patient, followUp); }
      catch (e) { console.error('Scheduler async:', e); }
    });
  } catch (err) {
    console.error('Erro ao criar paciente:', err);
    return res.status(400).json({ message: err.message });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const { estado } = req.query;

    const followUps = await FollowUp
      .find()
      .populate('patient')
      .populate('doctor')
      .lean();

    const map = new Map();
    for (const fu of followUps) {
      const p = fu.patient;
      if (!p) continue;
      const id = String(p._id);
      const fuStripped = stripPatientFromFollowUp(fu);
      if (map.has(id)) {
        map.get(id).followUps.push(fuStripped);
      } else {
        map.set(id, {
          _id: p._id,
          processNumber: p.processNumber,
          name: p.name,
          email: p.email,
          phone: p.phone,
          dateOfBirth: p.dateOfBirth,
          gender: p.gender,
          estado: p.estado,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          __v: p.__v,
          followUps: [fuStripped]
        });
      }
    }

    const patients = Array.from(map.values());
    const filtered  = estado ? patients.filter(p => p.estado === estado) : patients;
    return res.json(filtered);
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao listar pacientes', error: err.message });
  }
};

function stripPatientFromFollowUp(followUp) {
  const { patient, ...rest } = followUp;
  return rest;
}

exports.getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).lean();
    if (!patient) return res.status(404).json({ message: 'Paciente não encontrado.' });

    const followUps = await FollowUp.find({ patient: patient._id }).populate('doctor');
    patient.followUps = followUps;

    return res.status(200).json(patient);
  } catch (err) {
    console.error('Erro ao obter paciente:', err);
    return res.status(500).json({ message: err.message });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const { processNumber, name, dateOfBirth, gender, email, phone } = req.body;
    const updateData = {
      processNumber, name, gender, email, phone,
      ...(dateOfBirth !== undefined
        ? { dateOfBirth: dateOfBirth ? toUtcNoonKeepingLisbonDay(dateOfBirth) : null }
        : {}),
    };
    const updated = await Patient.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: 'Paciente não encontrado.' });
    return res.status(200).json(updated);
  } catch (err) {
    console.error('Erro ao atualizar paciente:', err);
    return res.status(400).json({ message: err.message });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    const patientId = req.params.id;
    await FollowUp.deleteMany({ patient: patientId });
    const deleted = await Patient.findByIdAndDelete(patientId);
    if (!deleted) return res.status(404).json({ message: 'Paciente não encontrado.' });
    return res.status(200).json({ message: 'Paciente e respetivos acompanhamentos eliminados com sucesso.' });
  } catch (err) {
    console.error('Erro ao deletar paciente:', err);
    return res.status(500).json({ message: err.message });
  }
};

exports.updateEstado = async (req, res) => {
  try {
    const { estado } = req.body; // 'ativo' | 'arquivado'
    if (!['ativo', 'arquivado'].includes(estado)) {
      return res.status(400).json({ message: "Estado inválido. Use 'ativo' ou 'arquivado'." });
    }

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true, runValidators: true }
    );
    if (!patient) return res.status(404).json({ message: 'Paciente não encontrado' });

    res.json({ message: `Paciente atualizado para "${estado}"`, patient });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar estado do paciente', error: err.message });
  }
};

exports.activatePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Paciente não encontrado' });
    patient.estado = 'ativo';
    await patient.save();
    return res.json({ message: 'Paciente reativado com sucesso' });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao reativar paciente', error: err.message });
  }
};

exports.getAllMedications = async (req, res) => {
  try {
    const meds = await FollowUp.aggregate([
      { $unwind: '$medications' },
      { $group: { _id: '$medications' } },
      { $sort: { _id: 1 } }
    ]);
    return res.json(meds.map(m => m._id));
  } catch (err) {
    console.error('Erro ao obter medicações:', err);
    return res.status(500).json({ message: 'Erro ao obter medicações' });
  }
};

exports.getAllSurgeryTypes = async (req, res) => {
  try {
    const types = await FollowUp.aggregate([
      { $group: { _id: '$surgeryType' } },
      { $sort: { _id: 1 } }
    ]);
    return res.json(types.map(t => t._id));
  } catch (err) {
    console.error('Erro ao obter tipos de cirurgia:', err);
    return res.status(500).json({ message: 'Erro ao obter tipos de cirurgia' });
  }
};

function pickFollowUpsByScope(followUps = [], scope = 'active') {
  if (!followUps.length) return [];
  if (scope === 'all') return followUps;

  const mostRecent = [...followUps].sort(
    (a,b) => new Date(b.surgeryDate) - new Date(a.surgeryDate)
  )[0];

  if (scope === 'latest') return [mostRecent];

  const active = followUps.find(f => (f.status || '').toLowerCase() === 'ativo');
  return [active || mostRecent];
}

exports.remindManualAll = async (req, res) => {
  try {
    const { patientId } = req.params;
    const includeExpired = req.body?.includeExpired !== false; // default: true
    const scope = req.body?.scope || 'active';

    const patient = await Patient.findById(patientId).lean(false); // sem .lean para ter subdocs JS
    if (!patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }
    if (!patient.email) {
      return res.status(400).json({ error: 'Paciente não tem e-mail' });
    }

    const now = Date.now();
    const selectedFollowUps = pickFollowUpsByScope(patient.followUps || [], scope);

    // Para cada followUp selecionado, recolher questionários “por preencher até hoje”
    const pending = [];
    for (const fu of selectedFollowUps) {
      const qs = fu.questionnaires || [];
      for (const q of qs) {
        if (q.filled) continue;              // já preenchido → não entra
        if (!isDue(q, now)) continue;        // só os devidos até hoje
        if (!includeExpired && isExpired(q, now)) continue; // excluir expirados se pedido

        // guardar: { formId, slug, dueAt } (dueAt só para desempate/dedup)
        const dueAt = baseDate(q)?.getTime() || 0;
        pending.push({ formId: q.formId, slug: q.slug, dueAt });
      }
    }

    if (!pending.length) {
      return res.json({ sent: false, count: 0, formIds: [] });
    }

    // Evitar duplicados por formId (se scope 'all' puder listar 2 FU com o mesmo formId)
    // Mantemos o mais recente (maior dueAt)
    const latestByFormId = new Map();
    for (const item of pending) {
      const prev = latestByFormId.get(item.formId);
      if (!prev || item.dueAt > prev.dueAt) {
        latestByFormId.set(item.formId, item);
      }
    }

    const deduped = Array.from(latestByFormId.values());
    const formIds = deduped.map(i => i.formId);
    const slugMap = deduped.reduce((acc, i) => {
      acc[i.formId] = i.slug;
      return acc;
    }, {});

    // Envio manual: NÃO alterar attempts/sentAt (envio “neutro”)
   // envio neutro
    await sendFormEmail(patient.email, patient._id, patient.name, formIds, slugMap);

    return res.json({ sent: true, count: formIds.length, formIds });
  } catch (err) {
    // ⬇️ logar tudo o que conseguirmos (especial p/ SendGrid)
    console.error('[remindManualAll] erro:', {
      message: err?.message,
      code: err?.code,
      response: err?.response?.body || err?.response,
      stack: err?.stack
    });

    // em produção podes voltar ao genérico; para já devolve detalhe útil:
    return res.status(500).json({
      error: 'Falha ao enviar lembrete único',
      detail: err?.response?.body?.errors || err?.message || err
    });
  }
};
