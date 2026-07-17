// ==============================================
// Tessa van der Riet — Portfolio App
// ==============================================

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initActiveNav();
  initLightbox();
  loadContent();
  loadPageContent();
});

// --- Mobile Menu ---
function initMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    nav.classList.toggle('open');
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      nav.classList.remove('open');
    });
  });
}

// --- Active Nav Highlight ---
function initActiveNav() {
  const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
  document.querySelectorAll('.site-nav a').forEach(link => {
    const href = link.getAttribute('href').replace('.html', '');
    if (href === currentPage ||
        (currentPage === 'index' && href === 'index.html') ||
        (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// --- Lightbox ---
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const lightboxImg = lightbox.querySelector('img');
  const closeBtn = lightbox.querySelector('.lightbox-close');

  document.querySelectorAll('[data-lightbox]').forEach(item => {
    item.addEventListener('click', () => {
      const src = item.getAttribute('data-lightbox') || item.querySelector('img')?.src;
      if (src) {
        lightboxImg.src = src;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    lightboxImg.src = '';
  }

  closeBtn?.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}

// --- Load Content from Firebase ---
async function loadContent() {
  const pageType = document.body.dataset.page;
  if (!pageType || pageType === 'home' || pageType === 'contact' || pageType === 'project') return;
  if (typeof firebase === 'undefined') return;

  // Check if Firebase is configured
  try {
    const app = firebase.app();
    if (app.options.apiKey === 'YOUR_API_KEY') return;
  } catch (e) {
    return;
  }

  const grid = document.getElementById('content-grid');
  const fallback = document.getElementById('fallback-content');
  if (!grid) return;

  try {
    const snapshot = await db.collection('projects')
      .where('category', '==', pageType)
      .get();

    const projects = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.published) projects.push({ id: doc.id, ...data });
    });
    projects.sort((a, b) => (a.order || 0) - (b.order || 0));

    if (projects.length > 0) {
      if (fallback) fallback.style.display = 'none';
      grid.innerHTML = '';
      projects.forEach(project => {
        const card = createProjectCard(project.id, project, pageType);
        grid.appendChild(card);
      });
    } else {
      grid.style.display = 'none';
    }
  } catch (error) {
    console.warn('Firebase read failed (check Firestore rules allow public reads):', error.code);
    grid.style.display = 'none';
  }
}

// --- Create Project Card ---
function createProjectCard(id, data, pageType) {
  const card = document.createElement('div');

  if (pageType === 'photography') {
    card.className = 'photo-item';
    card.innerHTML = `<img src="${data.thumbnailUrl || ''}" alt="${data.title || ''}" loading="lazy">`;
    card.addEventListener('click', () => openPhotoSlideshow(data));
  } else {
    card.className = 'project-card';
    card.innerHTML = `
      <img class="card-image" src="${data.thumbnailUrl || ''}" alt="${data.title || ''}" loading="lazy">
      <div class="card-overlay">
        <div class="card-title">${data.title || ''}</div>
        <div class="card-subtitle">${data.subtitle || ''}</div>
      </div>
    `;
    // Click to open detail page or external link
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      if (data.link) {
        window.location.href = data.link;
      } else {
        window.location.href = `project?id=${id}`;
      }
    });
  }

  return card;
}

// --- Photo Slideshow Overlay ---
let slideshowState = null;

function getSlideshowEl() {
  let el = document.getElementById('photo-slideshow');
  if (el) return el;

  el = document.createElement('div');
  el.id = 'photo-slideshow';
  el.className = 'photo-slideshow';
  el.innerHTML = `
    <button class="lightbox-close" aria-label="Close">&times;</button>
    <div class="slideshow-stage">
      <button class="slideshow-arrow prev" aria-label="Previous">&#8249;</button>
      <img src="" alt="">
      <button class="slideshow-arrow next" aria-label="Next">&#8250;</button>
    </div>
    <div class="slideshow-caption">
      <h3></h3>
      <p></p>
      <div class="slideshow-dots"></div>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelector('.lightbox-close').addEventListener('click', closePhotoSlideshow);
  el.querySelector('.slideshow-arrow.prev').addEventListener('click', () => stepSlideshow(-1));
  el.querySelector('.slideshow-arrow.next').addEventListener('click', () => stepSlideshow(1));
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.classList.contains('slideshow-stage')) closePhotoSlideshow();
  });

  document.addEventListener('keydown', (e) => {
    if (!slideshowState) return;
    if (e.key === 'Escape') closePhotoSlideshow();
    if (e.key === 'ArrowLeft') stepSlideshow(-1);
    if (e.key === 'ArrowRight') stepSlideshow(1);
  });

  // Swipe support
  let touchX = null;
  el.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) stepSlideshow(dx < 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });

  return el;
}

function openPhotoSlideshow(data) {
  const images = [data.thumbnailUrl, ...(data.galleryImages || [])]
    .filter((url, i, arr) => url && arr.indexOf(url) === i);
  if (images.length === 0) return;

  const el = getSlideshowEl();
  slideshowState = { images, index: 0 };

  el.querySelector('.slideshow-caption h3').textContent = data.title || '';
  el.querySelector('.slideshow-caption p').innerHTML = renderText(data.description || data.subtitle || '');

  const dots = el.querySelector('.slideshow-dots');
  dots.innerHTML = '';
  if (images.length > 1) {
    images.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.setAttribute('aria-label', `Photo ${i + 1}`);
      dot.addEventListener('click', () => { slideshowState.index = i; renderSlideshow(); });
      dots.appendChild(dot);
    });
  }

  // Preload the rest of the series
  images.slice(1).forEach(url => { new Image().src = url; });

  renderSlideshow();
  el.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function renderSlideshow() {
  const el = document.getElementById('photo-slideshow');
  const { images, index } = slideshowState;
  el.querySelector('.slideshow-stage img').src = images[index];
  el.querySelector('.slideshow-arrow.prev').disabled = index === 0;
  el.querySelector('.slideshow-arrow.next').disabled = index === images.length - 1;
  el.querySelectorAll('.slideshow-dots button').forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
}

function stepSlideshow(dir) {
  if (!slideshowState) return;
  const next = slideshowState.index + dir;
  if (next < 0 || next >= slideshowState.images.length) return;
  slideshowState.index = next;
  renderSlideshow();
}

function closePhotoSlideshow() {
  const el = document.getElementById('photo-slideshow');
  if (el) el.classList.remove('active');
  slideshowState = null;
  document.body.style.overflow = '';
}

// --- Render text with markdown-style links: [text](url) ---
function renderText(str) {
  // Escape HTML first to prevent XSS
  const div = document.createElement('div');
  div.textContent = str;
  let safe = div.innerHTML;
  // Convert [link text](url) to <a> tags
  safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" style="color:var(--color-accent);">$1</a>');
  return safe;
}

// --- Load Page Content from Firebase ---
async function loadPageContent() {
  const pageType = document.body.dataset.page;
  if (!pageType || pageType === 'home' || pageType === 'project') return;
  if (typeof firebase === 'undefined') return;

  try {
    const app = firebase.app();
    if (app.options.apiKey === 'YOUR_API_KEY') return;
  } catch (e) {
    return;
  }

  try {
    const doc = await db.collection('pageContent').doc(pageType).get();
    if (!doc.exists) return;
    const data = doc.data();

    if (pageType === 'contact') {
      const bioEl = document.querySelector('.contact-bio');
      if (bioEl && (data.bio || data.bio2 || data.email || data.phone)) {
        let html = '';
        if (data.bio) html += `<p>${renderText(data.bio)}</p>`;
        if (data.bio2) html += `<p>${renderText(data.bio2)}</p>`;
        html += '<div class="contact-info">';
        if (data.email) html += `<p><a href="mailto:${data.email}">${data.email}</a></p>`;
        if (data.phone) html += `<p><a href="tel:${data.phone.replace(/[\s-]/g, '')}">${data.phone}</a></p>`;
        html += '</div>';
        bioEl.innerHTML = html;
      }
    } else {
      // Update page title and description for category pages
      const titleEl = document.querySelector('.page-header h1');
      if (titleEl && data.title) titleEl.textContent = data.title;

      const descEl = document.getElementById('page-description');
      if (descEl && data.description) {
        descEl.innerHTML = renderText(data.description);
        descEl.style.display = 'block';
      }
    }
  } catch (error) {
    // Silently fail — keep static content
  }
}
