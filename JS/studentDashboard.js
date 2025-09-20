// Student Dashboard JavaScript
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { 
    getAuth, 
    onAuthStateChanged,
    signOut 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    getDoc,
    setDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBRbYB7cW4wTV6s01ECNzBuE6SWSamTbz0",
    authDomain: "vpes-sims-auth.firebaseapp.com",
    projectId: "vpes-sims-auth",
    storageBucket: "vpes-sims-auth.firebasestorage.app",
    messagingSenderId: "837177415927",
    appId: "1:837177415927:web:62ec14608bd48adb939bf2",
    measurementId: "G-JV7F80F91L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables
let currentUser = null;
let applicationData = null;
let documentStatus = null;
let isGuestMode = false; // Track if running without authentication

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const studentName = document.getElementById('studentName');
const logoutBtn = document.getElementById('logoutBtn');
const profileBtn = document.getElementById('profileBtn');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.getElementById('sidebar');
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Check if coming directly from application submission
    const submittedApp = sessionStorage.getItem('submittedApplication');
    
    if (submittedApp) {
        // User just submitted application - allow guest access
        console.log('Application data found - loading in guest mode');
        initializeGuestMode();
    } else {
        // Normal authentication check
        checkAuthentication();
    }
    
    setupEventListeners();
});

// Initialize Guest Mode (for users who just submitted without login)
function initializeGuestMode() {
    isGuestMode = true;
    showLoading(true);
    
    // Set guest user name
    if (studentName) {
        const appData = JSON.parse(sessionStorage.getItem('submittedApplication') || '{}');
        const firstName = appData.applicationData?.firstName || 'Guest';
        studentName.textContent = firstName + ' (Guest)';
    }
    
    // Hide/modify auth-related buttons
    if (logoutBtn) {
        logoutBtn.textContent = 'Back to Home';
        logoutBtn.onclick = () => window.location.href = './index.html';
    }
    
    if (profileBtn) {
        profileBtn.style.display = 'none';
    }
    
    // Load application data
    loadApplicationData();
    
    // Hide loading after a short delay
    setTimeout(() => {
        showLoading(false);
    }, 500);
}

// Check Authentication
function checkAuthentication() {
    showLoading(true);
    
    // Set a timeout to prevent infinite loading
    const authTimeout = setTimeout(() => {
        console.log('Authentication timeout - checking for guest data');
        
        // If authentication takes too long, check for guest data
        const submittedApp = sessionStorage.getItem('submittedApplication');
        if (submittedApp) {
            initializeGuestMode();
        } else {
            // No data and no auth - redirect to login
            showLoading(false);
            if (confirm('You need to login to access the dashboard. Click OK to go to login page.')) {
                window.location.href = './login.html?redirect=dashboard';
            } else {
                window.location.href = './index.html';
            }
        }
    }, 5000); // 5 second timeout
    
    onAuthStateChanged(auth, async (user) => {
        clearTimeout(authTimeout); // Clear the timeout if auth responds
        
        if (user && user.emailVerified) {
            currentUser = user;
            isGuestMode = false;
            await loadUserData();
            loadApplicationData();
            showLoading(false);
        } else if (user && !user.emailVerified) {
            // User is logged in but email not verified
            showLoading(false);
            alert('Please verify your email before accessing the dashboard.');
            window.location.href = './login.html';
        } else {
            // No user - check for guest data
            const submittedApp = sessionStorage.getItem('submittedApplication');
            if (submittedApp) {
                initializeGuestMode();
            } else {
                // No user and no guest data - redirect to login
                showLoading(false);
                window.location.href = './login.html?redirect=dashboard';
            }
        }
    });
}

