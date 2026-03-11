// ==============================================
// Admin Panel — Tessa van der Riet Portfolio
// ==============================================

let currentCategory = 'film';
let currentProjectId = null;
let thumbnailUrl = '';
let galleryUrls = [];

document.addEventListener('DOMContentLoaded', () => {
  // Check Firebase config
  try {
    const app = firebase.app();
    if (app.options.apiKey === 'YOUR_API_KEY') {
      showToast('Firebase is not configured yet. Check js/firebase-config.js', 'error');
      return;
    }
  } catch (e) {
    showToast('Firebase is not configured yet.', 'error');
    return;
  }

  initAuth();
  initTabs();
  initForm();
  initPageContent();
});

// ---- Auth ----
function initAuth() {
  auth.onAuthStateChanged(user => {
    if (user) {
      showDashboard(user);
    } else {
      showLogin();
    }
  });

  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
}

async function handleLogin() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  if (!email || !password) {
    errorEl.textContent = 'Please enter email and password.';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Signing in...';
  errorEl.style.display = 'none';

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    let msg = 'Invalid email or password.';
    if (error.code === 'auth/user-not-found') msg = 'No account found with this email.';
    if (error.code === 'auth/too-many-requests') msg = 'Too many attempts. Try again later.';
    if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-dashboard').style.display = 'none';
}

function showDashboard(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'flex';
  document.getElementById('admin-email').textContent = user.email;
  loadProjects();
  loadPageContent();
}

// ---- Tabs ----
function initTabs() {
  document.querySelectorAll('.admin-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.tab;
      updateCategoryTitle();
      showListView();
      updateTabView();
      loadPageContent();
    });
  });
}

function updateTabView() {
  const listView = document.getElementById('list-view');
  const editView = document.getElementById('edit-view');
  const contactFields = document.getElementById('contact-fields');

  if (currentCategory === 'contact') {
    listView.style.display = 'none';
    editView.style.display = 'none';
    contactFields.style.display = 'block';
  } else {
    listView.style.display = 'block';
    contactFields.style.display = 'none';
    loadProjects();
  }
}

function updateCategoryTitle() {
  const titles = {
    film: 'Film Projects',
    photography: 'Photography',
    commercial: 'Commercial Projects',
    contact: 'Contact Page'
  };
  document.getElementById('category-title').textContent = titles[currentCategory] || 'Projects';
  const viewLink = document.getElementById('view-page-link');
  if (viewLink) {
    viewLink.href = `/${currentCategory}`;
    viewLink.textContent = `View ${currentCategory} page →`;
  }
}

// ---- Load Projects ----
async function loadProjects() {
  const listEl = document.getElementById('projects-list');
  const emptyEl = document.getElementById('projects-empty');
  listEl.innerHTML = '<div class="loading-spinner"></div>';
  emptyEl.style.display = 'none';

  try {
    // Simple query — no composite index needed
    const snapshot = await db.collection('projects')
      .where('category', '==', currentCategory)
      .get();

    // Sort client-side by order field
    const projects = [];
    snapshot.forEach(doc => projects.push({ id: doc.id, ...doc.data() }));
    projects.sort((a, b) => (a.order || 0) - (b.order || 0));

    listEl.innerHTML = '';

    if (projects.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    projects.forEach(project => {
      listEl.appendChild(createProjectItem(project.id, project));
    });
  } catch (error) {
    console.error('Error loading projects:', error);
    listEl.innerHTML = `<div class="empty-state">Error: ${error.message}<br>Make sure Firestore rules allow reads for authenticated users.</div>`;
  }
}

function createProjectItem(id, data) {
  const el = document.createElement('div');
  el.className = 'project-item';
  el.innerHTML = `
    ${data.thumbnailUrl ? `<img class="item-thumb" src="${data.thumbnailUrl}" alt="">` : '<div class="item-thumb"></div>'}
    <div class="item-info">
      <div class="item-title">${escapeHtml(data.title || 'Untitled')}</div>
      <div class="item-meta">${escapeHtml(data.subtitle || '')} · Order: ${data.order || 0}</div>
    </div>
    <span class="item-status ${data.published ? 'published' : 'draft'}">${data.published ? 'Published' : 'Draft'}</span>
    <div class="item-actions">
      <button class="btn btn-sm btn-outline edit-btn">Edit</button>
      <button class="btn btn-sm btn-danger delete-btn">Delete</button>
    </div>
  `;

  el.querySelector('.edit-btn').addEventListener('click', () => editProject(id, data));
  el.querySelector('.delete-btn').addEventListener('click', () => quickDelete(id, data.title));
  return el;
}

// Quick delete from list view
async function quickDelete(id, title) {
  if (!confirm(`Delete "${title || 'Untitled'}"? This cannot be undone.`)) return;
  try {
    await db.collection('projects').doc(id).delete();
    showToast('Project deleted.', 'success');
    loadProjects();
  } catch (error) {
    console.error('Error deleting:', error);
    showToast('Error: ' + error.message, 'error');
  }
}

// ---- Form ----
function initForm() {
  document.getElementById('add-project-btn').addEventListener('click', () => newProject());
  document.getElementById('back-to-list').addEventListener('click', (e) => {
    e.preventDefault();
    showListView();
  });
  document.getElementById('cancel-edit-btn').addEventListener('click', () => showListView());
  document.getElementById('save-project-btn').addEventListener('click', saveProject);
  document.getElementById('delete-project-btn').addEventListener('click', deleteProject);

  // Thumbnail upload
  document.getElementById('thumbnail-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large. Max 5MB.', 'error');
      return;
    }
    try {
      thumbnailUrl = await uploadFile(file, 'thumbnail-progress');
      showThumbnailPreview(thumbnailUrl);
      showToast('Thumbnail uploaded!', 'success');
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    }
    e.target.value = ''; // reset input
  });

  // Gallery upload
  document.getElementById('gallery-files').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        showToast(`${file.name} too large. Skipping.`, 'error');
        continue;
      }
      try {
        const url = await uploadFile(file, 'gallery-progress');
        galleryUrls.push(url);
        showToast(`Uploaded ${file.name}`, 'success');
      } catch (err) {
        showToast(`Failed: ${file.name}`, 'error');
      }
    }
    showGalleryPreview();
    e.target.value = ''; // reset input
  });
}

