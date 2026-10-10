import {normalize} from './search.js';

export const defaultPreferences = value => ({
  hideAnime: typeof value?.hideAnime === 'boolean' ? value.hideAnime : true,
  hideDorama: typeof value?.hideDorama === 'boolean' ? value.hideDorama : true,
});

export function sameTitle(a, b) {
  if (a.kind !== b.kind) return false;
  if (a.id === b.id || a.tvmaze && a.tvmaze === b.tvmaze) return true;
  if (a.tvmaze && b.tvmaze && a.tvmaze !== b.tvmaze) return false;
  if (a.year && b.year && String(a.year) !== String(b.year)) return false;
  const names = new Set([a.title, ...a.aliases || []].map(normalize).filter(Boolean));
  return [b.title, ...b.aliases || []].some(n => names.has(normalize(n)));
}

export function validBackup(data) {
  return data?.schemaVersion === 1 && Array.isArray(data.items) && data.items.length <= 20000 &&
    data.items.every(i => i && typeof i.id === 'string' && i.id.length > 0 &&
      typeof i.title === 'string' && (i.title.trim().length > 0 || i.imported === true) && i.title.length <= 500 &&
      ['series', 'movie'].includes(i.kind) && ['want','watching','done','dropped'].includes(i.status) &&
      Array.isArray(i.watched) && i.watched.every(w => typeof w === 'string' && /^\d+-\d+$/.test(w)) &&
      (!i.aliases || Array.isArray(i.aliases) && i.aliases.every(a => typeof a === 'string')) &&
      (!i.release || typeof i.release === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(i.release) && !Number.isNaN(Date.parse(i.release))) &&
      (i.externalRating == null || typeof i.externalRating === 'number' && Number.isFinite(i.externalRating) && i.externalRating >= 0 && i.externalRating <= (i.kind === 'series' ? 10 : 100))) &&
    new Set(data.items.map(i => i.id)).size === data.items.length;
}

export function calendarIndex(calendar, date) {
  const result = new Map();
  for (const e of calendar) {
    if (!e.showId || !e.airdate || e.airdate < date) continue;
    const prior = result.get(e.showId);
    if (!prior || e.airdate < prior.airdate || e.airdate === prior.airdate && e.number < prior.number) result.set(e.showId, e);
  }
  return result;
}

// A failed or corrupt saved copy must never silently replace the user's history.
export function readSaved(storage, key) {
  const raw = storage.getItem(key);
  if (raw === null) return null;
  const saved = JSON.parse(raw);
  if (!validBackup(saved)) throw new Error('invalid-library');
  return saved;
}

export function seriesProgress(item, catalog, date) {
  if(item.kind!=='series'||!catalog?.episodes?.length) return {complete:false,caughtUp:false};
  const watched=new Set(item.watched);
  const released=catalog.episodes.filter(e=>e.date&&e.date<=date);
  const caughtUp=released.length>0&&released.every(e=>watched.has(e.code));
  // Missing dates and announced future episodes must not count as a finished series.
  const complete=catalog.ended&&caughtUp&&catalog.episodes.every(e=>e.date&&e.date<=date&&watched.has(e.code));
  return {complete:!!complete,caughtUp:caughtUp&&!complete,released:released.length};
}

export function reconcileSeries(item, catalog, date) {
  const progress=seriesProgress(item,catalog,date);
  if(item.status==='watching'&&!item.statusManual&&progress.complete){item.status='done';return true;}
  return false;
}
