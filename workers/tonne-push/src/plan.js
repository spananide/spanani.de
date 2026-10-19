import plan from '../../../t-7yhbbwj4/termine.json' with { type: 'json' };

export { plan };

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function berlin(ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  const min = String(Math.floor(+p.minute / 15) * 15).padStart(2, '0');
  return { day: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${min}` };
}
export const addDays = (day, n) => new Date(Date.parse(day + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);

const liste = keys => {
  const n = keys.map(k => plan.arten[k]);
  return n.length > 1 ? n.slice(0, -1).join(', ') + ' und ' + n.at(-1) : n[0];
};
const datum = day => {
  const d = new Date(day + 'T12:00:00Z');
  return `${TAGE[d.getUTCDay()]}, ${d.getUTCDate()}. ${MONATE[d.getUTCMonth()]}`;
};
const wann = n => ['Heute', 'Morgen', 'Übermorgen'][n] || `In ${n} Tagen`;

export function nachricht(day, days, types) {
  const target = addDays(day, days);
  const arten = (plan.termine[target] || []).filter(a => types.includes(a));
  if (!arten.length) return null;
  return { title: liste(arten), body: `${wann(days)}, ${datum(target)}.`, tag: target };
}

export function naechster(day, types) {
  const d = Object.keys(plan.termine).find(k => k >= day && plan.termine[k].some(a => types.includes(a)));
  return d && `${liste(plan.termine[d].filter(a => types.includes(a)))}, ${datum(d)}`;
}
