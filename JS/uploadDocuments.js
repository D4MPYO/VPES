class DocumentUploader {
    constructor() {
        this.uploadedFiles = new Map();
        this.fileURLs = new Map();
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // File input change events
        document.querySelectorAll('.file-input').forEach(input => {
            input.addEventListener('change', (e) => this.handleFileSelect(e));
        });

        // Upload area click events
        document.querySelectorAll('.upload-area').forEach(area => {
            const fileInput = area.querySelector('.file-input');
            const fileBtn = area.querySelector('.btn-file');

            // File button click
            fileBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });

            // Drag and drop events
            area.addEventListener('dragover', (e) => this.handleDragOver(e));
            area.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            area.addEventListener('drop', (e) => this.handleDrop(e));

            // Click to upload
            area.addEventListener('click', (e) => {
                if (!e.target.classList.contains('upload-btn') && 
                    !e.target.closest('.upload-btn')) {
                    fileInput.click();
                }
            });
        });

        // Remove button events
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.removeFile(e));
        });

        // View button events
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.viewDocument(e));
        });

        // File details click events (also triggers view)
        document.querySelectorAll('.file-details').forEach(details => {
            details.addEventListener('click', (e) => {
                const target = details.dataset.view;
                this.showDocumentPreview(target);
            });
        });

        // Modal close event
        const closeBtn = document.getElementById('closeViewBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeViewModal());
        }

        // Close modal when clicking outside
        const modal = document.getElementById('viewModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'viewModal') {
                    this.closeViewModal();
                }
            });
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        // Only remove if we're leaving the upload area completely
        if (!e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.classList.remove('dragover');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const uploadTarget = e.currentTarget.dataset.upload;
            this.processFile(files[0], uploadTarget);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        const uploadTarget = e.target.dataset.target;
        if (file) {
            this.processFile(file, uploadTarget);
        }
    }

    processFile(file, target) {
        if (!this.validateFile(file, target)) return;

        this.showLoading(target);
        
        // Create URL for file preview
        const fileURL = URL.createObjectURL(file);
        this.fileURLs.set(target, fileURL);
        
        // Simulate processing time
        setTimeout(() => {
            this.uploadedFiles.set(target, file);
            this.showUploadedFile(file, target);
            this.hideLoading(target);
        }, 1500);
    }

    validateFile(file, target) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        // Different file types allowed for different uploads
        const allowedTypes = {
            'birth-cert': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
            'report-card': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
            'id-photo': ['image/jpeg', 'image/jpg', 'image/png'],
            'moral-cert': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
        };

        if (file.size > maxSize) {
            this.showAlert('File size must be less than 5MB', 'error');
            return false;
        }

        const allowed = allowedTypes[target] || allowedTypes['birth-cert'];
        if (!allowed.includes(file.type)) {
            if (target === 'id-photo') {
                this.showAlert('ID Photo must be JPG or PNG format only', 'error');
            } else {
                this.showAlert('Only PDF, JPG, and PNG files are allowed', 'error');
            }
            return false;
        }

        return true;
    }

    showAlert(message, type = 'info') {
        // Create or update alert
        let alertEl = document.querySelector('.upload-alert');
        if (!alertEl) {
            alertEl = document.createElement('div');
            alertEl.className = 'upload-alert alert';
            const container = document.querySelector('.container');
            const firstCard = container.querySelector('.form-card');
            container.insertBefore(alertEl, firstCard);
        }

        alertEl.className = `upload-alert alert alert-${type === 'error' ? 'danger' : 'info'}`;
        alertEl.innerHTML = `
            <span class="alert-icon">${type === 'error' ? '⚠️' : 'ℹ️'}</span>
            <div>${message}</div>
        `;

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertEl && alertEl.parentNode) {
                alertEl.remove();
            }
        }, 5000);
    }

    showLoading(target) {
        const loadingEl = document.querySelector(`[data-loading="${target}"]`);
        const uploadArea = document.querySelector(`[data-upload="${target}"]`);
        const uploadedFile = document.querySelector(`[data-file="${target}"]`);
        
        if (uploadArea) uploadArea.style.display = 'none';
        if (uploadedFile) uploadedFile.classList.remove('show');
        if (loadingEl) loadingEl.style.display = 'block';
    }

    hideLoading(target) {
        const loadingEl = document.querySelector(`[data-loading="${target}"]`);
        if (loadingEl) loadingEl.style.display = 'none';
    }

    showUploadedFile(file, target) {
        const uploadedEl = document.querySelector(`[data-file="${target}"]`);
        const fileNameEl = uploadedEl.querySelector('.file-name');
        const fileSizeEl = uploadedEl.querySelector('.file-size');

        if (fileNameEl) fileNameEl.textContent = `✅ ${file.name}`;
        if (fileSizeEl) fileSizeEl.textContent = this.formatFileSize(file.size);
        
        uploadedEl.classList.add('show');
        
        // Show success message
        this.showAlert(`${file.name} uploaded successfully!`, 'success');
    }

    removeFile(e) {
        e.stopPropagation();
        const uploadedEl = e.target.closest('[data-file]');
        const target = uploadedEl.dataset.file;
        const uploadArea = document.querySelector(`[data-upload="${target}"]`);

        // Confirm removal
        if (!confirm('Are you sure you want to remove this file?')) {
            return;
        }

        uploadedEl.classList.remove('show');
        if (uploadArea) uploadArea.style.display = 'block';
        
        // Clean up file URL
        if (this.fileURLs.has(target)) {
            URL.revokeObjectURL(this.fileURLs.get(target));
            this.fileURLs.delete(target);
        }
        
        this.uploadedFiles.delete(target);

        // Clear file input
        const fileInput = document.querySelector(`[data-target="${target}"]`);
        if (fileInput) fileInput.value = '';

        this.showAlert('File removed successfully', 'info');
    }

    viewDocument(e) {
        e.stopPropagation();
        const target = e.target.dataset.view;
        this.showDocumentPreview(target);
    }

    showDocumentPreview(target) {
        if (!this.uploadedFiles.has(target)) {
            this.showAlert('No document found to preview.', 'error');
            return;
        }

        const file = this.uploadedFiles.get(target);
        const fileURL = this.fileURLs.get(target);
        const modal = document.getElementById('viewModal');
        const title = document.getElementById('viewTitle');
        const preview = document.getElementById('documentPreview');

        if (!modal || !title || !preview) return;

        // Set title based on document type
        const titles = {
            'birth-cert': '📄 Birth Certificate',
            'report-card': '📊 Report Card / Form 138',
            'id-photo': '📸 ID Photo (2x2)',
            'moral-cert': '🏆 Certificate of Good Moral Character'
        };
        
        title.textContent = titles[target] || '📄 Document Preview';

        // Clear previous content
        preview.innerHTML = '<div class="preview-message">Loading document...</div>';

        // Show modal first
        modal.style.display = 'flex';

        // PDF PREVIEW (via PDF.js)
        if (file.type === 'application/pdf') {
            this.renderPDFPreview(fileURL, preview);
        }
        // IMAGE PREVIEW
        else if (file.type.startsWith('image/')) {
            preview.innerHTML = `
                <img src="${fileURL}" alt="Document preview" class="document-image">
            `;
        }
        // OTHER FILE TYPES
        else {
            preview.innerHTML = `
                <div class="preview-message">
                    📄 Document: ${file.name}<br>
                    File type: ${file.type}<br>
                    Size: ${this.formatFileSize(file.size)}<br><br>
                    <a href="${fileURL}" target="_blank" class="button button-primary">
                        Download and View
                    </a>
                </div>
            `;
        }
    }

    renderPDFPreview(fileURL, preview) {
        // Check if PDF.js is available
        if (typeof pdfjsLib === 'undefined') {
            preview.innerHTML = `
                <div class="preview-message">
                    📄 PDF Preview not available<br><br>
                    <a href="${fileURL}" target="_blank" class="button button-primary">
                        Download PDF
                    </a>
                </div>
            `;
            return;
        }

        preview.innerHTML = '';
        const viewer = document.createElement('div');
        viewer.style.cssText = 'width: 100%; height: 100%; overflow: auto; padding: 10px;';
        preview.appendChild(viewer);

        const loadingTask = pdfjsLib.getDocument(fileURL);
        loadingTask.promise.then(pdf => {
            // Render all pages
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                pdf.getPage(pageNum).then(page => {
                    const scale = 1.5;
                    const viewport = page.getViewport({ scale: scale });
                    
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    canvas.style.cssText = 'display: block; margin: 0 auto 15px; max-width: 100%; height: auto; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 8px;';
                    
                    viewer.appendChild(canvas);

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    
                    page.render(renderContext);
                });
            }
        }).catch(err => {
            console.error('PDF rendering error:', err);
            preview.innerHTML = `
                <div class="preview-message" style="color: var(--danger);">
                    ⚠️ Failed to load PDF: ${err.message}<br><br>
                    <a href="${fileURL}" target="_blank" class="button button-primary">
                        Download PDF
                    </a>
                </div>
            `;
        });
    }

    closeViewModal() {
        const modal = document.getElementById('viewModal');
        if (modal) modal.style.display = 'none';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Get upload status for form validation
    getUploadStatus() {
        return {
            birthCert: this.uploadedFiles.has('birth-cert'),
            reportCard: this.uploadedFiles.has('report-card'),
            idPhoto: this.uploadedFiles.has('id-photo'),
            moralCert: this.uploadedFiles.has('moral-cert'),
            totalUploaded: this.uploadedFiles.size
        };
    }

    // Validate required documents before proceeding
    validateRequiredDocuments() {
        const status = this.getUploadStatus();
        const required = ['birthCert', 'idPhoto']; // Birth cert and ID photo are always required
        
        for (let doc of required) {
            if (!status[doc]) {
                const docNames = {
                    birthCert: 'Birth Certificate',
                    idPhoto: 'ID Photo'
                };
                this.showAlert(`${docNames[doc]} is required before proceeding.`, 'error');
                return false;
            }
        }
        
        return true;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const uploader = new DocumentUploader();
    
    // Add validation to next button
    const nextButton = document.querySelector('.button-primary');
    if (nextButton) {
        nextButton.addEventListener('click', (e) => {
            if (nextButton.getAttribute('onclick')) {
                // Remove onclick temporarily to add validation
                const originalOnclick = nextButton.getAttribute('onclick');
                nextButton.removeAttribute('onclick');
                
                nextButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (uploader.validateRequiredDocuments()) {
                        // Proceed to next page
                        eval(originalOnclick);
                    }
                });
            }
        });
    }
});

// Clean up URLs when page unloads
window.addEventListener('beforeunload', () => {
    // Browser usually handles this automatically, but we can be explicit
    document.querySelectorAll('input[type="file"]').forEach(input => {
        if (input.files) {
            Array.from(input.files).forEach(file => {
                if (file.url) URL.revokeObjectURL(file.url);
            });
        }
    });
});