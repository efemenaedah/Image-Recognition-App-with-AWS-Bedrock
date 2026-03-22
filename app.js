// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Replace with your actual API Gateway invoke URL
const API_URL = 'https://jfenjg1l8h.execute-api.us-east-1.amazonaws.com/analyze';

// ─── STATE ────────────────────────────────────────────────────────────────────
let selectedFile = null;

// ─── ELEMENTS ─────────────────────────────────────────────────────────────────
const dropZone     = document.getElementById('drop-zone');
const fileInput    = document.getElementById('file-input');
const uploadCard   = document.getElementById('upload-card');
const previewCard  = document.getElementById('preview-card');
const previewImg   = document.getElementById('preview-img');
const clearBtn     = document.getElementById('clear-btn');
const analyzeBtn   = document.getElementById('analyze-btn');
const loadingCard  = document.getElementById('loading-card');
const resultsCard  = document.getElementById('results-card');
const errorCard    = document.getElementById('error-card');
const errorText    = document.getElementById('error-text');
const retryBtn     = document.getElementById('retry-btn');
const newBtn       = document.getElementById('new-btn');
const resultImg    = document.getElementById('result-img');
const descText     = document.getElementById('description-text');
const labelsContainer = document.getElementById('labels-container');
const steps        = [
  document.getElementById('step-1'),
  document.getElementById('step-2'),
  document.getElementById('step-3'),
];

// ─── DROP ZONE ────────────────────────────────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelect(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFileSelect(fileInput.files[0]);
});

// ─── FILE HANDLING ────────────────────────────────────────────────────────────
function handleFileSelect(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    showError('Please upload a JPG, PNG, or WEBP image.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError('Image must be under 10MB.');
    return;
  }

  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    show(previewCard);
    hide(uploadCard);
    hide(errorCard);
  };
  reader.readAsDataURL(file);
}

clearBtn.addEventListener('click', resetToUpload);

// ─── ANALYZE ──────────────────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', analyzeImage);

async function analyzeImage() {
  if (!selectedFile) return;

  analyzeBtn.disabled = true;
  hide(previewCard);
  hide(errorCard);
  show(loadingCard);
  resetSteps();

  try {
    // Step 1 — convert to base64 and send to API
    setStep(0, 'active');
    const base64 = await toBase64(selectedFile);
    // Strip the data URL prefix (data:image/jpeg;base64,...)
    const base64Data = base64.split(',')[1];

    setStep(0, 'done');
    setStep(1, 'active');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Data,
        filename: selectedFile.name,
        contentType: selectedFile.type,
      }),
    });

    setStep(1, 'done');
    setStep(2, 'active');

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    setStep(2, 'done');

    // Small delay so users can see all steps complete
    await delay(400);

    showResults(data);
  } catch (err) {
    console.error(err);
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    analyzeBtn.disabled = false;
  }
}

// ─── RESULTS ──────────────────────────────────────────────────────────────────
function showResults(data) {
  hide(loadingCard);

  // Show the analyzed image (reuse the preview src)
  resultImg.src = previewImg.src;

  // Description from Bedrock
  descText.textContent = data.description || 'No description available.';

  // Labels from Rekognition
  labelsContainer.innerHTML = '';
  const labels = data.labels || [];
  if (labels.length === 0) {
    labelsContainer.innerHTML = '<p style="color:var(--text-muted);font-size:14px">No labels detected.</p>';
  } else {
    labels.forEach((label) => {
      const chip = document.createElement('span');
      chip.className = 'label-chip';
      const confidence = label.Confidence ? Math.round(label.Confidence) : null;
      chip.innerHTML = `${label.Name}${confidence !== null ? `<span class="confidence">${confidence}%</span>` : ''}`;
      labelsContainer.appendChild(chip);
    });
  }

  show(resultsCard);
}

// ─── ERROR ────────────────────────────────────────────────────────────────────
function showError(msg) {
  hide(loadingCard);
  hide(previewCard);
  errorText.textContent = msg;
  show(errorCard);
  show(uploadCard);
}

retryBtn.addEventListener('click', resetToUpload);
newBtn.addEventListener('click', resetToUpload);

// ─── RESET ────────────────────────────────────────────────────────────────────
function resetToUpload() {
  selectedFile = null;
  fileInput.value = '';
  previewImg.src = '';
  hide(previewCard);
  hide(loadingCard);
  hide(resultsCard);
  hide(errorCard);
  show(uploadCard);
  analyzeBtn.disabled = false;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resetSteps() {
  steps.forEach((s) => s.classList.remove('active', 'done'));
}

function setStep(index, state) {
  steps.forEach((s, i) => {
    if (i < index) s.classList.add('done');
    else if (i === index) { s.classList.remove('done'); s.classList.add(state); }
    else { s.classList.remove('active', 'done'); }
  });
}
