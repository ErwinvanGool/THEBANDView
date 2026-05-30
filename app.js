/* ============================================================
   THEBANDView – app.js
   Vanilla JavaScript · No frameworks · GitHub Pages ready
   ============================================================

   HOW IT WORKS
   ────────────
   1. On page load, data/videos.json is fetched.
   2. YouTube video IDs are extracted from each youtubeUrl.
   3. Thumbnails are automatically generated using the video ID.
   4. Category chips are built from the unique categories in the data.
   5. "Voor jouw uitgekozen" section shows NEWEST_COUNT random videos (within active category).
   6. Main grid shows all videos (or filtered by category).
   7. Tapping a card opens the modal and starts YouTube playback.
   8. The YouTube IFrame API is used so we can detect when a video
      ends and automatically advance to the next one.

   TO ADD VIDEOS  →  edit data/videos.json only.
   ============================================================ */

'use strict';

/* ── Configuration ────────────────────────────────────── */
const NEWEST_COUNT  = 6;   // number of videos shown in the "Voor jouw uitgekozen" row
const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQw_z5XuGMTmRkr6B0G4m7PwSW5BfatlcWtZfKvJ1BQoKZ8UNB2FAq1sqgMAgjBPRUInOxagPw5PIbu/pub?output=csv';
const FALLBACK_URL   = 'data/videos.json';

// YouTube Data API v3 key — injected at deploy time via GitHub Actions.
// Do NOT put the real key here. Store it as a GitHub Secret named YOUTUBE_API_KEY.
const YOUTUBE_API_KEY = '__YOUTUBE_API_KEY__';

const DATE_CACHE_KEY = 'theband_yt_dates';
const DATE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // refresh cached dates after 7 days

/* ── App state ────────────────────────────────────────── */
let allVideos      = [];  // every video from JSON (sorted newest first)
let filteredVideos = [];  // videos currently shown (active category filter)
let currentIndex   = 0;  // index of the open video inside filteredVideos
let activeCategory = 'all';

/* ── YouTube player state ─────────────────────────────── */
let ytPlayer       = null;   // YT.Player instance (created once, reused)
let ytApiReady     = false;  // true once onYouTubeIframeAPIReady fires
let pendingVideoId = null;   // video to load once the API is ready


/* ============================================================
   YouTube IFrame API callback  (must be a global function)
   ============================================================ */
window.onYouTubeIframeAPIReady = function () {
  ytApiReady = true;
  // If the user clicked a video before the API was ready, play it now
  if (pendingVideoId !== null) {
    createOrLoadPlayer(pendingVideoId);
    pendingVideoId = null;
  }
};


/* ============================================================
   Data loading
   ============================================================ */

/**
 * Parse a CSV string into an array of objects using the first row as headers.
 */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    // Handle quoted fields that may contain commas
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += line[i];
      }
    }
    fields.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = fields[i] || ''; });
    return obj;
  });
}

