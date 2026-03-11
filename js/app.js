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
  if (!pageType || pageType === 'home' || pageType === 'contact') return;
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
    // Simple query — no composite index needed
    const snapshot = await db.collection('projects')
      .where('category', '==', pageType)
      .get();

    // Filter and sort client-side
    const projects = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.published) projects.push({ id: doc.id, ...data });
    });
    projects.sort((a, b) => (a.order || 0) - (b.order || 0));

    // If Firebase has published projects, show them instead of fallback
    if (projects.length > 0) {
      if (fallback) fallback.style.display = 'none';
      grid.innerHTML = '';
      projects.forEach(project => {
        const card = createProjectCard(project.id, project, pageType);
        grid.appendChild(card);
      });
    } else {
      // No projects in Firebase — keep showing the fallback content
      grid.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading content:', error);
    // On error, just keep showing fallback
    grid.style.display = 'none';
  }
}

// --- Create Project Card ---
function createProjectCard(id, data, pageType) {
  const card = document.createElement('div');

  if (pageType === 'photography') {
    card.className = 'photo-item';
    card.setAttribute('data-lightbox', data.thumbnailUrl || '');
    card.innerHTML = `<img src="${data.thumbnailUrl || ''}" alt="${data.title || ''}" loading="lazy">`;
    // Re-init lightbox for dynamically added items
    card.addEventListener('click', () => {
      const lightbox = document.getElementById('lightbox');
      if (lightbox) {
        lightbox.querySelector('img').src = data.thumbnailUrl || '';
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
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
        window.location.href = `project.html?id=${id}`;
      }
    });
  }

  return card;
}