// Load User Data
async function loadUserData() {
    try {
        // Display user name
        if (studentName) {
            studentName.textContent = currentUser.displayName || currentUser.email.split('@')[0];
        }
        
        // Update last visit
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { 
            lastVisit: serverTimestamp() 
        }, { merge: true });
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load Application Data from SessionStorage or Firestore
async function loadApplicationData() {
    try {
        // First try to get from sessionStorage (recent submission)
        const submittedApp = sessionStorage.getItem('submittedApplication');
        
        if (submittedApp) {
            const submission = JSON.parse(submittedApp);
            applicationData = submission.applicationData;
            documentStatus = submission.documentStatus;
            
            updateDashboard(submission);
        } else if (currentUser && !isGuestMode) {
            // Load from Firestore if authenticated
            const appRef = doc(db, 'applications', currentUser.uid);
            const appDoc = await getDoc(appRef);
            
            if (appDoc.exists()) {
                const data = appDoc.data();
                updateDashboardFromFirestore(data);
            } else {
                // No application found - show empty state
                showEmptyState();
            }
        } else {
            // Guest mode with no data
            showEmptyState();
        }
    } catch (error) {
        console.error('Error loading application data:', error);
        showEmptyState();
    }
}

// Update Dashboard with Application Data
function updateDashboard(submission) {
    if (!submission) return;
    
    const { referenceNumber, applicationData, documentStatus, submittedAt, status } = submission;
    
    // Update Application ID
    const appIdEl = document.getElementById('applicationId');
    if (appIdEl) appIdEl.textContent = referenceNumber || 'PENDING';
    
    // Update Grade Level
    const gradeLevelEl = document.getElementById('gradeLevel');
    if (gradeLevelEl && applicationData) {
        gradeLevelEl.textContent = formatGradeLevel(applicationData.gradeLevel);
    }
    
    // Update Date Applied
    const dateAppliedEl = document.getElementById('dateApplied');
    if (dateAppliedEl) dateAppliedEl.textContent = formatDate(submittedAt);
    
    // Update Current Status
    const currentStatusEl = document.getElementById('currentStatus');
    const statusBadge = document.getElementById('statusBadge');
    if (currentStatusEl) currentStatusEl.textContent = formatStatus(status);
    if (statusBadge) statusBadge.textContent = formatStatus(status);
    
    // Update Document Status
    if (documentStatus) {
        updateDocumentStatuses(documentStatus);
    }
    
    // Update Timeline
    updateTimeline(submittedAt);
    
    // Populate Application Details
    if (applicationData) {
        populateApplicationDetails(applicationData);
    }
    
    // Show success message if just submitted
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('submitted') === 'true') {
        showSuccessMessage();
    }
}

// Show Success Message
function showSuccessMessage() {
    const updateAlert = document.getElementById('updateAlert');
    if (updateAlert) {
        updateAlert.innerHTML = `
            <span class="alert-icon">✅</span>
            <span class="alert-text">
                <strong>Success!</strong> Your application has been submitted successfully. 
                You will receive an email confirmation shortly.
            </span>
        `;
        updateAlert.style.background = '#10b981';
        updateAlert.style.color = 'white';
        
        // Reset after 5 seconds
        setTimeout(() => {
            updateAlert.style.background = '';
            updateAlert.style.color = '';
            updateAlert.innerHTML = `
                <span class="alert-icon">ℹ️</span>
                <span class="alert-text">
                    Application is currently under review. We'll notify you once there's an update.
                </span>
            `;
        }, 5000);
    }
}

// Update Dashboard from Firestore Data
function updateDashboardFromFirestore(data) {
    // Similar to updateDashboard but with Firestore structure
    updateDashboard({
        referenceNumber: data.applicationId || 'VPES-2025-PENDING',
        applicationData: data.formData || {},
        documentStatus: data.documents || {},
        submittedAt: data.submittedAt || new Date().toISOString(),
        status: data.status || 'PENDING_REVIEW'
    });
}

// Update Document Statuses
function updateDocumentStatuses(status) {
    if (!status) {
        // Set default statuses if no data
        status = {
            birthCert: false,
            reportCard: false,
            idPhoto: false,
            moralCert: false
        };
    }
    
    // Birth Certificate
    updateDocumentItem('docBirthCert', status.birthCert);
    
    // Report Card
    updateDocumentItem('docReportCard', status.reportCard);
    
    // ID Photo
    updateDocumentItem('docIdPhoto', status.idPhoto);
    
    // Good Moral Certificate
    updateDocumentItem('docMoralCert', status.moralCert);
}

// Update Individual Document Item
function updateDocumentItem(elementId, isUploaded) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Remove all status classes
    element.classList.remove('verified', 'pending', 'not-uploaded');
    
    if (isUploaded === true) {
        element.classList.add('verified');
        element.innerHTML = '<span>✓</span> VERIFIED';
    } else if (isUploaded === 'pending') {
        element.classList.add('pending');
        element.innerHTML = '<span>⏱</span> PENDING';
    } else {
        element.classList.add('not-uploaded');
        element.innerHTML = '<span>📤</span> NOT UPLOADED';
    }
}

