const rateLimit = require('express-rate-limit');

// Configuração do Rate Limiter para a rota de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Limite de 10 requisições por janela por IP
  message: {
    message: 'Muitas tentativas de login a partir deste IP, por favor tente novamente após 15 minutos.'
  },
  standardHeaders: true, // Retorna informações de rate limit nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita os headers `X-RateLimit-*`
});

module.exports = { loginLimiter };
