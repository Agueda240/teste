const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const Doctor = require('../Models/Doctor'); // Alterado para o modelo Doctor

// Configuração da Estratégia Local
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      // Buscando o médico pelo email
      const doctor = await Doctor.findOne({ email: email });
      if (!doctor) {
        return done(null, false, { message: 'Médico não encontrado.' });
      }

      const isMatch = await bcrypt.compare(password, doctor.password);
      if (!isMatch) {
        return done(null, false, { message: 'Senha incorreta.' });
      }

      return done(null, doctor);
    } catch (err) {
      return done(err);
    }
  }
));

// Serializar e Desserializar o médico (necessário para sessões, mas opcional se usar JWT)
passport.serializeUser((doctor, done) => {
  done(null, doctor.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const doctor = await Doctor.findById(id);
    done(null, doctor);
  } catch (err) {
    done(err, null);
  }
});