function newProject() {
  currentProjectId = null;
  thumbnailUrl = '';
  galleryUrls = [];
  clearForm();
  document.getElementById('form-title').textContent = 'New Project';
  document.getElementById('delete-project-btn').style.display = 'none';
  showEditView();
}

function editProject(id, data) {
  currentProjectId = id;
  thumbnailUrl = data.thumbnailUrl || '';
  galleryUrls = data.galleryImages ? [...data.galleryImages] : [];

  document.getElementById('project-id').value = id;
  document.getElementById('project-title').value = data.title || '';
  document.getElementById('project-subtitle').value = data.subtitle || '';
  document.getElementById('project-description').value = data.description || '';
  document.getElementById('project-vimeo').value = data.vimeoUrl || '';
  document.getElementById('project-link').value = data.link || '';
  document.getElementById('project-order').value = data.order || 0;
  document.getElementById('project-published').value = data.published ? 'true' : 'false';

  if (thumbnailUrl) showThumbnailPreview(thumbnailUrl);
  showGalleryPreview();

  document.getElementById('form-title').textContent = 'Edit Project';
  document.getElementById('delete-project-btn').style.display = 'inline-flex';
  showEditView();
}

function clearForm() {
  document.getElementById('project-id').value = '';
  document.getElementById('project-title').value = '';
  document.getElementById('project-subtitle').value = '';
  document.getElementById('project-description').value = '';
  document.getElementById('project-vimeo').value = '';
  document.getElementById('project-link').value = '';
  document.getElementById('project-order').value = '0';
  document.getElementById('project-published').value = 'true';
  document.getElementById('thumbnail-preview').innerHTML = '';
  document.getElementById('gallery-preview').innerHTML = '';
}

