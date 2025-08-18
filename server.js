const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');


// Configurar variáveis de ambiente
dotenv.config();



// Configurar Passport (certifique-se de que sua estratégia de autenticação esteja implementada)
require('./config/passport');

const allowedOrigins = [
  'http://localhost:4200',
  'https://hospital-santa-marta.tiagoagueda.pt'
];

const app = express();
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true
}));
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(express.json());
app.use(passport.initialize());

// Importar Rotas dos Médicos e Pacientes
const doctorRoutes = require('./routes/doctorRoutes');
const patientRoutes = require('./routes/patientRoutes');
const followUpRoutes = require('./routes/followUpRoutes');


// Usar as Rotas
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/followups', followUpRoutes);



// Conectar ao MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Iniciar o Servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
