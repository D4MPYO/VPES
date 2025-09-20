/**
 * Review and Submit Application System
 * Loads and displays all application data for final review
 */
class ApplicationReview {
    constructor() {
        this.applicationData = {};
        this.documentStatus = {};
        this.isValid = false;
        this.locationCache = new Map(); // Cache for decoded locations
        this.init();
    }

    async init() {
        await this.loadAllData();
        this.setupEventListeners();
        this.checkApplicationStatus();
    }

    setupEventListeners() {
        // Agreement checkbox
        const agreeCheckbox = document.getElementById('agreeTerms');
        if (agreeCheckbox) {
            agreeCheckbox.addEventListener('change', (e) => {
                this.toggleSubmitButton(e.target.checked);
            });
        }

        // Submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitApplication());
        }

        // Edit buttons are handled inline with onclick
    }

    async loadAllData() {
        // Load application form data
        const formData = sessionStorage.getItem('applicationFormData');
        if (formData) {
            this.applicationData = JSON.parse(formData);
            await this.populateReviewData();
        } else {
            this.showNoDataMessage();
        }

        // Load document upload status
        const docStatus = sessionStorage.getItem('documentUploadStatus');
        if (docStatus) {
            this.documentStatus = JSON.parse(docStatus);
            this.updateDocumentStatus();
        }
    }

    async populateReviewData() {
        const data = this.applicationData;

        // School Information
        this.setFieldValue('reviewSchoolYear', data.schoolYear || '-');
        this.setFieldValue('reviewGradeLevel', this.formatGradeLevel(data.gradeLevel) || '-');
        this.setFieldValue('reviewWithLrn', data.withLrn || '-');
        this.setFieldValue('reviewReturning', data.returning || '-');

        // Student Information
        const fullName = this.formatFullName(data);
        this.setFieldValue('reviewFullName', fullName);
        this.setFieldValue('reviewLRN', data.lrn || 'Not Applicable');
        this.setFieldValue('reviewPSA', data.psaBirth || 'Not Provided');
        this.setFieldValue('reviewBirthdate', this.formatDate(data.birthDate));
        this.setFieldValue('reviewAge', data.age ? `${data.age} years old` : '-');
        this.setFieldValue('reviewSex', data.sex || '-');
        
        // Birth Place - decode async
        const birthPlace = await this.formatBirthPlace(data);
        this.setFieldValue('reviewBirthPlace', birthPlace);
        this.setFieldValue('reviewMotherTongue', data.motherTongue || '-');

        // Address Information - decode async
        const currentAddress = await this.formatAddress('current', data);
        const permanentAddress = await this.formatAddress('permanent', data);
        this.setFieldValue('reviewCurrentAddress', currentAddress);
        this.setFieldValue('reviewPermanentAddress', permanentAddress);

        // Parent/Guardian Information
        this.populateParentInfo(data);

        // Additional Information
        this.setFieldValue('reviewDisability', data.hasDisability || 'Not Specified');
        this.setFieldValue('reviewIP', data.indigenousPeople || 'Not Specified');
        this.setFieldValue('review4Ps', data.fourPs || 'Not Specified');
        this.setFieldValue('reviewModality', this.formatLearningModality(data));

        // Returning Learner Information
        if (data.returning === 'YES') {
            const returningCard = document.getElementById('returningLearnerCard');
            if (returningCard) {
                returningCard.style.display = 'block';
                this.setFieldValue('reviewLastGrade', this.formatGradeLevel(data.lastGradeLevel) || '-');
                this.setFieldValue('reviewLastYear', data.lastSchoolYear || '-');
                this.setFieldValue('reviewLastSchool', data.lastSchoolAttended || '-');
                this.setFieldValue('reviewSchoolId', data.schoolId || '-');
            }
        }
    }

    formatFullName(data) {
        const parts = [];
        if (data.lastName) parts.push(data.lastName);
        if (data.firstName) parts.push(data.firstName);
        if (data.middleName) parts.push(data.middleName);
        if (data.extensionName) parts.push(data.extensionName);
        return parts.join(', ') || '-';
    }

    formatGradeLevel(grade) {
        if (!grade) return '-';
        return grade.replace('_', ' ').replace('GRADE', 'Grade');
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }

    async formatBirthPlace(data) {
        const parts = [];
        if (data.birthCity) {
            const cityName = await this.decodeLocation(data.birthCity, 'city', data.birthProvince);
            if (cityName) parts.push(cityName);
        }
        if (data.birthProvince) {
            const provinceName = await this.decodeLocation(data.birthProvince, 'province');
            if (provinceName) parts.push(provinceName);
        }
        return parts.join(', ') || '-';
    }

    async formatAddress(type, data) {
        const prefix = type === 'current' ? 'current' : 'perm';
        const parts = [];
        
        if (data[`${prefix}HouseNo`]) {
            parts.push(data[`${prefix}HouseNo`]);
        }
        
        if (data[`${prefix}Barangay`]) {
            const barangayName = await this.decodeLocation(
                data[`${prefix}Barangay`], 
                'barangay', 
                data[`${prefix}Municipality`]
            );
            if (barangayName) {
                parts.push(barangayName);
            }
        }
        
        if (data[`${prefix}Municipality`]) {
            const municipalityName = await this.decodeLocation(
                data[`${prefix}Municipality`], 
                'city', 
                data[`${prefix}Province`]
            );
            if (municipalityName) parts.push(municipalityName);
        }
        
        if (data[`${prefix}Province`]) {
            const provinceName = await this.decodeLocation(data[`${prefix}Province`], 'province');
            if (provinceName) parts.push(provinceName);
        }
        
        if (data[`${prefix}ZipCode`]) {
            parts.push(data[`${prefix}ZipCode`]);
        }
        
        return parts.join(', ') || '-';
    }

    async decodeLocation(code, type = 'province', parentCode = null) {
        if (!code) return null;
        
        // Check cache first
        const cacheKey = `${type}_${code}`;
        if (this.locationCache.has(cacheKey)) {
            return this.locationCache.get(cacheKey);
        }

        try {
            let url = '';
            let response;
            let data;

            switch (type) {
                case 'province':
                    url = 'https://psgc.gitlab.io/api/provinces/';
                    response = await fetch(url);
                    data = await response.json();
                    const province = data.find(p => p.code === code);
                    if (province) {
                        const name = province.name.toUpperCase();
                        this.locationCache.set(cacheKey, name);
                        return name;
                    }
                    break;

                case 'city':
                    if (parentCode) {
                        url = `https://psgc.gitlab.io/api/provinces/${parentCode}/cities-municipalities/`;
                        response = await fetch(url);
                        data = await response.json();
                        const city = data.find(c => c.code === code);
                        if (city) {
                            const name = city.name.toUpperCase();
                            this.locationCache.set(cacheKey, name);
                            return name;
                        }
                    } else {
                        url = 'https://psgc.gitlab.io/api/cities-municipalities/';
                        response = await fetch(url);
                        data = await response.json();
                        const city = data.find(c => c.code === code);
                        if (city) {
                            const name = city.name.toUpperCase();
                            this.locationCache.set(cacheKey, name);
                            return name;
                        }
                    }
                    break;

                case 'barangay':
                    if (parentCode) {
                        url = `https://psgc.gitlab.io/api/cities-municipalities/${parentCode}/barangays/`;
                        response = await fetch(url);
                        data = await response.json();
                        const barangay = data.find(b => b.code === code);
                        if (barangay) {
                            const name = barangay.name.toUpperCase();
                            this.locationCache.set(cacheKey, name);
                            return name;
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error decoding location ${code}:`, error);
        }

        // If decoding fails, return the code itself
        return code;
    }

    formatLearningModality(data) {
        const modalities = [];
        const modalityMap = {
            'FACE_TO_FACE': 'Face-to-Face',
            'MODULAR_PRINT': 'Modular (Print)',
            'MODULAR_DIGITAL': 'Modular (Digital)',
            'ONLINE': 'Online',
            'RADIO_BASED': 'Radio-Based',
            'EDUCATIONAL_TV': 'Educational TV',
            'BLENDED': 'Blended',
            'HOMESCHOOLING': 'Homeschooling'
        };

        // Check for different possible formats
        if (data.learningModality) {
            if (Array.isArray(data.learningModality)) {
                data.learningModality.forEach(mod => {
                    modalities.push(modalityMap[mod] || mod);
                });
            } else if (typeof data.learningModality === 'string') {
                modalities.push(modalityMap[data.learningModality] || data.learningModality);
            }
        }

        // Also check individual checkboxes
        Object.keys(modalityMap).forEach(key => {
            if (data[key.toLowerCase()] === 'on' || data[key.toLowerCase()] === true) {
                const readable = modalityMap[key];
                if (!modalities.includes(readable)) {
                    modalities.push(readable);
                }
            }
        });

        return modalities.length > 0 ? modalities.join(', ') : 'Not Specified';
    }

    populateParentInfo(data) {
        // Father's Information
        const fatherName = this.formatParentName(data.fatherFirstName, data.fatherMiddleName, data.fatherLastName);
        if (fatherName !== '-') {
            this.setFieldValue('reviewFatherName', fatherName);
            this.setFieldValue('reviewFatherContact', data.fatherContact || 'Not Provided');
            this.setFieldValue('reviewFatherEmail', data.fatherEmail || 'Not Provided');
        } else {
            const fatherSection = document.getElementById('fatherSection');
            if (fatherSection) fatherSection.style.display = 'none';
        }

        // Mother's Information
        const motherName = this.formatParentName(data.motherFirstName, data.motherMiddleName, data.motherMaidenLast);
        if (motherName !== '-') {
            this.setFieldValue('reviewMotherName', motherName);
            this.setFieldValue('reviewMotherContact', data.motherContact || 'Not Provided');
            this.setFieldValue('reviewMotherEmail', data.motherEmail || 'Not Provided');
        } else {
            const motherSection = document.getElementById('motherSection');
            if (motherSection) motherSection.style.display = 'none';
        }

        // Guardian Information
        if (data.guardianName) {
            const guardianSection = document.getElementById('guardianSection');
            if (guardianSection) {
                guardianSection.style.display = 'block';
                this.setFieldValue('reviewGuardianName', data.guardianName);
                this.setFieldValue('reviewGuardianContact', data.guardianContact || 'Not Provided');
            }
        }
    }

    formatParentName(first, middle, last) {
        const parts = [];
        if (first) parts.push(first);
        if (middle) parts.push(middle);
        if (last) parts.push(last);
        return parts.join(' ') || '-';
    }

    updateDocumentStatus() {
        const status = this.documentStatus;
        const documents = [
            { id: 'docBirthCert', key: 'birthCert', name: 'Birth Certificate' },
            { id: 'docReportCard', key: 'reportCard', name: 'Report Card' },
            { id: 'docIdPhoto', key: 'idPhoto', name: '2x2 Photo of Student' },
            { id: 'docMoralCert', key: 'moralCert', name: 'Good Moral' }
        ];

        const missingDocs = [];

        documents.forEach(doc => {
            const element = document.getElementById(doc.id);
            if (element) {
                const statusEl = element.querySelector('.doc-status');
                if (status[doc.key]) {
                    statusEl.textContent = 'Uploaded';
                    statusEl.dataset.status = 'uploaded';
                } else {
                    statusEl.textContent = 'Not Uploaded';
                    statusEl.dataset.status = 'pending';
                    
                    // Track missing required documents
                    if (doc.key === 'birthCert' || doc.key === 'idPhoto') {
                        missingDocs.push(doc.name);
                    }
                }
            }
        });

        // Show missing documents alert if any
        if (missingDocs.length > 0) {
            const alert = document.getElementById('missingDocsAlert');
            const list = document.getElementById('missingDocsList');
            if (alert && list) {
                list.textContent = missingDocs.join(', ') + '.';
                alert.style.display = 'flex';
            }
        }
    }

    setFieldValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value || '-';
            if (value && value !== '-') {
                element.style.color = 'var(--dark)';
            } else {
                element.style.color = 'var(--gray)';
            }
        }
    }

    checkApplicationStatus() {
        // Check if user has completed previous steps
        const formCompleted = sessionStorage.getItem('applicationFormCompleted') === 'true';
        const documentsStatus = sessionStorage.getItem('documentsUploaded');
        
        if (!formCompleted) {
            this.showIncompleteMessage('Please complete the application form first.');
            return;
        }

        this.isValid = true;
    }

    showNoDataMessage() {
        const container = document.querySelector('.container');
        const cards = container.querySelectorAll('.review-card');
        cards.forEach(card => card.style.display = 'none');
        
        const message = document.createElement('div');
        message.className = 'alert alert-warning';
        message.innerHTML = `
            <span class="alert-icon">⚠️</span>
            <div>
                <strong>No Application Data Found</strong><br>
                Please complete the application form first before reviewing.
                <br><br>
                <a href="applicationform.html" class="button button-primary">
                    Start Application
                </a>
            </div>
        `;
        
        const alertSection = container.querySelector('.alert');
        alertSection.parentNode.insertBefore(message, alertSection.nextSibling);
    }

    showIncompleteMessage(text) {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `⚠️ ${text}`;
        }
    }

    toggleSubmitButton(isChecked) {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn && this.isValid) {
            submitBtn.disabled = !isChecked;
            if (isChecked) {
                submitBtn.classList.add('pulse');
                setTimeout(() => submitBtn.classList.remove('pulse'), 600);
            }
        }
    }

    async submitApplication() {
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span> Submitting...';

        // Simulate API call
        await this.simulateSubmission();

        // Generate reference number
        const refNumber = this.generateReferenceNumber();
        
        // Save submission data
        this.saveSubmissionData(refNumber);

        // Show success modal
        this.showSuccessModal(refNumber);
    }

    simulateSubmission() {
        return new Promise(resolve => {
            setTimeout(resolve, 1500);
        });
    }

    generateReferenceNumber() {
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 10000).toString().padStart(5, '0');
        return `VPES-${year}-${random}`;
    }

    saveSubmissionData(refNumber) {
        const submission = {
            referenceNumber: refNumber,
            applicationData: this.applicationData,
            documentStatus: this.documentStatus,
            submittedAt: new Date().toISOString(),
            status: 'PENDING_REVIEW'
        };

        // Save to sessionStorage (in production, this would be sent to a server)
        sessionStorage.setItem('submittedApplication', JSON.stringify(submission));
        
        // Don't clear form data immediately - clear after redirect
        // This allows the dashboard to load the data first
    }

    showSuccessModal(refNumber) {
        const modal = document.getElementById('successModal');
        const refNumberEl = document.getElementById('refNumber');
        
        if (refNumberEl) {
            refNumberEl.textContent = refNumber;
        }
        
        if (modal) {
            modal.classList.add('show');
        }

        // Add confetti effect
        this.createConfetti();
        
        // Auto-redirect to dashboard after 3 seconds
        // FIX: Change to the correct dashboard file name
        setTimeout(() => {
            window.location.href = 'studentDashboard.html'; // Updated from 'studentDashboard.html'
        }, 3000);
    }

    createConfetti() {
        const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        const confettiCount = 150;
        
        for (let i = 0; i < confettiCount; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.cssText = `
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    top: -10px;
                    left: ${Math.random() * 100}%;
                    opacity: ${Math.random()};
                    transform: rotate(${Math.random() * 360}deg);
                    animation: fall ${3 + Math.random() * 2}s linear;
                    z-index: 9999;
                `;
                document.body.appendChild(confetti);
                
                // Remove after animation
                setTimeout(() => confetti.remove(), 5000);
            }, Math.random() * 500);
        }
        
        // Add falling animation
        if (!document.getElementById('confetti-style')) {
            const style = document.createElement('style');
            style.id = 'confetti-style';
            style.textContent = `
                @keyframes fall {
                    to {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                .pulse {
                    animation: pulse 0.6s ease;
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                .loading {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 3px solid var(--border);
                    border-radius: 50%;
                    border-top-color: var(--primary);
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Function to clear application data after successful redirect
    static clearApplicationData() {
        sessionStorage.removeItem('applicationFormData');
        sessionStorage.removeItem('documentUploadStatus');
        sessionStorage.removeItem('applicationFormCompleted');
        sessionStorage.removeItem('documentsUploaded');
        
        // Clear individual document data
        ['birth-cert', 'report-card', 'id-photo', 'moral-cert'].forEach(doc => {
            sessionStorage.removeItem(`document_${doc}`);
        });
    }
}

// Global functions for edit buttons
function editSection(section) {
    if (section === 'application') {
        window.location.href = 'applicationform.html';
    } else if (section === 'documents') {
        window.location.href = 'uploadDocument.html';
    }
}

function submitApplication() {
    // This is handled by the class instance
    if (window.appReview) {
        window.appReview.submitApplication();
    }
}

// Initialize application review
document.addEventListener('DOMContentLoaded', () => {
    window.appReview = new ApplicationReview();
    
    // Add smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    
    // Check if coming from a completed application
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('completed') === 'true') {
        // Show a success message
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.innerHTML = `
            <span class="alert-icon">✅</span>
            <div>
                <strong>Form Completed!</strong> Please review your information below and submit your application.
            </div>
        `;
        const container = document.querySelector('.container');
        const firstAlert = container.querySelector('.alert');
        container.insertBefore(alert, firstAlert.nextSibling);
        
        // Auto-remove after 5 seconds
        setTimeout(() => alert.remove(), 5000);
    }
    
    // Add print functionality
    window.addEventListener('beforeprint', () => {
        document.body.classList.add('printing');
    });
    
    window.addEventListener('afterprint', () => {
        document.body.classList.remove('printing');
    });
});