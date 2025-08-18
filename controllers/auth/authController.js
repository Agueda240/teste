const User = require('../../models/User');
const jwt = require('jsonwebtoken');

// Configurações para bloqueio
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 horas

// Registrar um novo utilizador
exports.register = async (req, res) => {
  const { nome, email, password, sexo, data_nascimento, role } = req.body;

  try {
    // Verificar se o email já está registrado
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email já está em uso.' });
    }

    // Criar um novo utilizador
    const newUser = new User({
      nome,
      email,
      password,
      sexo,
      data_nascimento,
      role
    });

    // Salvar o utilizador na BD
    await newUser.save();

    // Gerar token JWT
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    // Construir a resposta sem o campo password
    res.status(201).json({
      message: 'utilizador registrado com sucesso.',
      token,
      user: {
        id: newUser._id,
        nome: newUser.nome,
        email: newUser.email,
        sexo: newUser.sexo,
        data_nascimento: newUser.data_nascimento,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ message: 'Erro no servidor.', error: err.message });
  }
};

// Login de utilizador com bloqueio de conta
exports.login = async (req, res) => {
  const { email, password } = req.body;
  console.log('Tentativa de login para email:', email);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('utilizador não encontrado:', email);
      return res.status(400).json({ message: 'Credenciais inválidas.' });
    }

    // Verificar se a conta está bloqueada
    if (user.isLocked) {
      console.log('Conta bloqueada para email:', email);
      return res.status(423).json({ message: 'Conta bloqueada devido a muitas tentativas de login. Por favor, tente novamente mais tarde.' });
    }

    const isMatch = await user.comparePassword(password);
    if (isMatch) {
      console.log('Senha correta para email:', email);
      // Resetar tentativas falhadas e desbloquear conta se necessário
      if (user.failedLoginAttempts > 0 || user.lockUntil) {
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();
        console.log('Tentativas falhadas resetadas para email:', email);
      }

      // Gerar token JWT
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      );
      console.log('Token JWT gerado:', token);

      res.status(200).json({
        message: 'Login bem-sucedido.',
        token,
        user: {
          id: user._id,
          nome: user.nome,
          email: user.email,
          sexo: user.sexo,
          data_nascimento: user.data_nascimento,
          role: user.role
        }
      });
      console.log('Resposta de login enviada para o cliente');
    } else {
      console.log('Senha incorreta para email:', email);
      // Incrementar tentativas falhadas
      user.failedLoginAttempts += 1;

      // Verificar se deve bloquear a conta
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = Date.now() + LOCK_TIME;
        console.log('Conta bloqueada devido a tentativas excessivas para email:', email);
      }

      await user.save();
      res.status(400).json({ message: 'Credenciais inválidas.' });
    }
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ message: 'Erro no servidor.', error: err.message });
  }
};
