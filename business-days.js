// Días hábiles en Colombia (zona America/Bogota, UTC−5 sin horario de verano).
// Festivos: fijos, Ley Emiliani (se trasladan al lunes) y los que dependen de la Pascua.
(function (root) {
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
  const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
  const nextMonday = (d) => { const wd = d.getUTCDay(); return wd === 1 ? d : addDays(d, (8 - wd) % 7); };

  function easter(y) { // algoritmo de Meeus/Jones/Butcher
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return utc(y, month, day);
  }

  const cache = {};
  function holidays(y) {
    if (cache[y]) return cache[y];
    const e = easter(y);
    const list = [
      utc(y, 1, 1), utc(y, 5, 1), utc(y, 7, 20), utc(y, 8, 7), utc(y, 12, 8), utc(y, 12, 25),      // fijos
      ...[[1, 6], [3, 19], [6, 29], [8, 15], [10, 12], [11, 1], [11, 11]].map(([m, d]) => nextMonday(utc(y, m, d))), // Emiliani
      addDays(e, -3), addDays(e, -2),                                                               // Jueves y Viernes Santo
      nextMonday(addDays(e, 39)), nextMonday(addDays(e, 60)), nextMonday(addDays(e, 68)),           // Ascensión, Corpus, Sagrado Corazón
    ];
    return (cache[y] = new Set(list.map(ymd)));
  }

  const isBusinessDay = (d) => { const wd = d.getUTCDay(); return wd !== 0 && wd !== 6 && !holidays(d.getUTCFullYear()).has(ymd(d)); };

  /** Fecha (YYYY-MM-DD, hora Colombia) en que empieza a ejecutarse una solicitud recibida en `now`. */
  function requestStartDate(now = new Date()) {
    const bogota = new Date(now.getTime() - 5 * 3600e3);            // "reloj" de Bogotá expresado en UTC
    let d = new Date(bogota.getTime() + 24 * 3600e3);               // margen de 24 h
    d = utc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    while (!isBusinessDay(d)) d = addDays(d, 1);
    return ymd(d);
  }

  const api = { requestStartDate, isBusinessDay, holidays: (y) => [...holidays(y)].sort() };
  root.BusinessDays = api;
})(typeof window !== 'undefined' ? window : globalThis);
