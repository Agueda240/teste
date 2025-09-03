// Converte um input de data preservando o dia civil de Lisboa
// e grava às 12:00 UTC (evita saltos de dia por DST/fusos).
function toUtcNoonKeepingLisbonDay(input) {
  if (!input) return null;
  const d = new Date(input);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const [y, m, day] = fmt.format(d).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
}

module.exports = { toUtcNoonKeepingLisbonDay };
