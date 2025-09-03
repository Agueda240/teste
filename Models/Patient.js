const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    processNumber: {               
    type: String,
    required: true,
    trim: true,
    index: true                  // útil para pesquisas
  },

  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['M', 'F', 'O'],
    required: true
  },
 

  estado: {
    type: String,
    enum: ['ativo', 'arquivado'],
    default: 'ativo'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Patient', patientSchema);
