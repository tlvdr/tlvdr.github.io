// ==============================================
// Tessa van der Riet — Portfolio App
// ==============================================

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initActiveNav();
  initLightbox();
  loadContent();
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

  // Close menu when clicking a link
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
  if (!pageType || typeof firebase === 'undefined') return;

  // Check if Firebase is configured
  try {
    const app = firebase.app();
    if (app.options.apiKey === 'YOUR_API_KEY') {
      showFallbackContent(pageType);
      return;
    }
  } catch (e) {
    showFallbackContent(pageType);
    return;
  }

  const grid = document.getElementById('content-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const snapshot = await db.collection('projects')
      .where('category', '==', pageType)
      .where('published', '==', true)
      .orderBy('order', 'asc')
      .get();

    if (snapshot.empty) {
      grid.innerHTML = '<div class="empty-state">No projects yet. Check back soon!</div>';
      return;
    }

    grid.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const card = createProjectCard(doc.id, data, pageType);
      grid.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading content:', error);
    showFallbackContent(pageType);
  }
}

// --- Show fallback content (before Firebase is set up) ---
function showFallbackContent(pageType) {
  const grid = document.getElementById('content-grid');
  if (!grid) return;

  const fallback = document.getElementById('fallback-content');
  if (fallback) {
    fallback.style.display = '';
    grid.style.display = 'none';
  }
}

// --- Create Project Card ---
function createProjectCard(id, data, pageType) {
  const card = document.createElement('div');

  if (pageType === 'photography') {
    card.className = 'photo-item';
    card.setAttribute('data-lightbox', data.imageUrl || '');
    card.innerHTML = `<img src="${data.imageUrl || ''}" alt="${data.title || ''}" loading="lazy">`;
  } else {
    card.className = 'project-card';
    card.innerHTML = `
      <img class="card-image" src="${data.thumbnailUrl || ''}" alt="${data.title || ''}" loading="lazy">
      <div class="card-overlay">
        <div class="card-title">${data.title || ''}</div>
        <div class="card-subtitle">${data.subtitle || ''}</div>
      </div>
    `;
    if (data.link) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        window.location.href = data.link;
      });
    }
  }

  return card;
}

// --- Detail Page: Load single project ---
async function loadProjectDetail(projectId) {
  if (typeof firebase === 'undefined') return;

  try {
    const doc = await db.collection('projects').doc(projectId).get();
    if (!doc.exists) return;

    const data = doc.data();
    const container = document.getElementById('project-detail');
    if (!container) return;

    // Populate detail fields
    const titleEl = container.querySelector('.detail-title');
    const descEl = container.querySelector('.detail-description');
    const videoEl = container.querySelector('.detail-video');
    const galleryEl = container.querySelector('.detail-gallery');

    if (titleEl) titleEl.textContent = data.title || '';
    if (descEl) descEl.textContent = data.description || '';

    if (videoEl && data.vimeoUrl) {
      videoEl.innerHTML = `<iframe src="${data.vimeoUrl}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }

    if (galleryEl && data.galleryImages) {
      galleryEl.innerHTML = data.galleryImages.map(url =>
        `<img src="${url}" alt="${data.title}" loading="lazy">`
      ).join('');
    }
  } catch (error) {
    console.error('Error loading project:', error);
  }
}
