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
   5. "Newest" section shows the NEWEST_COUNT most-recent videos.
   6. Main grid shows all videos (or filtered by category).
   7. Tapping a card opens the modal and starts YouTube playback.
   8. The YouTube IFrame API is used so we can detect when a video
      ends and automatically advance to the next one.

   TO ADD VIDEOS  →  edit data/videos.json only.
   ============================================================ */

'use strict';

/* ── Configuration ────────────────────────────────────── */
const NEWEST_COUNT = 6;   // number of videos shown in the "Newest" row
const DATA_URL     = 'data/videos.json';

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
async function loadVideos() {
  let data;
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error('Kon video data niet laden:', err);
    document.getElementById('main-grid').innerHTML =
      '<p style="color:#888;padding:20px 0">Kon video\'s niet laden.<br>' +
      'Controleer of <code>data/videos.json</code> bestaat en correcte URLs bevat.</p>';
    return;
  }

  // Enrich each video with a derived videoId
  allVideos = data.videos
    .map(v => ({ ...v, videoId: extractVideoId(v.youtubeUrl) }))
    .filter(v => v.videoId)                           // skip entries without a valid URL
    .sort((a, b) => parseDate(b.date) - parseDate(a.date)); // newest first

  buildCategoryNav();
  applyFilter('all');
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

/** Render the "Newest" section (top NEWEST_COUNT videos from filtered list). */
function renderNewest() {
  const grid    = document.getElementById('newest-grid');
  const section = document.getElementById('newest-section');
  grid.innerHTML = '';

  const newest = filteredVideos.slice(0, NEWEST_COUNT);

  if (newest.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  newest.forEach(video => {
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