// Format Grade Level
function formatGradeLevel(grade) {
    if (!grade) return 'Not Specified';
    
    const gradeMap = {
        'kindergarten': 'Kindergarten',
        'grade_1': 'Grade 1',
        'grade_2': 'Grade 2',
        'grade_3': 'Grade 3',
        'grade_4': 'Grade 4',
        'grade_5': 'Grade 5',
        'grade_6': 'Grade 6'
    };
    
    return gradeMap[grade] || grade.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Format Date
function formatDate(dateString) {
    if (!dateString) return 'Not Available';
    
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

// Format Status
function formatStatus(status) {
    const statusMap = {
        'PENDING_REVIEW': 'Under Review',
        'UNDER_REVIEW': 'Under Review',
        'DOCUMENTS_PENDING': 'Documents Pending',
        'APPROVED': 'Approved',
        'REJECTED': 'Rejected',
        'ENROLLED': 'Enrolled'
    };
    
    return statusMap[status] || status.replace(/_/g, ' ');
}

// Update Timeline
function updateTimeline(submittedDate) {
    const submittedDateEl = document.getElementById('submittedDate');
    if (submittedDateEl) {
        submittedDateEl.textContent = formatDate(submittedDate);
    }
}

// Populate Application Details in My Application Section
function populateApplicationDetails(data) {
    const container = document.getElementById('studentInfoContainer');
    if (!container || !data) return;
    
    const fullName = formatFullName(data);
    const birthDate = data.birthDate ? formatDate(data.birthDate) : 'Not Provided';
    const lrn = data.lrn || 'Not Applicable';
    const email = data.parentEmail || data.motherEmail || data.fatherEmail || 'Not Provided';
    const contact = data.parentContact || data.motherContact || data.fatherContact || 'Not Provided';
    
    container.innerHTML = `
        <div class="info-grid">
            <div class="info-section">
                <h4>Student Information</h4>
                <div class="info-item">
                    <span class="info-label">Full Name:</span>
                    <span class="info-value">${fullName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">LRN:</span>
                    <span class="info-value">${lrn}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Birth Date:</span>
                    <span class="info-value">${birthDate}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Grade Applied:</span>
                    <span class="info-value">${formatGradeLevel(data.gradeLevel)}</span>
                </div>
            </div>
            
            <div class="info-section">
                <h4>Contact Information</h4>
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${email}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Contact Number:</span>
                    <span class="info-value">${contact}</span>
                </div>
            </div>
        </div>
        
        <style>
            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 30px;
            }
            .info-section {
                background: var(--light-gray);
                padding: 20px;
                border-radius: 12px;
            }
            .info-section h4 {
                color: var(--dark);
                margin-bottom: 15px;
                font-size: 1.1rem;
            }
            .info-item {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid var(--border);
            }
            .info-item:last-child {
                border-bottom: none;
            }
            .info-label {
                color: var(--gray);
                font-weight: 500;
            }
            .info-value {
                color: var(--dark);
                font-weight: 600;
                text-align: right;
            }
        </style>
    `;
}

// Format Full Name
function formatFullName(data) {
    const parts = [];
    if (data.firstName) parts.push(data.firstName);
    if (data.middleName) parts.push(data.middleName);
    if (data.lastName) parts.push(data.lastName);
    if (data.extensionName) parts.push(data.extensionName);
    
    return parts.length > 0 ? parts.join(' ') : 'Not Provided';
}

// Populate Documents List
function populateDocumentsList() {
    const container = document.getElementById('documentListContainer');
    if (!container) return;
    
    const documents = [
        { name: 'Birth Certificate', status: documentStatus?.birthCert, required: true },
        { name: 'Report Card', status: documentStatus?.reportCard, required: false },
        { name: '2x2 Photo', status: documentStatus?.idPhoto, required: true },
        { name: 'Good Moral Certificate', status: documentStatus?.moralCert, required: false }
    ];
    
    container.innerHTML = `
        <div class="document-grid">
            ${documents.map(doc => `
                <div class="document-card">
                    <div class="document-icon">${getDocumentIcon(doc.status)}</div>
                    <h4>${doc.name}</h4>
                    <p class="doc-requirement">${doc.required ? 'Required' : 'Optional'}</p>
                    <span class="doc-status ${getStatusClass(doc.status)}">
                        ${getStatusText(doc.status)}
                    </span>
                </div>
            `).join('')}
        </div>
        
        <style>
            .document-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            .document-card {
                background: var(--light-gray);
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                transition: all 0.3s ease;
            }
            .document-card:hover {
                transform: translateY(-5px);
                box-shadow: var(--shadow-md);
            }
            .document-icon {
                font-size: 2.5rem;
                margin-bottom: 10px;
            }
            .document-card h4 {
                color: var(--dark);
                margin-bottom: 5px;
            }
            .doc-requirement {
                color: var(--gray);
                font-size: 0.85rem;
                margin-bottom: 10px;
            }
        </style>
    `;
}

function getDocumentIcon(status) {
    if (status === true) return '✅';
    if (status === 'pending') return '⏳';
    return '📄';
}

function getStatusClass(status) {
    if (status === true) return 'verified';
    if (status === 'pending') return 'pending';
    return 'not-uploaded';
}

function getStatusText(status) {
    if (status === true) return 'Verified';
    if (status === 'pending') return 'Pending Review';
    return 'Not Uploaded';
}

// Show Empty State
function showEmptyState() {
    const statusBadge = document.getElementById('statusBadge');
    if (statusBadge) statusBadge.textContent = 'NO APPLICATION';
    
    const updateAlert = document.getElementById('updateAlert');
    if (updateAlert) {
        updateAlert.innerHTML = `
            <span class="alert-icon">ℹ️</span>
            <span class="alert-text">
                <strong>Welcome!</strong> You haven't submitted an application yet. 
                <a href="applicationform.html" style="color: inherit; font-weight: 600;">Start your application now</a>.
            </span>
        `;
    }
    
    // Hide document statuses
    ['docBirthCert', 'docReportCard', 'docIdPhoto', 'docMoralCert'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('not-uploaded');
            el.innerHTML = '<span>—</span> NO DATA';
        }
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Logout Button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Profile Button
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            if (isGuestMode) {
                alert('Please login to access your profile.');
                window.location.href = './login.html';
            } else {
                alert('Profile page coming soon!');
            }
        });
    }
    
    // Mobile Menu Toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Navigation Items
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
        });
    });
    
    // View Timeline Button
    const viewTimelineBtn = document.getElementById('viewTimelineBtn');
    if (viewTimelineBtn) {
        viewTimelineBtn.addEventListener('click', () => {
            switchSection('status');
        });
    }
}

