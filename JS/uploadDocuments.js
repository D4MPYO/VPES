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
            fileBtn?.addEventListener('click', () => fileInput.click());

            // Drag and drop events
            area.addEventListener('dragover', (e) => this.handleDragOver(e));
            area.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            area.addEventListener('drop', (e) => this.handleDrop(e));

            // Click to upload
            area.addEventListener('click', (e) => {
                if (!e.target.classList.contains('upload-btn')) {
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
        document.getElementById('closeViewBtn').addEventListener('click', () => this.closeViewModal());

        // Close modal when clicking outside
        document.getElementById('viewModal').addEventListener('click', (e) => {
            if (e.target.id === 'viewModal') {
                this.closeViewModal();
            }
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
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
        if (!this.validateFile(file)) return;

        this.showLoading(target);
        
        // Create URL for file preview
        const fileURL = URL.createObjectURL(file);
        this.fileURLs.set(target, fileURL);
        
        // Simulate processing time
        setTimeout(() => {
            this.uploadedFiles.set(target, file);
            this.showUploadedFile(file, target);
            this.hideLoading(target);
        }, 2000);
    }

    validateFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

        if (file.size > maxSize) {
            alert('File size must be less than 5MB');
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            alert('Only PDF, JPG, and PNG files are allowed');
            return false;
        }

        return true;
    }

    showLoading(target) {
        const loadingEl = document.querySelector(`[data-loading="${target}"]`);
        const uploadArea = document.querySelector(`[data-upload="${target}"]`);
        
        uploadArea.style.display = 'none';
        loadingEl.style.display = 'block';
    }

    hideLoading(target) {
        const loadingEl = document.querySelector(`[data-loading="${target}"]`);
        loadingEl.style.display = 'none';
    }

    showUploadedFile(file, target) {
        const uploadedEl = document.querySelector(`[data-file="${target}"]`);
        const fileNameEl = uploadedEl.querySelector('.file-name');
        const fileSizeEl = uploadedEl.querySelector('.file-size');

        fileNameEl.textContent = `✅ ${file.name}`;
        fileSizeEl.textContent = this.formatFileSize(file.size);
        
        uploadedEl.classList.add('show');
    }

    removeFile(e) {
        const uploadedEl = e.target.closest('[data-file]');
        const target = uploadedEl.dataset.file;
        const uploadArea = document.querySelector(`[data-upload="${target}"]`);

        uploadedEl.classList.remove('show');
        uploadArea.style.display = 'block';
        
        // Clean up file URL
        if (this.fileURLs.has(target)) {
            URL.revokeObjectURL(this.fileURLs.get(target));
            this.fileURLs.delete(target);
        }
        
        this.uploadedFiles.delete(target);

        // Clear file input
        const fileInput = document.querySelector(`[data-target="${target}"]`);
        fileInput.value = '';
    }

    viewDocument(e) {
        const target = e.target.dataset.view;
        this.showDocumentPreview(target);
    }

    showDocumentPreview(target) {
        if (!this.uploadedFiles.has(target)) {
            alert('No document found to preview.');
            return;
        }

        const file = this.uploadedFiles.get(target);
        const fileURL = this.fileURLs.get(target);
        const modal = document.getElementById('viewModal');
        const title = document.getElementById('viewTitle');
        const preview = document.getElementById('documentPreview');

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

        // PDF PREVIEW (via PDF.js)
        if (file.type === 'application/pdf') {
            preview.innerHTML = "";
            const viewer = document.createElement("div");
            viewer.style.width = "100%";
            viewer.style.height = "80vh";
            viewer.style.overflow = "auto";
            preview.appendChild(viewer);

            const loadingTask = pdfjsLib.getDocument(fileURL);
            loadingTask.promise.then(pdf => {
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    pdf.getPage(pageNum).then(page => {
                        const viewport = page.getViewport({ scale: 1});
                        const canvas = document.createElement("canvas");
                        const context = canvas.getContext("2d");
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        canvas.style.display = "block";
                        canvas.style.margin = "0 auto 10px";
                        viewer.appendChild(canvas);

                        page.render({ canvasContext: context, viewport: viewport });
                    });
                }
            }).catch(err => {
                preview.innerHTML = `<p style="color:red;">⚠️ Failed to load PDF: ${err.message}</p>`;
            });

        // IMAGE PREVIEW
        } else if (file.type.startsWith('image/')) {
            preview.innerHTML = `
                <img src="${fileURL}" alt="Document preview" class="document-image">
            `;

        // OTHER FILE TYPES
        } else {
            preview.innerHTML = `
                <div class="preview-message">
                    📄 Document: ${file.name}<br>
                    File type: ${file.type}<br>
                    Size: ${this.formatFileSize(file.size)}<br><br>
                    <a href="${fileURL}" target="_blank" style="color: #007bff; text-decoration: underline;">
                        Click here to download and view
                    </a>
                </div>
            `;
        }

        modal.style.display = 'flex';
    }

    closeViewModal() {
        const modal = document.getElementById('viewModal');
        modal.style.display = 'none';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new DocumentUploader();
});

// Clean up URLs when page unloads
window.addEventListener('beforeunload', () => {
    // Browser usually handles this automatically
});