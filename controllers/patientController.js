require('dotenv').config();
const Patient = require('../Models/Patient');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

const FollowUp = require('../Models/FollowUp');
const { scheduleFollowUpEmails } = require('../utils/formScheduler');




exports.sendFormToPatient = async (req, res) => {
  try {
    const { patientId, formId } = req.params;
    // lógica do envio do formulário aqui
    res.status(200).json({ message: `Formulário ${formId} enviado para o paciente ${patientId}` });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao enviar formulário.', error: error.message });
  }
};



const nanoid = async (size = 8) => {
  const mod = await import('nanoid');
  return mod.nanoid(size);
};

exports.createPatient = async (req, res) => {
  try {
    const { name, dateOfBirth, gender, email, phone, doctor, surgeryDate, surgeryType, medications } = req.body;

    if (!doctor || !surgeryDate || !surgeryType) {
      return res.status(400).json({
        message: 'Campos obrigatórios em falta: médico, tipo de cirurgia ou data da cirurgia.'
      });
    }

    const { sendFormEmail } = require('../services/emailService');

    const patient = new Patient({
      name, email, phone, dateOfBirth, gender, estado: 'ativo'
    });
    await patient.save();

    const now = new Date();

    // ✅ PRÉ-OP já com data; PÓS-OP ficam à espera da alta (scheduledAt = null)
    const questionnaires = [
      { formId: 'follow-up_preop', scheduledAt: now,  slug: nanoid(8) },
      { formId: 'eq5_preop',       scheduledAt: now,  slug: nanoid(8) },

      { formId: 'follow-up_3dias',   scheduledAt: null, slug: nanoid(8) },
      { formId: 'follow-up_1mes',    scheduledAt: null, slug: nanoid(8) },
      { formId: 'follow-up_3meses',  scheduledAt: null, slug: nanoid(8) },
      { formId: 'eq5_3meses',        scheduledAt: null, slug: nanoid(8) },
      { formId: 'follow-up_6meses',  scheduledAt: null, slug: nanoid(8) },
      { formId: 'follow-up_1ano',    scheduledAt: null, slug: nanoid(8) },
      { formId: 'eq5_1ano',          scheduledAt: null, slug: nanoid(8) }
    ];

    const followUp = new FollowUp({
      patient: patient._id,
      doctor,
      surgeryDate,
      surgeryType,
      medications: medications || [],
      dischargeDate: null,
      questionnaires
    });

    await followUp.save();

    // ✅ Enviar só os que têm scheduledAt válida e <= now (apenas pré-op)
    const ready = followUp.questionnaires.filter(q =>
      !q.filled &&
      q.scheduledAt instanceof Date &&           // 👈 evita null <= now
      q.scheduledAt <= now &&
      (!q.sentAt || q.sentAt < q.scheduledAt)
    );

    if (ready.length && patient.email) {
      const formIds = ready.map(q => q.formId);
      const slugMap = Object.fromEntries(ready.map(q => [q.formId, q.slug]));
      try {
        await sendFormEmail(patient.email, patient._id, patient.name, formIds, slugMap);
        ready.forEach(q => { q.sentAt = new Date(); q.attempts = (q.attempts || 0) + 1; });
        await followUp.save();
      } catch (e) {
        console.error('❌ Erro ao enviar pré-op:', e);
      }
    }

    // ⚠️ Mantém o teu scheduler, mas certifica-te que ele NÃO volta a marcar pós-op
    // antes da alta (ou seja, não preencher scheduledAt quando dischargeDate é null).
    await scheduleFollowUpEmails(patient, followUp);

    return res.status(201).json({ patient, followUp });

  } catch (err) {
    console.error('Erro ao criar paciente:', err);
    return res.status(400).json({ message: err.message });
  }
};



// Função auxiliar para comparar se duas datas são do mesmo dia
function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}








