const Queue = require('bull');
const dotenv = require('dotenv');

dotenv.config();

// Crie a instância da fila com as configurações do Redis
const emailQueue = new Queue('emailQueue', {
  redis: {
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    tls: {} // só isto já ativa TLS!
  }
});

(async () => {
  try {
    // Esvazia a fila (remove todos os jobs)
    await emailQueue.empty();
    console.log('Fila esvaziada com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao esvaziar a fila:', err);
    process.exit(1);
  }
})();
