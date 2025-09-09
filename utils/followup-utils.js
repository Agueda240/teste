// utils/followup-utils.js

const DAY_MS = 24 * 60 * 60 * 1000;

// data base: sentAt, scheduledAt, ou null
function baseDate(q) {
  return q.sentAt || q.scheduledAt || null;
}

// expirado se já passou o prazo (ex: 7 dias após baseDate)
const EXPIRY_DAYS = 7;
function isExpired(q, now = Date.now()) {
  const base = baseDate(q);
  if (!base) return false;
  const expiry = new Date(base).getTime() + EXPIRY_DAYS * DAY_MS;
  return now > expiry;
}

// devido até hoje (mesmo que já tenha expirado)
function isDue(q, now = Date.now()) {
  const base = baseDate(q);
  if (!base) return false;
  return new Date(base).getTime() <= now;
}

module.exports = { DAY_MS, EXPIRY_DAYS, baseDate, isExpired, isDue };
