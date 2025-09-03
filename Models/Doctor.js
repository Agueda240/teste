// models/Doctor.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/\S+@\S+\.\S+/, 'Email inválido']
  },
  password: {
    type: String,
    minlength: 6
  },
  tipoProfissional: {
    type: String,
    enum: ['Médico', 'Enfermeiro'],
    required: true 
  }}, {
  timestamps: true
});

// Middleware para realizar hash da senha antes de salvar
doctorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(this.password, salt);
    this.password = hash;
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senhas
doctorSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Ao transformar para JSON, removemos a senha
doctorSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Doctor', doctorSchema);
