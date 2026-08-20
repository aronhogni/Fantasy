/* ============================================================
   TIMABIL SEM ER BYRJAD — EIN UPPBYGGING, ThRIR NOTENDUR (20.8.2026)

   „Not been in your XI" horfir AFTURABAK og er thvi ThOGULL i forleik:
   null umferdir eru byrjadar, svo engin notkunar-saga er til (sja langa
   athugasemdina vid `unusedPlan` i App.jsx). Committud `events.json` er
   forleiks-mynd, svo hvert safn sem vill profa borðann VIRKAN tharf
   tilbuinn tima.

   HVERS VEGNA HER OG EKKI I HVERJU SAFNI: `tests/lib/e0.mjs` er thar af
   nakvaemlega somu astaedu — „ein uppbygging a einum stad, annars getur
   eitt bakpróf maelt annan heim en hitt og bædi virst graen a medan thau
   eru osamanburdarhaef". Thrju safn (smoke, planner-idle, planner-pitch)
   og eitt nytt (initial-squad) lesa thetta.

   REGLAN: umferdir 1..n-1 eru LOKNAR, umferd n er I GANGI (frestur
   runninn ut, `is_current`), og n+1 er `is_next` med FRAMTIDAR-frest.
   Bædi `finished` og `deadline_time` eru sett, thvi appid les hvort tveggja
   a sitthvorum stad (`seasonStarted`/`seasonGames` lesa `finished`,
   `deadlinePassed`/`preSeason` lesa frestinn).
   ============================================================ */
const DAY = 86400000;

export function playedEvents(events, n) {
  const now = Date.now();
  return events.map(e => {
    const id = e.id;
    if (id < n) return { ...e, finished: true, data_checked: true,
      is_current: false, is_next: false, is_previous: id === n - 1,
      deadline_time: new Date(now - (n - id + 1) * 7 * DAY).toISOString() };
    if (id === n) return { ...e, finished: false, data_checked: false,
      is_current: true, is_next: false, is_previous: false,
      deadline_time: new Date(now - 2 * DAY).toISOString() };
    return { ...e, finished: false, data_checked: false,
      is_current: false, is_next: id === n + 1, is_previous: false,
      deadline_time: new Date(now + (id - n) * 7 * DAY).toISOString() };
  });
}
