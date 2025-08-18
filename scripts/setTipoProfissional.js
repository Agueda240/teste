require('dotenv').config();
const mongoose = require('mongoose');
const Doctor = require('../Models/Doctor');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await Doctor.updateMany(
      { tipoProfissional: { $exists: false } },
      { $set: { tipoProfissional: 'Médico' } }
    );
    console.log(`Atualizados ${result.modifiedCount} médicos.`);
    process.exit(0);
  } catch (err) {
    console.error('Erro ao atualizar médicos:', err);
    process.exit(1);
  }
})();