async function loadVideos() {
  let videos = null;

  // 1. Try Google Sheets CSV
  try {
    const res = await fetch(SHEETS_CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    const rows = parseCSV(csv);
    // Expect columns: title, youtubeUrl, category, date
    videos = rows.filter(r => r.youtubeUrl);
  } catch (err) {
    console.warn('Google Sheets niet beschikbaar, terugvallen op lokale data:', err);
  }

  // 2. Fall back to videos.json
  if (!videos) {
    try {
      const res = await fetch(FALLBACK_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      videos = data.videos;
    } catch (err) {
      console.error('Kon video data niet laden:', err);
      document.getElementById('main-grid').innerHTML =
        '<p style="color:#888;padding:20px 0">Kon video\'s niet laden.<br>' +
        'Controleer de Google Sheet of <code>data/videos.json</code>.</p>';
      return;
    }
  }

  // Enrich each video with a derived videoId
  let enriched = videos
    .map(v => ({ ...v, videoId: extractVideoId(v.youtubeUrl) }))
    .filter(v => v.videoId); // skip entries without a valid URL

  // Fetch publish dates from YouTube; falls back to empty string when no API key
  enriched = await fetchYouTubeDates(enriched);

  allVideos = enriched.sort((a, b) => parseDate(b.date) - parseDate(a.date)); // newest first

  buildCategoryNav();
  applyFilter('all');
}


/* ============================================================
   YouTube date fetching
   ============================================================ */

/**
 * Fetch the publish date for each video from the YouTube Data API v3.
 * Results are cached in localStorage for DATE_CACHE_TTL milliseconds to
 * minimise API quota usage.  When YOUTUBE_API_KEY is empty the videos are
 * returned unchanged (date field stays empty and they sort to the bottom).
 */
async function fetchYouTubeDates(videos) {
  if (!YOUTUBE_API_KEY) return videos;

  // Load existing cache
  let cache = {};
  try {
    const raw = localStorage.getItem(DATE_CACHE_KEY);
    if (raw) {
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < DATE_CACHE_TTL) cache = data;
    }
  } catch { /* ignore parse errors */ }

  // Collect IDs not yet in cache
  const missing = videos.map(v => v.videoId).filter(id => !cache[id]);

  // YouTube API accepts up to 50 IDs per request
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50).join(',');
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(batch)}&part=snippet&key=${encodeURIComponent(YOUTUBE_API_KEY)}`;
      const res = await fetch(url);
      if (!res.ok) { console.warn('YouTube API error', res.status); continue; }
      const json = await res.json();
      json.items.forEach(item => {
        cache[item.id] = item.snippet.publishedAt; // ISO-8601 string
      });
    } catch (err) {
      console.warn('Kon YouTube-datum niet ophalen:', err);
    }
  }

  // Persist updated cache
  try {
    localStorage.setItem(DATE_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: cache }));
  } catch { /* storage quota exceeded — continue without caching */ }

  return videos.map(v => ({ ...v, date: cache[v.videoId] || '' }));
}


/* ============================================================
   YouTube utilities
   ============================================================ */

/**
 * Extract the 11-character YouTube video ID from any standard YouTube URL.
 * Supports:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 */
function extractVideoId(url) {
  if (!url) return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,          // watch?v=
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,     // youtu.be/
    /embed\/([a-zA-Z0-9_-]{11})/,          // embed/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Return the best-available YouTube thumbnail URL for a video.
 * hqdefault (480×360) is always present; maxresdefault may not be.
 * We try maxresdefault first and fall back via the onerror handler in the card.
 */
function getThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

function getThumbnailFallback(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}


/* ============================================================
   Category navigation
   ============================================================ */
function buildCategoryNav() {
  const nav = document.getElementById('category-nav');
  nav.innerHTML = '';

  // "All" chip first, then one chip per unique category
  const categories = ['all', ...new Set(allVideos.map(v => v.category))];

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-chip' + (cat === 'all' ? ' active' : '');
    btn.dataset.category = cat;
    btn.textContent = cat === 'all' ? 'Alles' : cat;
    btn.setAttribute('aria-pressed', cat === 'all' ? 'true' : 'false');
    btn.addEventListener('click', () => applyFilter(cat));
    nav.appendChild(btn);
  });
}

function applyFilter(category) {
  activeCategory = category;

  // Update chip state
  document.querySelectorAll('.category-chip').forEach(chip => {
    const isActive = chip.dataset.category === category;
    chip.classList.toggle('active', isActive);
    chip.setAttribute('aria-pressed', String(isActive));
  });

  // Rebuild filtered list
  filteredVideos = category === 'all'
    ? [...allVideos]
    : allVideos.filter(v => v.category === category);

  // Update section title
  const titleEl = document.getElementById('videos-section-title');
  titleEl.textContent = category === 'all' ? "Alle video's" : category;

  // Show / hide "no videos" message
  const noMsg = document.getElementById('no-videos-msg');
  noMsg.classList.toggle('hidden', filteredVideos.length > 0);

  renderNewest();
  renderMain();
}


/* ============================================================
   Rendering
   ============================================================ */

/** Build a single video card element. */
function createVideoCard(video, indexInFiltered) {
  const card = document.createElement('div');
  card.className = 'video-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Speel ${video.title}`);

  const thumbUrl     = getThumbnailUrl(video.videoId);
  const thumbFallback = getThumbnailFallback(video.videoId);

  card.innerHTML = `
    <div class="thumbnail-wrap">
      <img
        class="video-thumbnail"
        src="${thumbUrl}"
        alt="${escapeHtml(video.title)}"
        loading="lazy"
        onload="if(this.naturalWidth===120){this.src='${thumbFallback}'}"
        onerror="if(this.src!=='${thumbFallback}'){this.src='${thumbFallback}'}"
      />
      <div class="play-overlay" aria-hidden="true">&#9654;</div>
    </div>
    <div class="video-info">
      <span class="video-category-tag">${escapeHtml(video.category)}</span>
      <p class="video-title">${escapeHtml(video.title)}</p>
    </div>
  `;

  // Open video on click or keyboard Enter/Space
  card.addEventListener('click', () => openVideo(indexInFiltered));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openVideo(indexInFiltered);
    }
  });

  return card;
}

/** Render the "Voor jouw uitgekozen" section (NEWEST_COUNT random videos from filtered list). */
function renderNewest() {
  const grid    = document.getElementById('newest-grid');
  const section = document.getElementById('newest-section');
  grid.innerHTML = '';

  // Pick random videos from the filtered list (Fisher-Yates shuffle, then take first N)
  const pool = [...filteredVideos];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, NEWEST_COUNT);

  if (picked.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  picked.forEach(video => {
    const idx = filteredVideos.indexOf(video);
    grid.appendChild(createVideoCard(video, idx));
  });
}

/** Render the main grid with all filtered videos. */
function renderMain() {
  const grid = document.getElementById('main-grid');
  grid.innerHTML = '';

  filteredVideos.forEach((video, i) => {
    grid.appendChild(createVideoCard(video, i));
  });
}


/* ============================================================
   Video playback
   ============================================================ */