async function saveProject() {
  const title = document.getElementById('project-title').value.trim();
  if (!title) {
    showToast('Title is required.', 'error');
    return;
  }

  const btn = document.getElementById('save-project-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const projectData = {
    title,
    subtitle: document.getElementById('project-subtitle').value.trim(),
    description: document.getElementById('project-description').value.trim(),
    vimeoUrl: document.getElementById('project-vimeo').value.trim(),
    link: document.getElementById('project-link').value.trim(),
    order: parseInt(document.getElementById('project-order').value) || 0,
    published: document.getElementById('project-published').value === 'true',
    category: currentCategory,
    thumbnailUrl: thumbnailUrl,
    galleryImages: galleryUrls,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (currentProjectId) {
      await db.collection('projects').doc(currentProjectId).update(projectData);
      showToast('Project updated!', 'success');
    } else {
      projectData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection('projects').add(projectData);
      showToast('Project created!', 'success');
    }
    showListView();
    loadProjects();
  } catch (error) {
    console.error('Error saving:', error);
    showToast('Error: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Project';
  }
}

async function deleteProject() {
  if (!currentProjectId) return;
  if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;

  const btn = document.getElementById('delete-project-btn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  try {
    await db.collection('projects').doc(currentProjectId).delete();
    showToast('Project deleted.', 'success');
    showListView();
    loadProjects();
  } catch (error) {
    console.error('Error deleting:', error);
    showToast('Error: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
  }
}

// ---- File Upload ----
async function uploadFile(file, progressBarId) {
  const progressBar = document.getElementById(progressBarId);
  const fill = progressBar.querySelector('.progress-fill');
  progressBar.style.display = 'block';

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `portfolio/${currentCategory}/${timestamp}_${safeName}`;
  const ref = storage.ref(path);
  const task = ref.put(file);

  return new Promise((resolve, reject) => {
    task.on('state_changed',
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        fill.style.width = pct + '%';
      },
      (error) => {
        console.error('Upload error:', error);
        progressBar.style.display = 'none';
        reject(error);
      },
      async () => {
        try {
          const url = await task.snapshot.ref.getDownloadURL();
          progressBar.style.display = 'none';
          fill.style.width = '0%';
          resolve(url);
        } catch (err) {
          progressBar.style.display = 'none';
          reject(err);
        }
      }
    );
  });
}

// ---- Delete uploaded file from Storage ----
async function deleteStorageFile(url) {
  try {
    const ref = storage.refFromURL(url);
    await ref.delete();
  } catch (e) {
    // File may already be deleted or be a local path — ignore
    console.warn('Could not delete file from storage:', e.message);
  }
}

// ---- Previews ----
function showThumbnailPreview(url) {
  const container = document.getElementById('thumbnail-preview');
  container.innerHTML = `
    <div class="preview-item">
      <img src="${escapeHtml(url)}" alt="Thumbnail">
      <button class="remove-btn" onclick="removeThumbnail()">&times;</button>
    </div>
  `;
}

async function removeThumbnail() {
  if (thumbnailUrl && thumbnailUrl.startsWith('https://firebasestorage')) {
    await deleteStorageFile(thumbnailUrl);
  }
  thumbnailUrl = '';
  document.getElementById('thumbnail-preview').innerHTML = '';
}

function showGalleryPreview() {
  const container = document.getElementById('gallery-preview');
  container.innerHTML = galleryUrls.map((url, i) => `
    <div class="gallery-item">
      <img src="${escapeHtml(url)}" alt="Gallery image">
      <button class="remove-btn" onclick="removeGalleryImage(${i})">&times;</button>
    </div>
  `).join('');
}

async function removeGalleryImage(index) {
  const url = galleryUrls[index];
  if (url && url.startsWith('https://firebasestorage')) {
    await deleteStorageFile(url);
  }
  galleryUrls.splice(index, 1);
  showGalleryPreview();
}

// Make functions available globally for onclick handlers
window.removeThumbnail = removeThumbnail;
window.removeGalleryImage = removeGalleryImage;

// ---- View Switching ----
function showListView() {
  document.getElementById('list-view').style.display = 'block';
  document.getElementById('edit-view').style.display = 'none';
}

function showEditView() {
  document.getElementById('list-view').style.display = 'none';
  document.getElementById('edit-view').style.display = 'block';
}

// ---- Helpers ----
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// ---- Page Content ----
function initPageContent() {
  const toggle = document.getElementById('page-content-toggle');
  const form = document.getElementById('page-content-form');
  if (toggle && form) {
    toggle.addEventListener('click', () => {
      const isOpen = form.style.display !== 'none';
      form.style.display = isOpen ? 'none' : 'block';
      toggle.classList.toggle('open', !isOpen);
    });
  }

  document.getElementById('save-page-content-btn').addEventListener('click', savePageContent);
}

async function loadPageContent() {
  const pageId = currentCategory;
  try {
    const doc = await db.collection('pageContent').doc(pageId).get();
    const data = doc.exists ? doc.data() : {};

    document.getElementById('page-title').value = data.title || '';
    document.getElementById('page-description').value = data.description || '';

    // Contact-specific fields
    const contactFields = document.getElementById('contact-fields');
    if (pageId === 'contact') {
      contactFields.style.display = 'block';
      document.getElementById('page-bio').value = data.bio || '';
      document.getElementById('page-bio2').value = data.bio2 || '';
      document.getElementById('page-email').value = data.email || '';
      document.getElementById('page-phone').value = data.phone || '';
    } else {
      contactFields.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading page content:', error);
  }
}

async function savePageContent() {
  const btn = document.getElementById('save-page-content-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const pageId = currentCategory;
  const data = {
    title: document.getElementById('page-title').value.trim(),
    description: document.getElementById('page-description').value.trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (pageId === 'contact') {
    data.bio = document.getElementById('page-bio').value.trim();
    data.bio2 = document.getElementById('page-bio2').value.trim();
    data.email = document.getElementById('page-email').value.trim();
    data.phone = document.getElementById('page-phone').value.trim();
  }

  try {
    await db.collection('pageContent').doc(pageId).set(data, { merge: true });
    showToast('Page content saved!', 'success');
  } catch (error) {
    console.error('Error saving page content:', error);
    showToast('Error: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Page Settings';
  }
}
