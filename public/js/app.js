/* ================================================
   GRACIE'S BRAND — App JavaScript
   Form handling, Firestore integration, UI interactions
   ================================================ */

// ---- Firebase Initialization ----
// Config loaded from firebase-config.js (not committed to git)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ---- DOM Elements ----
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const bookingForm = document.getElementById('bookingForm');
const submitBtn = document.getElementById('submitBtn');
const formSuccess = document.getElementById('formSuccess');
const formError = document.getElementById('formError');
const newRequestBtn = document.getElementById('newRequestBtn');

// ---- Mobile Navigation Toggle ----
navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('active');
  navLinks.classList.toggle('active');
});

// Close mobile nav when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('active');
    navLinks.classList.remove('active');
  });
});

// ---- Navbar Scroll Effect ----
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  const scrollY = window.scrollY;

  if (scrollY > 50) {
    navbar.style.boxShadow = '0 2px 30px rgba(0, 0, 0, 0.1)';
  } else {
    navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.06)';
  }
  lastScroll = scrollY;
});

// ---- Scroll Animations ----
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Apply fade-in to sections
document.querySelectorAll('.service-card, .music-card, .testimonial-card, .timeline-item, .song-card').forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// ---- Song Library ----
const songCheckboxes = document.querySelectorAll('input[name="requestedSongs"]');
const songSelectionBar = document.getElementById('songSelectionBar');
const selectedCountEl = document.getElementById('selectedCount');

function getSelectedSongs() {
  return Array.from(songCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
}

function updateSongSelection() {
  const selected = getSelectedSongs();
  const count = selected.length;

  selectedCountEl.textContent = count === 0
    ? '0 songs selected'
    : count === 1
      ? '1 song selected'
      : `${count} songs selected`;

  songSelectionBar.classList.toggle('visible', count > 0);

  // Toggle selected class on cards
  songCheckboxes.forEach(cb => {
    cb.closest('.song-card').classList.toggle('selected', cb.checked);
  });
}

songCheckboxes.forEach(cb => {
  cb.addEventListener('change', updateSongSelection);
});

// ---- Form Validation ----
function validateForm() {
  let isValid = true;
  const requiredFields = bookingForm.querySelectorAll('[required]');

  requiredFields.forEach(field => {
    field.classList.remove('error');

    if (!field.value.trim()) {
      field.classList.add('error');
      isValid = false;
    }

    // Email validation
    if (field.type === 'email' && field.value.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(field.value.trim())) {
        field.classList.add('error');
        isValid = false;
      }
    }
  });

  return isValid;
}

// Clear error styling on input
bookingForm.querySelectorAll('input, select, textarea').forEach(field => {
  field.addEventListener('input', () => {
    field.classList.remove('error');
    formError.style.display = 'none';
  });
});

// ---- Form Submission ----
bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  // Show loading state
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  submitBtn.disabled = true;
  formError.style.display = 'none';

  // Collect form data
  const bookingData = {
    fullName: document.getElementById('fullName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    organization: document.getElementById('organization').value.trim(),
    eventType: document.getElementById('eventType').value,
    ageGroup: document.getElementById('ageGroup').value || '',
    preferredDate: document.getElementById('preferredDate').value,
    preferredTime: document.getElementById('preferredTime').value || '',
    audienceSize: document.getElementById('audienceSize').value || '',
    location: document.getElementById('location').value.trim(),
    details: document.getElementById('details').value.trim(),
    requestedSongs: getSelectedSongs(),
    submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
    status: 'new',
    notificationSent: false
  };

  try {
    await db.collection('bookingRequests').add(bookingData);

    // Show success
    bookingForm.style.display = 'none';
    formSuccess.style.display = 'block';
    formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    console.error('Error submitting booking:', error);
    formError.style.display = 'block';
  } finally {
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    submitBtn.disabled = false;
  }
});

// ---- New Request Button ----
newRequestBtn.addEventListener('click', () => {
  bookingForm.reset();
  songCheckboxes.forEach(cb => { cb.checked = false; });
  updateSongSelection();
  bookingForm.style.display = 'flex';
  formSuccess.style.display = 'none';
  bookingForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---- Set minimum date to today ----
const dateInput = document.getElementById('preferredDate');
const today = new Date().toISOString().split('T')[0];
dateInput.setAttribute('min', today);
