const Redis = require('ioredis');
const redis = new Redis({
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASSWORD,
  tls: {},
});
redis.set('bull_test', 'ok').then(() => redis.get('bull_test')).then(console.log);