// Handle Logout
async function handleLogout() {
    if (isGuestMode) {
        // Guest mode - just go home
        window.location.href = './index.html';
        return;
    }
    
    if (confirm('Are you sure you want to logout?')) {
        showLoading(true);
        try {
            await signOut(auth);
            // Clear session data
            sessionStorage.clear();
            window.location.href = './index.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Failed to logout. Please try again.');
        } finally {
            showLoading(false);
        }
    }
}

// Toggle Mobile Menu
function toggleMobileMenu() {
    mobileMenuToggle.classList.toggle('active');
    sidebar.classList.toggle('active');
    
    // Close menu when clicking outside
    if (sidebar.classList.contains('active')) {
        document.addEventListener('click', closeMobileMenuOnOutsideClick);
    } else {
        document.removeEventListener('click', closeMobileMenuOnOutsideClick);
    }
}

// Close Mobile Menu on Outside Click
function closeMobileMenuOnOutsideClick(e) {
    if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
        mobileMenuToggle.classList.remove('active');
        sidebar.classList.remove('active');
        document.removeEventListener('click', closeMobileMenuOnOutsideClick);
    }
}

// Switch Section
function switchSection(sectionName) {
    // Update navigation
    navItems.forEach(item => {
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Update content sections
    contentSections.forEach(section => {
        if (section.id === `${sectionName}Section`) {
            section.classList.add('active');
            
            // Load section-specific data
            if (sectionName === 'documents') {
                populateDocumentsList();
            }
        } else {
            section.classList.remove('active');
        }
    });
    
    // Close mobile menu after navigation
    if (window.innerWidth <= 768) {
        mobileMenuToggle.classList.remove('active');
        sidebar.classList.remove('active');
    }
}

// Show/Hide Loading Overlay
function showLoading(show) {
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.add('show');
        } else {
            loadingOverlay.classList.remove('show');
        }
    }
}

// Auto-refresh data every 30 seconds (only for authenticated users)
setInterval(() => {
    if (currentUser && !isGuestMode) {
        loadApplicationData();
    }
}, 30000);

// Export functions for global use
window.dashboardFunctions = {
    switchSection,
    showLoading,
    loadApplicationData
};