// controllers/doctorController.js
const Doctor = require('../Models/Doctor');
const jwt = require('jsonwebtoken');
const { sendPasswordSetupEmail } = require('../services/emailService');

/**
 * Registra um novo médico.
 */
exports.registerDoctor = async (req, res) => {
  try {
    const { name, email, tipoProfissional } = req.body;

const existing = await Doctor.findOne({ email });
if (existing) {
  return res.status(400).json({ message: 'Email já está em uso.' });
}

const doctor = new Doctor({ name, email, tipoProfissional });
await doctor.save();

// Criar token JWT temporário para definir password
const token = jwt.sign(
  { id: doctor._id },
  process.env.JWT_SECRET,
  { expiresIn: '1d' }
);

// Enviar email com link
const link = `https://hospital-santa-marta.tiagoagueda.pt/definir-senha/${token}`;
await sendPasswordSetupEmail(email, name, link);

res.status(201).json({ message: 'Médico registado e email enviado.' });

  } catch (err) {
    console.error('Erro ao registrar médico:', err);
    res.status(400).json({ message: err.message });
  }
};

/**
 * Realiza o login do médico e retorna um token de autenticação.
 */
exports.loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Busca o médico pelo email
    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(400).json({ message: 'Credenciais inválidas.' });
    }

    // Verifica a senha
    const isMatch = await doctor.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciais inválidas.' });
    }

    // Gera um token JWT (certifique-se de definir a variável de ambiente JWT_SECRET)
    const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({ token, doctor });
  } catch (err) {
    console.error('Erro no login do médico:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Retorna os dados do médico autenticado.
 */
exports.getDoctorProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.user.id); // <-- usa o campo que puseste no middleware
    if (!doctor) {
      return res.status(404).json({ message: 'Médico não encontrado.' });
    }
    res.status(200).json(doctor);
  } catch (err) {
    console.error('Erro ao obter perfil do médico:', err);
    res.status(500).json({ message: err.message });
  }
};


/**
 * Atualiza os dados de um médico.
 */
exports.updateDoctor = async (req, res) => {
  try {
    const { name, email, password, tipoProfissional } = req.body;
    const updateData = { name, email };

    // Se houver alteração de senha, inclua-a (o middleware de pré-save fará o hash)
    if (password) {
      updateData.password = password;
    }

    if (tipoProfissional !== undefined) updateData.tipoProfissional = tipoProfissional;


    const updatedDoctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedDoctor) {
      return res.status(404).json({ message: 'Médico não encontrado.' });
    }

    res.status(200).json(updatedDoctor);
  } catch (err) {
    console.error('Erro ao atualizar médico:', err);
    res.status(400).json({ message: err.message });
  }
};

exports.setPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const doctor = await Doctor.findById(decoded.id);
    if (!doctor) return res.status(404).json({ message: 'Médico não encontrado.' });

    doctor.password = password;
    await doctor.save();

    res.status(200).json({ message: 'Senha definida com sucesso.' });
  } catch (err) {
    console.error('Erro ao definir senha:', err);
    res.status(400).json({ message: 'Token inválido ou expirado.' });
  }
};


/**
 * Exclui um médico.
 */
exports.deleteDoctor = async (req, res) => {
  try {
    const deletedDoctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!deletedDoctor) {
      return res.status(404).json({ message: 'Médico não encontrado.' });
    }
    res.status(200).json({ message: 'Médico deletado com sucesso.' });
  } catch (err) {
    console.error('Erro ao deletar médico:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Retorna a lista de todos os médicos.
 */
exports.getAllDoctors = async (req, res) => {
  try {
const doctors = await Doctor.find();    res.status(200).json(doctors);
  } catch (err) {
    console.error('Erro ao obter médicos:', err);
    res.status(500).json({ message: err.message });
  }
};