exports.getAllPatients = async (req, res) => {
  try {
    const { estado } = req.query;

    // 1. Buscar todos os followUps do médico autenticado
    const followUps = await FollowUp.find()
      .populate('patient')
      .populate('doctor') // aqui populamos os dados do médico completo
      .lean(); // .lean() para podermos manipular os dados facilmente

    // 2. Criar um mapa de pacientes por ID
    const patientMap = new Map();

    for (const followUp of followUps) {
      const patientId = followUp.patient._id.toString();

      // Se já existe, só adicionamos mais um followUp
      if (patientMap.has(patientId)) {
        patientMap.get(patientId).followUps.push(stripPatientFromFollowUp(followUp));
      } else {
        // Criar novo paciente com lista de followUps
        const { patient } = followUp;
        patientMap.set(patientId, {
          _id: patient._id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          estado: patient.estado,
          createdAt: patient.createdAt,
          updatedAt: patient.updatedAt,
          __v: patient.__v,
          followUps: [stripPatientFromFollowUp(followUp)]
        });
      }
    }

    const patients = Array.from(patientMap.values());

    // 3. Se for para filtrar por estado
    const filteredPatients = !estado
      ? patients
      : patients.filter(p => p.estado === estado);

    res.json(filteredPatients);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar pacientes', error: err.message });
  }
};

// 🔧 Função auxiliar para remover o campo .patient de cada followUp
function stripPatientFromFollowUp(followUp) {
  const { patient, ...rest } = followUp;
  return rest;
}





exports.getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).lean(); // necessário para modificar
    if (!patient) return res.status(404).json({ message: 'Paciente não encontrado.' });

    const followUps = await FollowUp.find({ patient: patient._id }).populate('doctor');

    patient.followUps = followUps; // adiciona os followUps diretamente

    res.status(200).json(patient); // 👈 envia o objeto diretamente, sem o wrapper "patient"
  } catch (err) {
    console.error('Erro ao obter paciente:', err);
    res.status(500).json({ message: err.message });
  }
};




exports.updatePatient = async (req, res) => {
  try {
    const { name, dateOfBirth, gender, email, phone } = req.body;

    const updateData = { name, dateOfBirth, gender, email, phone };

    const updated = await Patient.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Paciente não encontrado.' });
    }

    res.status(200).json(updated);

  } catch (err) {
    console.error('Erro ao atualizar paciente:', err);
    res.status(400).json({ message: err.message });
  }
};



exports.deletePatient = async (req, res) => {
  try {
    const patientId = req.params.id;

    // Elimina os follow-ups associados ao paciente
    await FollowUp.deleteMany({ patient: patientId });

    // Elimina o próprio paciente
    const deletedPatient = await Patient.findByIdAndDelete(patientId);
    if (!deletedPatient) {
      return res.status(404).json({ message: 'Paciente não encontrado.' });
    }

    res.status(200).json({ message: 'Paciente e respetivos acompanhamentos clínicos eliminados com sucesso.' });

  } catch (err) {
    console.error('Erro ao deletar paciente:', err);
    res.status(500).json({ message: err.message });
  }
};

// controllers/patientController.js
exports.archivePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Paciente não encontrado' });

    patient.estado = 'arquivado';
    await patient.save();
    res.json({ message: 'Paciente arquivado com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao arquivar paciente', error: err.message });
  }
};


exports.activatePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Paciente não encontrado' });

    patient.estado = 'ativo';
    await patient.save();
    res.json({ message: 'Paciente reativado com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao reativar paciente', error: err.message });
  }
};


exports.getAllMedications = async (req, res) => {
  try {
    const meds = await FollowUp.aggregate([
      { $unwind: '$medications' },
      { $group: { _id: '$medications' } },
      { $sort: { _id: 1 } }
    ]);
    const uniqueMeds = meds.map(m => m._id);
    res.json(uniqueMeds);
  } catch (err) {
    console.error('Erro ao obter medicações:', err);
    res.status(500).json({ message: 'Erro ao obter medicações' });
  }
};

exports.getAllSurgeryTypes = async (req, res) => {
  try {
    const types = await FollowUp.aggregate([
      { $group: { _id: '$surgeryType' } },
      { $sort: { _id: 1 } }
    ]);
    const uniqueTypes = types.map(t => t._id);
    res.json(uniqueTypes);
  } catch (err) {
    console.error('Erro ao obter tipos de cirurgia:', err);
    res.status(500).json({ message: 'Erro ao obter tipos de cirurgia' });
  }
};
