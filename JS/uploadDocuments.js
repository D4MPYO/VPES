/**
 * Document Upload Management System
 * Handles file uploads, validation, preview, and storage
 */
class DocumentUploader {
    constructor() {
        this.uploadedFiles = new Map();
        this.fileURLs = new Map();
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
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

        // Upload area events
        this.setupUploadAreas();

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

        // Modal events
        this.setupModalEvents();

        // Navigation button events
        this.setupNavigationButtons();
    }

    setupUploadAreas() {
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
    }

    setupModalEvents() {
        const closeBtn = document.getElementById('closeViewBtn');
        const modal = document.getElementById('viewModal');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeViewModal());
        }

        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'viewModal') {
                    this.closeViewModal();
                }
            });
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeViewModal();
            }
        });
    }

    setupNavigationButtons() {
        // Next button - allows proceeding without all documents
        const nextButton = document.querySelector('.button-primary');
        if (nextButton) {
            nextButton.removeAttribute('onclick');
            
            nextButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveDocumentStatus();
                
                if (this.proceedWithMissingDocuments()) {
                    window.location.href = 'review.html';
                }
            });
        }
        
        // Previous button
        const prevButton = document.querySelector('.button-secondary');
        if (prevButton) {
            prevButton.removeAttribute('onclick');
            prevButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveDocumentStatus();
                window.location.href = 'applicationform.html';
            });
        }
    }

    // Drag and Drop Handlers
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

    // File Processing
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
                console.warn('Storage quota exceeded');
                this.showAlert('File uploaded successfully but may not persist if you leave the site (file too large for browser storage)', 'warning');
            }
            
            // Create blob and URL for immediate use
            const blob = await this.base64ToBlob(base64Data, file.type);
            const fileURL = URL.createObjectURL(blob);
            
            this.fileURLs.set(target, fileURL);
            this.uploadedFiles.set(target, file);
            
            // Show uploaded file with animation
            setTimeout(() => {
                this.showUploadedFile(file, target);
                this.hideLoading(target);
                this.saveDocumentStatus();
            }, 800);
            
        } catch (error) {
            console.error('Error processing file:', error);
            this.hideLoading(target);
            this.showAlert('Error processing file. Please try again.', 'error');
        }
    }

    validateFile(file, target) {
        // Different file types allowed for different uploads
        const allowedTypes = {
            'birth-cert': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
            'report-card': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
            'id-photo': ['image/jpeg', 'image/jpg', 'image/png'],
            'moral-cert': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
        };

        if (file.size > this.maxFileSize) {
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

    // File Conversion Utilities
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    base64ToBlob(base64Data, contentType) {
        return new Promise((resolve, reject) => {
            try {
                const base64 = base64Data.replace(/^data:.*?;base64,/, '');
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

    // UI Updates
    showAlert(message, type = 'info') {
        let alertEl = document.querySelector('.upload-alert');
        if (!alertEl) {
            alertEl = document.createElement('div');
            alertEl.className = 'upload-alert alert';
            const container = document.querySelector('.container');
            const firstCard = container.querySelector('.form-card');
            container.insertBefore(alertEl, firstCard);
        }

        const typeMap = {
            'error': 'danger',
            'warning': 'warning',
            'success': 'success',
            'info': 'info'
        };

        alertEl.className = `upload-alert alert alert-${typeMap[type] || 'info'}`;
        
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

        // Auto-remove after timeout
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
        
        this.showAlert(`${file.name} uploaded successfully!`, 'success');
    }

    // File Removal with Inline Confirmation
    removeFile(e) {
        e.stopPropagation();
        const uploadedEl = e.target.closest('[data-file]');
        const target = uploadedEl.dataset.file;
        const uploadArea = document.querySelector(`[data-upload="${target}"]`);
        const removeBtn = e.target;

        // Check if already showing confirmation
        if (removeBtn.classList.contains('confirm-mode')) {
            // User confirmed - proceed with removal
            this.performFileRemoval(uploadedEl, target, uploadArea);
        } else {
            // Show confirmation state
            this.showRemovalConfirmation(removeBtn);
        }
    }

    showRemovalConfirmation(removeBtn) {
        removeBtn.classList.add('confirm-mode');
        removeBtn.style.background = '#dc2626';
        removeBtn.innerHTML = '⚠️ Confirm Delete';
        
        // Reset button after 3 seconds if not clicked
        const resetTimeout = setTimeout(() => {
            if (removeBtn.classList.contains('confirm-mode')) {
                this.resetRemoveButton(removeBtn);
            }
        }, 3000);

        // Store timeout reference to clear if needed
        removeBtn.dataset.resetTimeout = resetTimeout;
    }

    resetRemoveButton(removeBtn) {
        removeBtn.classList.remove('confirm-mode');
        removeBtn.style.background = '';
        removeBtn.innerHTML = '🗑️ Remove';
        
        // Clear timeout if it exists
        if (removeBtn.dataset.resetTimeout) {
            clearTimeout(removeBtn.dataset.resetTimeout);
            delete removeBtn.dataset.resetTimeout;
        }
    }

    performFileRemoval(uploadedEl, target, uploadArea) {
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

    // Document Preview
    viewDocument(e) {
        e.stopPropagation();
        const target = e.target.dataset.view;
        this.showDocumentPreview(target);
    }

    async showDocumentPreview(target) {
        let fileURL = this.fileURLs.get(target);
        let file = this.uploadedFiles.get(target);
        
        // If not in memory, try to load from sessionStorage
        if (!fileURL) {
            const loadResult = await this.loadDocumentFromStorage(target);
            if (!loadResult) {
                this.showAlert('No document found to preview.', 'error');
                return;
            }
            fileURL = loadResult.fileURL;
            file = loadResult.file;
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

        // Show modal
        modal.style.display = 'flex';

        // Render appropriate preview
        if (file.type === 'application/pdf') {
            this.renderPDFPreview(fileURL, preview);
        } else if (file.type.startsWith('image/')) {
            this.renderImagePreview(fileURL, preview);
        } else {
            this.renderGenericPreview(file, fileURL, preview);
        }
    }

    async loadDocumentFromStorage(target) {
        const storedData = sessionStorage.getItem(`document_${target}`);
        if (!storedData) return null;

        try {
            const fileData = JSON.parse(storedData);
            const blob = await this.base64ToBlob(fileData.data, fileData.type);
            const fileURL = URL.createObjectURL(blob);
            this.fileURLs.set(target, fileURL);
            
            return {
                fileURL,
                file: {
                    name: fileData.name,
                    type: fileData.type,
                    size: fileData.size
                }
            };
        } catch (error) {
            console.error('Error loading stored document:', error);
            this.showAlert('Error loading document. Please re-upload.', 'error');
            return null;
        }
    }

    renderImagePreview(fileURL, preview) {
        preview.innerHTML = `
            <img src="${fileURL}" alt="Document preview" class="document-image">
        `;
    }

    renderGenericPreview(file, fileURL, preview) {
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

    renderPDFPreview(fileURL, preview) {
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

        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        preview.innerHTML = '';
        const viewer = document.createElement('div');
        viewer.style.cssText = 'width: 100%; height: 100%; overflow: auto; padding: 10px;';
        preview.appendChild(viewer);

        const loadingTask = pdfjsLib.getDocument(fileURL);
        loadingTask.promise.then(pdf => {
            // Render all pages
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                this.renderPDFPage(pdf, pageNum, viewer);
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

    renderPDFPage(pdf, pageNum, container) {
        pdf.getPage(pageNum).then(page => {
            const scale = 1.5;
            const viewport = page.getViewport({ scale: scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.cssText = 'display: block; margin: 0 auto 15px; max-width: 100%; height: auto; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 8px;';
            
            container.appendChild(canvas);

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            page.render(renderContext);
        });
    }

    closeViewModal() {
        const modal = document.getElementById('viewModal');
        if (modal) modal.style.display = 'none';
    }

    // Utility Functions
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Storage and Status Management
    saveDocumentStatus() {
        const status = {
            birthCert: this.hasDocument('birth-cert'),
            reportCard: this.hasDocument('report-card'),
            idPhoto: this.hasDocument('id-photo'),
            moralCert: this.hasDocument('moral-cert'),
            timestamp: new Date().toISOString()
        };
        
        status.totalUploaded = [status.birthCert, status.reportCard, status.idPhoto, status.moralCert]
            .filter(Boolean).length;
        
        // Store which documents still need to be submitted
        const pendingDocuments = [];
        if (!status.birthCert) pendingDocuments.push('Birth Certificate');
        if (!status.idPhoto) pendingDocuments.push('ID Photo (2x2)');
        
        status.pendingDocuments = pendingDocuments;
        status.hasAllRequired = pendingDocuments.length === 0;
        
        sessionStorage.setItem('documentUploadStatus', JSON.stringify(status));
        sessionStorage.setItem('documentsUploaded', status.totalUploaded > 0 ? 'partial' : 'none');
    }

    hasDocument(target) {
        return this.uploadedFiles.has(target) || 
               sessionStorage.getItem(`document_${target}`) !== null;
    }

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

    proceedWithMissingDocuments() {
        const status = this.getUploadStatus();
        const missingDocs = [];
        
        // Check which important documents are missing
        if (!status.birthCert) missingDocs.push('Birth Certificate');
        if (!status.idPhoto) missingDocs.push('ID Photo');
        
        if (missingDocs.length > 0) {
            // Create a custom confirmation modal instead of using confirm()
            return this.showMissingDocumentsModal(missingDocs);
        }
        
        return true;
    }

    showMissingDocumentsModal(missingDocs) {
        // Create modal element
        const modal = document.createElement('div');
        modal.className = 'custom-confirm-modal';
        modal.innerHTML = `
            <div class="confirm-modal-content">
                <div class="confirm-modal-header">
                    <h3>⚠️ Missing Documents</h3>
                </div>
                <div class="confirm-modal-body">
                    <p>You haven't uploaded the following required document(s):</p>
                    <ul class="missing-docs-list">
                        ${missingDocs.map(doc => `<li>• ${doc}</li>`).join('')}
                    </ul>
                    <p class="confirm-note">
                        <strong>Note:</strong> You can still proceed with your application, 
                        but these documents must be submitted within <strong>30 days after enrollment</strong>.
                    </p>
                </div>
                <div class="confirm-modal-footer">
                    <button class="confirm-btn-cancel">Cancel</button>
                    <button class="confirm-btn-proceed">Proceed Anyway</button>
                </div>
            </div>
        `;

        // Add modal styles
        this.addModalStyles();
        
        // Add to body
        document.body.appendChild(modal);

        // Return promise for user's choice
        return new Promise((resolve) => {
            modal.querySelector('.confirm-btn-cancel').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            modal.querySelector('.confirm-btn-proceed').addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });
        }).then(result => {
            if (result) {
                window.location.href = 'review.html';
            }
            return result;
        });
    }

    addModalStyles() {
        if (document.getElementById('confirm-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'confirm-modal-styles';
        style.textContent = `
            .custom-confirm-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                animation: fadeIn 0.2s ease;
            }

            .confirm-modal-content {
                background: white;
                border-radius: 12px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                animation: slideUp 0.3s ease;
            }

            .confirm-modal-header {
                padding: 20px;
                border-bottom: 1px solid #e5e7eb;
            }

            .confirm-modal-header h3 {
                margin: 0;
                color: #111827;
                font-size: 1.3rem;
            }

            .confirm-modal-body {
                padding: 20px;
            }

            .confirm-modal-body p {
                margin: 0 0 15px;
                color: #6b7280;
                line-height: 1.6;
            }

            .missing-docs-list {
                list-style: none;
                padding: 0;
                margin: 15px 0;
                background: #fef3c7;
                border: 1px solid #fcd34d;
                border-radius: 8px;
                padding: 12px 15px;
            }

            .missing-docs-list li {
                color: #92400e;
                padding: 4px 0;
                font-weight: 500;
            }

            .confirm-note {
                background: #dbeafe;
                border: 1px solid #93c5fd;
                border-radius: 8px;
                padding: 12px;
                margin-top: 15px !important;
                font-size: 0.9rem;
            }

            .confirm-modal-footer {
                padding: 15px 20px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }

            .confirm-modal-footer button {
                padding: 8px 20px;
                border-radius: 6px;
                border: none;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .confirm-btn-cancel {
                background: #f3f4f6;
                color: #6b7280;
            }

            .confirm-btn-cancel:hover {
                background: #e5e7eb;
            }

            .confirm-btn-proceed {
                background: #4f46e5;
                color: white;
            }

            .confirm-btn-proceed:hover {
                background: #3730a3;
                transform: translateY(-1px);
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from { 
                    opacity: 0;
                    transform: translateY(20px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    getUploadStatus() {
        return {
            birthCert: this.hasDocument('birth-cert'),
            reportCard: this.hasDocument('report-card'),
            idPhoto: this.hasDocument('id-photo'),
            moralCert: this.hasDocument('moral-cert')
        };
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const uploader = new DocumentUploader();
});

// Clean up URLs when page unloads
window.addEventListener('beforeunload', () => {
    // Clean up any blob URLs that were created
    document.querySelectorAll('input[type="file"]').forEach(input => {
        if (input.files) {
            Array.from(input.files).forEach(file => {
                if (file.url) URL.revokeObjectURL(file.url);
            });
        }
    });
});