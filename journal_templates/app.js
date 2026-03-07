// AI Journal Maker - Frontend JavaScript

let uploadedImages = [];
let currentReport = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeDatePickers();
    loadJournalHistory();
    setupEventListeners();
    loadCurrentUser();
});

// Load current user info
async function loadCurrentUser() {
    try {
        const response = await fetch('/api/me');
        const data = await response.json();
        
        if (data.authenticated) {
            document.getElementById('currentUsername').textContent = data.username;
            window.currentUser = data.username;
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Failed to load user:', error);
        window.location.href = '/login';
    }
}

// Logout function
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = '/login';
    }
}

// Initialize date and time pickers with current values
function initializeDatePickers() {
    const now = new Date();
    document.getElementById('journalDate').value = now.toISOString().split('T')[0];
    document.getElementById('journalTime').value = now.toTimeString().slice(0, 5);
}

// Setup event listeners
function setupEventListeners() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const generateBtn = document.getElementById('generateBtn');
    const saveJournalBtn = document.getElementById('saveJournalBtn');
    const copyReportBtn = document.getElementById('copyReportBtn');

    // Upload zone click
    uploadZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);

    // Generate button
    generateBtn.addEventListener('click', generateReport);

    // Save journal button
    saveJournalBtn.addEventListener('click', saveJournal);

    // Copy report button
    copyReportBtn.addEventListener('click', copyReport);
}

// Handle file selection
function handleFileSelect(event) {
    const files = event.target.files;
    processFiles(files);
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadZone').classList.add('dragover');
}

// Handle drag leave
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadZone').classList.remove('dragover');
}

// Handle drop
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadZone').classList.remove('dragover');
    const files = event.dataTransfer.files;
    processFiles(files);
}

// Process uploaded files
function processFiles(files) {
    for (let file of files) {
        if (!file.type.startsWith('image/')) {
            showAlert('Please upload image files only.', 'warning');
            continue;
        }

        if (file.size > 10 * 1024 * 1024) {
            showAlert(`File ${file.name} exceeds 10MB limit.`, 'warning');
            continue;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImages.push({
                file: file,
                name: file.name,
                data: e.target.result,
                base64: e.target.result.split(',')[1]
            });
            renderImagePreviews();
        };
        reader.readAsDataURL(file);
    }
}

// Render image previews
function renderImagePreviews() {
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = '';

    uploadedImages.forEach((img, index) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.innerHTML = `
            <img src="${img.data}" alt="${img.name}">
            <button class="remove-btn" onclick="removeImage(${index})">
                <i class="bi bi-x"></i>
            </button>
        `;
        container.appendChild(preview);
    });
}

// Remove image
function removeImage(index) {
    uploadedImages.splice(index, 1);
    renderImagePreviews();
}

// Generate AI report
async function generateReport() {
    if (uploadedImages.length === 0) {
        showAlert('Please upload at least one image.', 'warning');
        return;
    }

    const title = document.getElementById('journalTitle').value.trim();
    if (!title) {
        showAlert('Please enter a title for your journal entry.', 'warning');
        return;
    }

    const date = document.getElementById('journalDate').value;
    const time = document.getElementById('journalTime').value;
    const notes = document.getElementById('additionalNotes').value.trim();

    // Show loading
    document.getElementById('generateBtn').disabled = true;
    document.getElementById('loadingSpinner').classList.add('active');
    document.getElementById('reportSection').classList.remove('active');

    const loadingMessages = [
        'Analyzing images with AI...',
        'Extracting details from images...',
        'Generating comprehensive report...',
        'Finalizing your journal entry...'
    ];

    let msgIndex = 0;
    const loadingInterval = setInterval(() => {
        if (msgIndex < loadingMessages.length - 1) {
            msgIndex++;
            document.getElementById('loadingText').textContent = loadingMessages[msgIndex];
        }
    }, 2000);

    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('date', date);
        formData.append('time', time);
        formData.append('notes', notes);

        uploadedImages.forEach((img, index) => {
            formData.append('images', img.file);
        });

        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Analysis failed');
        }

        const result = await response.json();
        currentReport = result;

        // Display report
        displayReport(result);
        showAlert('Report generated successfully!', 'success');
        
        // Clear input form
        clearForm();

    } catch (error) {
        showAlert(`Error: ${error.message}`, 'danger');
    } finally {
        clearInterval(loadingInterval);
        document.getElementById('generateBtn').disabled = false;
        document.getElementById('loadingSpinner').classList.remove('active');
    }
}

// Display generated report
function displayReport(result) {
    const reportSection = document.getElementById('reportSection');
    const reportContent = document.getElementById('reportContent');

    // Get the first uploaded image for display
    const mainImage = uploadedImages.length > 0 ? 
        `<div class="journal-main-image mb-4">
            <img src="${uploadedImages[0].data}" alt="Journal image" class="img-fluid rounded shadow">
        </div>` : '';

    reportContent.innerHTML = `
        ${mainImage}
        <h3 class="report-title">${escapeHtml(result.title)}</h3>
        <p class="text-muted mb-3">
            <i class="bi bi-calendar me-1"></i>${result.date} at ${result.time}
        </p>
        <div class="report-text">${polishReportText(result.report)}</div>
        ${result.analysis ? `<div class="mt-3"><small class="text-muted"><i class="bi bi-eye me-1"></i>Images Analyzed: ${result.image_count}</small></div>` : ''}
    `;

    reportSection.classList.add('active');
    reportSection.scrollIntoView({ behavior: 'smooth' });
}

