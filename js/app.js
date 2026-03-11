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
        window.location.href = `project?id=${id}`;
      }
    });
  }

  return card;
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
