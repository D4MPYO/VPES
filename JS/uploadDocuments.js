class DocumentUploader {
    constructor() {
        this.uploadedFiles = new Map();
        this.fileURLs = new Map();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSavedDocuments();
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

    async processFile(file, target) {
        if (!this.validateFile(file, target)) return;

        this.showLoading(target);
        
        try {
            // Convert file to Base64 for storage
            const base64Data = await this.fileToBase64(file);
            
            // Store file data in sessionStorage
            const fileData = {
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64Data,
                uploadDate: new Date().toISOString()
            };
            
            // Try to store in sessionStorage
            try {
                sessionStorage.setItem(`document_${target}`, JSON.stringify(fileData));
            } catch (e) {
                // If storage quota exceeded, show warning
                console.warn('Storage quota exceeded, file too large for session storage');
                this.showAlert('File uploaded successfully but may not persist if you leave the site (file too large for browser storage)', 'warning');
            }
            
            // Create blob and URL for immediate use
            const blob = await this.base64ToBlob(base64Data, file.type);
            const fileURL = URL.createObjectURL(blob);
            
            this.fileURLs.set(target, fileURL);
            this.uploadedFiles.set(target, file);
            
            // Show uploaded file
            setTimeout(() => {
                this.showUploadedFile(file, target);
                this.hideLoading(target);
                this.saveDocumentStatus();
            }, 1000);
            
        } catch (error) {
            console.error('Error processing file:', error);
            this.hideLoading(target);
            this.showAlert('Error processing file. Please try again.', 'error');
        }
    }

    // Convert file to Base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Convert Base64 back to Blob
    base64ToBlob(base64Data, contentType) {
        return new Promise((resolve, reject) => {
            try {
                // Remove data URL prefix if present
                const base64 = base64Data.replace(/^data:.*?;base64,/, '');
                
                // Decode base64
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: contentType });
                resolve(blob);
            } catch (error) {
                reject(error);
            }
        });
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

        // Map type to appropriate styling
        const typeMap = {
            'error': 'danger',
            'warning': 'warning',
            'success': 'success',
            'info': 'info'
        };

        alertEl.className = `upload-alert alert alert-${typeMap[type] || 'info'}`;
        
        // Choose appropriate icon
        const icons = {
            'error': '⚠️',
            'warning': '⚠️',
            'success': '✅',
            'info': 'ℹ️'
        };
        
        alertEl.innerHTML = `
            <span class="alert-icon">${icons[type] || 'ℹ️'}</span>
            <div>${message}</div>
        `;

        // Auto-remove after 5 seconds (longer for warnings)
        const timeout = type === 'warning' ? 8000 : 5000;
        setTimeout(() => {
            if (alertEl && alertEl.parentNode) {
                alertEl.remove();
            }
        }, timeout);
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
        
        // Remove from sessionStorage
        sessionStorage.removeItem(`document_${target}`);

        // Clear file input
        const fileInput = document.querySelector(`[data-target="${target}"]`);
        if (fileInput) fileInput.value = '';

        this.showAlert('File removed successfully', 'info');
        this.saveDocumentStatus();
    }

    viewDocument(e) {
        e.stopPropagation();
        const target = e.target.dataset.view;
        this.showDocumentPreview(target);
    }

    async showDocumentPreview(target) {
        // First check if we have it in memory
        let fileURL = this.fileURLs.get(target);
        let file = this.uploadedFiles.get(target);
        
        // If not in memory, try to load from sessionStorage
        if (!fileURL) {
            const storedData = sessionStorage.getItem(`document_${target}`);
            if (storedData) {
                try {
                    const fileData = JSON.parse(storedData);
                    const blob = await this.base64ToBlob(fileData.data, fileData.type);
                    fileURL = URL.createObjectURL(blob);
                    this.fileURLs.set(target, fileURL);
                    
                    // Create a file-like object for display
                    file = {
                        name: fileData.name,
                        type: fileData.type,
                        size: fileData.size
                    };
                } catch (error) {
                    console.error('Error loading stored document:', error);
                    this.showAlert('Error loading document. Please re-upload.', 'error');
                    return;
                }
            } else {
                this.showAlert('No document found to preview.', 'error');
                return;
            }
        }

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

    // Save document upload status to sessionStorage
    saveDocumentStatus() {
        const status = {
            birthCert: this.uploadedFiles.has('birth-cert') || sessionStorage.getItem('document_birth-cert') !== null,
            reportCard: this.uploadedFiles.has('report-card') || sessionStorage.getItem('document_report-card') !== null,
            idPhoto: this.uploadedFiles.has('id-photo') || sessionStorage.getItem('document_id-photo') !== null,
            moralCert: this.uploadedFiles.has('moral-cert') || sessionStorage.getItem('document_moral-cert') !== null,
            timestamp: new Date().toISOString()
        };
        
        status.totalUploaded = [status.birthCert, status.reportCard, status.idPhoto, status.moralCert].filter(Boolean).length;
        
        // Store which documents still need to be submitted
        const pendingDocuments = [];
        if (!status.birthCert) pendingDocuments.push('Birth Certificate');
        if (!status.idPhoto) pendingDocuments.push('ID Photo (2x2)');
        
        status.pendingDocuments = pendingDocuments;
        status.hasAllRequired = pendingDocuments.length === 0;
        
        sessionStorage.setItem('documentUploadStatus', JSON.stringify(status));
        sessionStorage.setItem('documentsUploaded', 'partial');
    }

    // Load saved documents from sessionStorage
    async loadSavedDocuments() {
        const documents = [
            { key: 'birth-cert', name: 'Birth Certificate' },
            { key: 'report-card', name: 'Report Card' },
            { key: 'id-photo', name: 'ID Photo' },
            { key: 'moral-cert', name: 'Good Moral Certificate' }
        ];

        for (const doc of documents) {
            const storedData = sessionStorage.getItem(`document_${doc.key}`);
            if (storedData) {
                try {
                    const fileData = JSON.parse(storedData);
                    
                    // Recreate the file object
                    const blob = await this.base64ToBlob(fileData.data, fileData.type);
                    const file = new File([blob], fileData.name, { type: fileData.type });
                    
                    // Create URL for preview
                    const fileURL = URL.createObjectURL(blob);
                    
                    // Store in memory
                    this.uploadedFiles.set(doc.key, file);
                    this.fileURLs.set(doc.key, fileURL);
                    
                    // Show as uploaded
                    this.showRestoredFile(fileData, doc.key);
                    
                } catch (error) {
                    console.error(`Error loading ${doc.name}:`, error);
                    // Remove corrupted data
                    sessionStorage.removeItem(`document_${doc.key}`);
                }
            }
        }
    }

    // Show restored file from sessionStorage
    showRestoredFile(fileData, target) {
        const uploadedEl = document.querySelector(`[data-file="${target}"]`);
        const uploadArea = document.querySelector(`[data-upload="${target}"]`);
        const fileNameEl = uploadedEl?.querySelector('.file-name');
        const fileSizeEl = uploadedEl?.querySelector('.file-size');

        if (uploadedEl && fileNameEl) {
            fileNameEl.textContent = `✅ ${fileData.name}`;
            if (fileSizeEl) fileSizeEl.textContent = this.formatFileSize(fileData.size);
            
            uploadedEl.classList.add('show');
            if (uploadArea) uploadArea.style.display = 'none';
        }
    }

    // Check if user wants to proceed without all documents
    proceedWithMissingDocuments() {
        const status = this.getUploadStatus();
        const missingDocs = [];
        
        // Check which important documents are missing
        if (!status.birthCert) missingDocs.push('Birth Certificate');
        if (!status.idPhoto) missingDocs.push('ID Photo');
        
        if (missingDocs.length > 0) {
            const message = `You haven't uploaded the following document(s):\n\n${missingDocs.join('\n')}\n\nYou can still proceed with your application, but these documents must be submitted within 30 days.\n\nDo you want to continue?`;
            return confirm(message);
        }
        
        return true;
    }

    // Get upload status for validation
    getUploadStatus() {
        return {
            birthCert: this.uploadedFiles.has('birth-cert') || sessionStorage.getItem('document_birth-cert') !== null,
            reportCard: this.uploadedFiles.has('report-card') || sessionStorage.getItem('document_report-card') !== null,
            idPhoto: this.uploadedFiles.has('id-photo') || sessionStorage.getItem('document_id-photo') !== null,
            moralCert: this.uploadedFiles.has('moral-cert') || sessionStorage.getItem('document_moral-cert') !== null
        };
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const uploader = new DocumentUploader();
    
    // Modify next button behavior to allow proceeding without all documents
    const nextButton = document.querySelector('.button-primary');
    if (nextButton) {
        // Remove the default onclick
        nextButton.removeAttribute('onclick');
        
        nextButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Save the current upload status
            uploader.saveDocumentStatus();
            
            // Ask for confirmation if documents are missing
            if (uploader.proceedWithMissingDocuments()) {
                // Proceed to next page
                window.location.href = 'review.html';
            }
        });
    }
    
    // Previous button functionality
    const prevButton = document.querySelector('.button-secondary');
    if (prevButton) {
        prevButton.removeAttribute('onclick');
        prevButton.addEventListener('click', (e) => {
            e.preventDefault();
            // Save current status before going back
            uploader.saveDocumentStatus();
            window.location.href = 'applicationform.html';
        });
    }
});

// Clean up URLs when page unloads
window.addEventListener('beforeunload', () => {
    // Note: File URLs stored in sessionStorage will be recreated when needed
    // This cleanup is just for the current page session
    document.querySelectorAll('input[type="file"]').forEach(input => {
        if (input.files) {
            Array.from(input.files).forEach(file => {
                if (file.url) URL.revokeObjectURL(file.url);
            });
        }
    });
});