/** Open the modal and start playing the video at filteredVideos[index]. */
function openVideo(index) {
  if (index < 0 || index >= filteredVideos.length) return;

  currentIndex = index;
  const video = filteredVideos[index];
  if (!video || !video.videoId) return;

  // Show modal and lock body scroll
  document.getElementById('modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  updateModalMeta();

  if (ytApiReady) {
    createOrLoadPlayer(video.videoId);
  } else {
    // API not ready yet — store it and play once the callback fires
    pendingVideoId = video.videoId;
  }
}

/**
 * Create the YT.Player on first call; on subsequent calls, just load the new video.
 * The player is created inside #youtube-player, which the API replaces with an <iframe>.
 */
function createOrLoadPlayer(videoId) {
  if (ytPlayer) {
    ytPlayer.loadVideoById(videoId);
  } else {
    ytPlayer = new YT.Player('youtube-player', {
      videoId,
      playerVars: {
        autoplay:        1,
        rel:             0,   // no "related videos" from other channels
        modestbranding:  1,   // smaller YouTube logo
        playsinline:     1,   // CRITICAL: prevents iOS full-screen takeover
        fs:              1,   // allow full-screen button
        iv_load_policy:  3,   // hide video annotations
      },
      events: {
        onReady:       event => event.target.playVideo(),
        onStateChange: onPlayerStateChange,
      },
    });
  }
}

/** Handle YouTube player state changes. Auto-advance when video ends. */
function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    nextVideo();
  }
}

/** Close the modal and pause playback. */
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.body.style.overflow = '';

  if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
    ytPlayer.pauseVideo();
  }
}

/** Advance to the next video (wraps around). */
function nextVideo() {
  const next = (currentIndex + 1) % filteredVideos.length;
  openVideo(next);
}

/** Go back to the previous video (wraps around). */
function prevVideo() {
  const prev = (currentIndex - 1 + filteredVideos.length) % filteredVideos.length;
  openVideo(prev);
}

/** Play a random video from the current filtered list. */
function playRandom() {
  if (filteredVideos.length === 0) return;
  const randomIndex = Math.floor(Math.random() * filteredVideos.length);
  openVideo(randomIndex);
}

/** Update the modal title and counter display. */
function updateModalMeta() {
  const video = filteredVideos[currentIndex];
  document.getElementById('modal-title').textContent   = video.title;
  document.getElementById('modal-counter').textContent =
    `${currentIndex + 1} / ${filteredVideos.length}`;

  // Disable nav buttons when there's only one video
  const hasMultiple = filteredVideos.length > 1;
  document.getElementById('prev-btn').disabled = !hasMultiple;
  document.getElementById('next-btn').disabled = !hasMultiple;

  renderModalSuggestions();
}

/** Render 4 random video suggestions in the modal strip, excluding the current video. */
function renderModalSuggestions() {
  const container = document.getElementById('modal-suggestions');
  container.innerHTML = '';

  const pool = filteredVideos
    .map((v, i) => ({ v, i }))
    .filter(({ i }) => i !== currentIndex);

  if (pool.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = '';

  // Fisher-Yates shuffle, then take first 4
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  pool.slice(0, 4).forEach(({ v, i }) => {
    const thumbUrl = getThumbnailUrl(v.videoId);
    const fallback = getThumbnailFallback(v.videoId);

    const card = document.createElement('div');
    card.className = 'suggestion-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Speel ${v.title}`);
    card.innerHTML = `
      <div class="suggestion-thumb-wrap">
        <img
          class="suggestion-thumb"
          src="${thumbUrl}"
          alt="${escapeHtml(v.title)}"
          loading="lazy"
          onload="if(this.naturalWidth===120){this.src='${fallback}'}"
          onerror="if(this.src!=='${fallback}'){this.src='${fallback}'}"
        />
      </div>
      <div class="suggestion-info">
        <p class="suggestion-title">${escapeHtml(v.title)}</p>
      </div>
    `;

    card.addEventListener('click', () => openVideo(i));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openVideo(i);
      }
    });

    container.appendChild(card);
  });
}


/* ============================================================
   Utility helpers
   ============================================================ */

/**
 * Parse a date string safely. Returns epoch (Jan 1 1970) for empty or
 * invalid dates so those videos sort to the bottom of the "newest" list.
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

/** Safely escape HTML special characters to prevent XSS. */
function escapeHtml(str) {
  const el = document.createElement('div');
  el.textContent = String(str ?? '');
  return el.innerHTML;
}


/* ============================================================
   Event listeners
   ============================================================ */

// Modal controls
document.getElementById('close-btn').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', closeModal);
document.getElementById('prev-btn').addEventListener('click', prevVideo);
document.getElementById('next-btn').addEventListener('click', nextVideo);

// Random play button in header
document.getElementById('random-btn').addEventListener('click', playRandom);

// Keyboard shortcuts (while modal is open)
document.addEventListener('keydown', e => {
  if (document.getElementById('modal').classList.contains('hidden')) return;

  switch (e.key) {
    case 'Escape':      closeModal(); break;
    case 'ArrowRight':  nextVideo();  break;
    case 'ArrowLeft':   prevVideo();  break;
  }
});


/* ============================================================
   Boot
   ============================================================ */
loadVideos();