// Polish report text - remove markdown asterisks and format properly
function polishReportText(text) {
    if (!text) return '';
    
    let polished = text;
    
    // Remove bold markers (** and __)
    polished = polished.replace(/\*\*/g, '');
    polished = polished.replace(/__/g, '');
    
    // Remove bullet point markers (- or * at start of line)
    polished = polished.replace(/^\s*[-*]\s+/gm, '<li>');
    
    // Handle lists - wrap consecutive <li> in <ul>
    if (polished.includes('<li>')) {
        polished = polished.replace(/(<li>.*?<\/li>)/gs, '<ul class="list-unstyled">$1</ul>');
        polished = polished.replace(/<\/ul>\s*<ul class="list-unstyled">/g, '');
    }
    
    // Split into paragraphs by double newlines
    const paragraphs = polished.split(/\n\n+/);
    
    return paragraphs.map(p => {
        p = p.trim();
        if (!p) return '';
        if (p.startsWith('<ul')) return p; // Keep lists as-is
        if (p.startsWith('<li')) return `<ul class="list-unstyled">${p}</ul>`;
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');
}

// Save journal entry
async function saveJournal() {
    if (!currentReport) {
        showAlert('No report to save.', 'warning');
        return;
    }

    // Prepare data matching the Pydantic model
    const journalData = {
        title: currentReport.title || '',
        date: currentReport.date || '',
        time: currentReport.time || '',
        notes: currentReport.notes || '',
        report: currentReport.report || '',
        analysis: currentReport.analysis ? 'true' : '',
        images: currentReport.images || [],
        image_count: currentReport.image_count || 0
    };

    try {
        const response = await fetch('/api/journals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(journalData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Save failed');
        }

        const result = await response.json();
        showAlert('Journal entry saved successfully!', 'success');
        loadJournalHistory();
        
        // Clear report section
        currentReport = null;
        document.getElementById('reportSection').classList.remove('active');

    } catch (error) {
        showAlert(`Error: ${error.message}`, 'danger');
    }
}

// Clear form inputs
function clearForm() {
    // Clear file input
    document.getElementById('fileInput').value = '';
    uploadedImages = [];
    renderImagePreviews();
    
    // Clear text inputs
    document.getElementById('journalTitle').value = '';
    document.getElementById('additionalNotes').value = '';
    
    // Reset date/time to current
    const now = new Date();
    document.getElementById('journalDate').value = now.toISOString().split('T')[0];
    document.getElementById('journalTime').value = now.toTimeString().slice(0, 5);
}

// Copy report to clipboard
function copyReport() {
    if (!currentReport) {
        showAlert('No report to copy.', 'warning');
        return;
    }

    const text = `${currentReport.title}\nDate: ${currentReport.date} ${currentReport.time}\n\n${currentReport.report}`;
    navigator.clipboard.writeText(text).then(() => {
        showAlert('Report copied to clipboard!', 'success');
    }).catch(() => {
        showAlert('Failed to copy report.', 'danger');
    });
}

// Load journal history
async function loadJournalHistory() {
    try {
        const response = await fetch('/api/journals');
        if (!response.ok) {
            throw new Error('Failed to load history');
        }

        const journals = await response.json();
        renderJournalHistory(journals);

    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Render journal history
function renderJournalHistory(journals) {
    const container = document.getElementById('journalHistoryContainer');
    
    if (journals.length === 0) {
        container.innerHTML = '<div class="text-center text-white-50"><p>No journal entries yet.</p></div>';
        return;
    }

    container.innerHTML = journals.map(journal => `
        <div class="journal-card">
            <div class="journal-title">${escapeHtml(journal.title)}</div>
            <div class="journal-date">
                <i class="bi bi-calendar me-1"></i>${journal.date} at ${journal.time}
            </div>
            ${journal.images && journal.images.length > 0 ? `
                <div class="journal-images">
                    ${journal.images.slice(0, 4).map(img => `
                        <img src="/journal_data/images/${img}" alt="Journal image">
                    `).join('')}
                </div>
            ` : ''}
            <div class="journal-preview">${escapeHtml(journal.report).substring(0, 200)}...</div>
            <div class="mt-3">
                <button class="btn btn-sm btn-outline-primary" onclick="viewJournal(${journal.id})">
                    <i class="bi bi-eye me-1"></i>View
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteJournal(${journal.id})">
                    <i class="bi bi-trash me-1"></i>Delete
                </button>
            </div>
        </div>
    `).join('');
}

// View journal entry
async function viewJournal(id) {
    try {
        const response = await fetch(`/api/journals/${id}`);
        if (!response.ok) {
            throw new Error('Failed to load journal');
        }

        const journal = await response.json();
        showJournalModal(journal);

    } catch (error) {
        showAlert(`Error: ${error.message}`, 'danger');
    }
}

// Show journal modal
function showJournalModal(journal) {
    const modal = document.getElementById('journalModal');
    document.getElementById('modalTitle').textContent = journal.title;
    document.getElementById('modalDate').textContent = `${journal.date} at ${journal.time}`;
    
    // Display image if available
    const modalImageContainer = document.getElementById('modalImageContainer');
    if (journal.images && journal.images.length > 0) {
        modalImageContainer.innerHTML = `
            <img src="/journal_data/images/${journal.images[0]}" alt="Journal image" class="img-fluid rounded mb-3">
        `;
        modalImageContainer.style.display = 'block';
    } else {
        modalImageContainer.style.display = 'none';
    }
    
    // Display report
    document.getElementById('modalReport').innerHTML = polishReportText(journal.report);
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Delete journal entry
async function deleteJournal(id) {
    if (!confirm('Are you sure you want to delete this journal entry?')) {
        return;
    }

    try {
        const response = await fetch(`/api/journals/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete journal');
        }

        showAlert('Journal entry deleted.', 'success');
        loadJournalHistory();

    } catch (error) {
        showAlert(`Error: ${error.message}`, 'danger');
    }
}

// Show alert message
function showAlert(message, type) {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    container.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
