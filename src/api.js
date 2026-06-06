const BLOGGER_KEY = "AIzaSyAZ_3ABNX0oH2FaimGJ-hTId8zE1R_-h8M";
const BLOG_ID     = "411167890297311427";
const BLOGGER_URL = "https://www.googleapis.com/blogger/v3/blogs";
const BLOG_URL    = "https://www.cinewick.shop";

// ── Descifrado de URLs encriptadas (CW: prefix) ──────────────
const CWK = "Xk7mN3pQ8vR2wL5j";

function xorStr(str, key) {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

function cwDecrypt(cipher) {
  try {
    if (!cipher || !cipher.startsWith("CW:")) return cipher;
    const b64  = cipher.slice(3);
    const bin  = atob(b64);
    const result = xorStr(bin, CWK);
    if (result && result.startsWith("http")) return result;
  } catch {}
  return cipher;
}

const TMDB_KEY  = "51800c8d9e13631a7ded6f17f363e7a5";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG  = "https://image.tmdb.org/t/p/w500";
const TMDB_BACK = "https://image.tmdb.org/t/p/w780";
const LANGS     = ["es-MX", "es-ES", "en-US"];

// Fetch con timeout manual (compatible con React Native)
function fetchWithTimeout(url, ms = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout")), ms);
    fetch(url)
      .then((res) => { clearTimeout(timer); resolve(res); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

async function fetchBlogger(label, pageToken = null) {
  let url = `${BLOGGER_URL}/${BLOG_ID}/posts?key=${BLOGGER_KEY}&maxResults=20&fetchBodies=true&fetchImages=true`;
  if (label && label !== "all") url += `&labels=${encodeURIComponent(label)}`;
  if (pageToken) url += `&pageToken=${pageToken}`;
  const res = await fetchWithTimeout(url, 12000);
  if (!res.ok) throw new Error("Blogger error " + res.status);
  return res.json();
}

async function searchBlogger(query) {
  const url = `${BLOGGER_URL}/${BLOG_ID}/posts/search?key=${BLOGGER_KEY}&q=${encodeURIComponent(query)}&fetchBodies=true`;
  const res = await fetchWithTimeout(url, 12000);
  if (!res.ok) throw new Error("Search error " + res.status);
  return res.json();
}

function parseTmdb(html) {
  const id      = html.match(/class=["']tmdb-id["'][^>]*>\s*(\d+)/)?.[1]
               || html.match(/tmdb-id[^>]*>\s*(\d+)/)?.[1]
               || null;
  const type    = html.match(/class=["']tmdb-type["'][^>]*>\s*(movie|tv)/)?.[1]
               || html.match(/tmdb-type[^>]*>\s*(movie|tv)/)?.[1]
               || "movie";
  const season  = html.match(/class=["']tmdb-season["'][^>]*>\s*(\d+)/)?.[1]
               || html.match(/tmdb-season[^>]*>\s*(\d+)/)?.[1]
               || null;
  const seasonName = html.match(/class=["']tmdb-season-name["'][^>]*>\s*([^<]+)/)?.[1]?.trim()
                  || null;
  return { id, type, season: season ? parseInt(season) : null, seasonName };
}

function firstImage(html) {
  return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
}

function plain(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parsePost(post) {
  const html   = post.content ?? "";
  const text   = plain(html);
  const labels = post.labels ?? [];
  const { id: tmdbId, type: tmdbType, season: tmdbSeason, seasonName: tmdbSeasonName } = parseTmdb(html);
  return {
    id:       post.id,
    tmdbId,
    tmdbType,
    tmdbSeason,
    tmdbSeasonName,
    title:    post.title,
    date:     post.published?.slice(0, 10) ?? "",
    image:    post.images?.[0]?.url || firstImage(html),
    backdrop: null,
    summary:  text.slice(0, 200),
    content:  text.slice(0, 800),
    labels,
    url:      post.url ?? "https://www.cinewick.shop",
    year:     text.match(/\b(19|20)\d{2}\b/)?.[0] ?? null,
    rating:   null,
  };
}

async function tmdbFetch(path) {
  for (const lang of LANGS) {
    try {
      const sep = path.includes("?") ? "&" : "?";
      const res = await fetchWithTimeout(
        `${TMDB_BASE}${path}${sep}api_key=${TMDB_KEY}&language=${lang}`, 6000
      );
      if (!res.ok) continue;
      const data = await res.json();
      if ((data.overview && data.overview.length > 10) || lang === "en-US") return data;
    } catch { continue; }
  }
  return null;
}

async function enrich(post) {
  if (!post.tmdbId) return post;
  try {
    const t = await tmdbFetch(`/${post.tmdbType}/${post.tmdbId}?append_to_response=release_dates,content_ratings`);
    if (!t) return post;

    const baseTitle = post.tmdbType === "movie" ? t.title : t.name;
    const date      = post.tmdbType === "movie" ? t.release_date : t.first_air_date;
    let image       = t.poster_path   ? `${TMDB_IMG}${t.poster_path}`    : post.image;
    let backdrop    = t.backdrop_path ? `${TMDB_BACK}${t.backdrop_path}` : null;
    let overview    = t.overview || post.content;
    let title       = baseTitle || post.title;

    // Si es serie con temporada específica, buscar datos de esa temporada
    if (post.tmdbType === "tv" && post.tmdbSeason) {
      try {
        const s = await tmdbFetch(`/tv/${post.tmdbId}/season/${post.tmdbSeason}`);
        if (s) {
          if (s.poster_path) image    = `${TMDB_IMG}${s.poster_path}`;
          if (s.poster_path) backdrop = `${TMDB_BACK}${s.poster_path}`;
          if (s.overview && s.overview.length > 10) overview = s.overview;
          const sName = post.tmdbSeasonName || s.name || `Temporada ${post.tmdbSeason}`;
          title = `${baseTitle} — ${sName}`;
        }
      } catch {}
    }

    // Extraer certificación de edad
    let certification = null;
    try {
      if (post.tmdbType === "movie") {
        const releases = t.release_dates?.results || [];
        const us = releases.find(r => r.iso_3166_1 === "US");
        const ar = releases.find(r => r.iso_3166_1 === "AR");
        const cert = (ar || us)?.release_dates?.[0]?.certification;
        if (cert) certification = cert;
      } else {
        const ratings = t.content_ratings?.results || [];
        const us = ratings.find(r => r.iso_3166_1 === "US");
        const ar = ratings.find(r => r.iso_3166_1 === "AR");
        certification = (ar || us)?.rating || null;
      }
    } catch {}

    return {
      ...post,
      title,
      image,
      backdrop,
      rating:        t.vote_average ? t.vote_average.toFixed(1) : post.rating,
      year:          date ? date.slice(0, 4) : post.year,
      content:       overview,
      summary:       overview ? overview.slice(0, 200) : post.summary,
      certification,
    };
  } catch { return post; }
}

async function enrichAll(posts) {
  const out = [], BATCH = 5;
  for (let i = 0; i < posts.length; i += BATCH) {
    const chunk = await Promise.all(posts.slice(i, i + BATCH).map(enrich));
    out.push(...chunk);
  }
  return out;
}

const pageTokenCache = {};

export async function fetchPosts(label = "all", pageNum = 1) {
  const token = pageNum > 1 ? pageTokenCache[`${label}_${pageNum}`] : null;
  const data  = await fetchBlogger(label === "all" ? null : label, token);
  if (data.nextPageToken) {
    pageTokenCache[`${label}_${pageNum + 1}`] = data.nextPageToken;
  }
  const posts = (data.items ?? []).map(parsePost);
  return enrichAll(posts);
}

export async function searchContent(query) {
  const data  = await searchBlogger(query);
  const posts = (data.items ?? []).map(parsePost);
  return enrichAll(posts);
}

// ── Obtener tráiler de YouTube via TMDB ───────────────────────
export async function fetchTrailer(tmdbId, tmdbType) {
  if (!tmdbId) return null;
  for (const lang of ["es-MX", "es-ES", "en-US"]) {
    try {
      const res = await fetchWithTimeout(
        `${TMDB_BASE}/${tmdbType}/${tmdbId}/videos?api_key=${TMDB_KEY}&language=${lang}`, 6000
      );
      if (!res.ok) continue;
      const data = await res.json();
      const trailer = (data.results || []).find(
        (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
      );
      if (trailer) return trailer.key; // YouTube video key
    } catch { continue; }
  }
  return null;
}

// ── Detalle completo de TMDB ───────────────────────────────────
export async function fetchFullDetail(tmdbId, tmdbType) {
  if (!tmdbId) return null;
  for (const lang of ["es-MX", "es-ES", "en-US"]) {
    try {
      const url = `${TMDB_BASE}/${tmdbType}/${tmdbId}?api_key=${TMDB_KEY}&language=${lang}&append_to_response=credits,release_dates,content_ratings`;
      const res = await fetchWithTimeout(url, 8000);
      if (!res.ok) continue;
      const data = await res.json();
      if ((data.overview && data.overview.length > 10) || lang === "en-US") return data;
    } catch { continue; }
  }
  return null;
}
