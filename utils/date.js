// Devolve a meia-noite UTC do dia indicado (ignora fuso local)
function toUtcMidnight(input) {
  const d = new Date(input); // aceita Date ou string
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

module.exports = { toUtcMidnight };
