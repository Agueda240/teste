// models/followUp.model.js (ou onde tiveres este schema)
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer:   { type: String, required: true },
  conditionalLabel: { type: String },
  additional: { type: String },
  score: { type: Number }               // 👈 ADICIONADO
}, { _id: false });

const questionnaireSchema = new mongoose.Schema({
  formId:      { type: String, required: true },
  slug:        { type: String, unique: true, index: true, required: true },
  scheduledAt: { type: Date, required: true },
  sentAt:      { type: Date },
  updatedAt:   { type: Date, default: Date.now },
  filled:      { type: Boolean, default: false },
  attempts:    { type: Number, default: 0 },
  dateFilled:  { type: Date },
  estado:      { type: String, enum: ['ativo', 'expirado'], default: 'ativo' },
    metrics: {
    scoreAvg: { type: Number, default: null } // 1..3 (média das respostas com score)
  },
  verified:   { type: Boolean, default: null },
  answers:     [answerSchema]           // 👈 usa o schema com score
});

// Mantém só o updatedAt
questionnaireSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const followUpSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor:  { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  surgeryDate: { type: Date, required: true },
  surgeryType: { type: String, required: true },
  doctorAssignedAt: { type: Date, default: Date.now },
  medications: [{ type: String }],
  status: { type: String, enum: ['ativo', 'concluído', 'expirado'], default: 'ativo' },
  questionnaires: [questionnaireSchema]
}, { timestamps: true });

module.exports = mongoose.model('FollowUp', followUpSchema);
