// home.js - Updated for public access with optional authentication
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
    getAuth, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
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

// Global variables for UI state
let currentUser = null;
let userInterface = 'guest'; // 'guest' or 'authenticated'

// DOM elements
const guestNavigation = document.getElementById('guestNavigation');
const authenticatedNavigation = document.getElementById('authenticatedNavigation');
const enrollBtn = document.getElementById('enrollBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userProfile = document.getElementById('userProfile');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');

// Initialize home page
function initializeHomePage() {
    console.log('Home page initialized');
    
    // Monitor authentication state
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateUIForAuthState(user);
        
        // Update last login time for authenticated users (fire and forget)
        if (user && user.emailVerified) {
            const userRef = doc(db, 'users', user.uid);
            setDoc(userRef, { 
                lastLoginAt: serverTimestamp() 
            }, { merge: true })
                .catch(error => console.error('Failed to update last login time:', error));
        }
    });
    
    // Add event listeners
    addEventListeners();
}

// Update UI based on authentication state
function updateUIForAuthState(user) {
    if (user && user.emailVerified) {
        // User is authenticated and verified
        userInterface = 'authenticated';
        showAuthenticatedUI(user);
        console.log('Authenticated user detected:', user.email);
    } else {
        // Guest user or unverified
        userInterface = 'guest';
        showGuestUI();
        console.log('Guest user or unverified user');
    }
}

// Show UI for authenticated users
function showAuthenticatedUI(user) {
    // Hide guest navigation
    if (guestNavigation) {
        guestNavigation.style.display = 'none';
    }
    
    // Show authenticated navigation
    if (authenticatedNavigation) {
        authenticatedNavigation.style.display = 'flex';
    }
    
    // Update user profile information
    if (userName) {
        userName.textContent = user.displayName || user.email.split('@')[0];
    }
    
    if (userEmail) {
        userEmail.textContent = user.email;
    }
    
    // Show user profile section
    if (userProfile) {
        userProfile.style.display = 'block';
    }
    
    // Update page content for authenticated users
    updateContentForAuthenticatedUser();
}

// Show UI for guest users
function showGuestUI() {
    // Show guest navigation
    if (guestNavigation) {
        guestNavigation.style.display = 'flex';
    }
    
    // Hide authenticated navigation
    if (authenticatedNavigation) {
        authenticatedNavigation.style.display = 'none';
    }
    
    // Hide user profile section
    if (userProfile) {
        userProfile.style.display = 'none';
    }
    
    // Update page content for guest users
    updateContentForGuestUser();
}

// Update content for authenticated users
function updateContentForAuthenticatedUser() {
    // Add authenticated user specific content
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        welcomeMessage.innerHTML = `
            <h2>Welcome back, ${currentUser.displayName || 'User'}!</h2>
            <p>Access your dashboard and manage your account.</p>
        `;
    }
    
    // Enable authenticated-only features
    const restrictedSections = document.querySelectorAll('.auth-required');
    restrictedSections.forEach(section => {
        section.style.display = 'block';
        section.classList.remove('disabled');
    });
}

// Update content for guest users
function updateContentForGuestUser() {
    // Show public content
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        welcomeMessage.innerHTML = `
            <h2>Welcome to VPES</h2>
            <p>Explore our services and enroll to access premium features.</p>
        `;
    }
    
    // Hide authenticated-only features
    const restrictedSections = document.querySelectorAll('.auth-required');
    restrictedSections.forEach(section => {
        section.style.display = 'none';
        section.classList.add('disabled');
    });
    
    // Show enrollment call-to-action
    showEnrollmentPrompts();
}

// Show enrollment prompts for guests
function showEnrollmentPrompts() {
    const enrollPrompts = document.querySelectorAll('.enroll-prompt');
    enrollPrompts.forEach(prompt => {
        prompt.style.display = 'block';
        prompt.innerHTML = `
            <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0;">Ready to Get Started?</h3>
                <p style="margin: 0 0 15px 0;">Join VPES today and unlock exclusive features!</p>
                <button class="btn enroll-cta-btn" style="background: white; color: #007bff; padding: 12px 30px; border: none; border-radius: 25px; font-weight: bold; cursor: pointer;">
                    Enroll Now
                </button>
            </div>
        `;
    });
    
    // Add click handlers to enrollment CTA buttons
    document.querySelectorAll('.enroll-cta-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            window.location.href = './login.html?mode=signup';
        });
    });
}

// Add all event listeners
function addEventListeners() {
    // Enroll button - redirect to signup
    if (enrollBtn) {
        enrollBtn.addEventListener('click', () => {
            window.location.href = './login.html?mode=signup';
        });
    }
    
    // Login button - redirect to login
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = './login.html?mode=login';
        });
    }
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                showLoading(true, 'Signing out...');
                await signOut(auth);
                showSuccess('Successfully logged out!');
                
                // Reload page to reset to guest state
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } catch (error) {
                console.error('Logout error:', error);
                showError('Failed to log out. Please try again.');
            } finally {
                showLoading(false);
            }
        });
    }

    // Start Application button logic
const startApplicationBtn = document.getElementById('startApplicationBtn');
if (startApplicationBtn) {
    startApplicationBtn.addEventListener('click', () => {
        if (!currentUser) {
            // 🚨 No user logged in → redirect to login
            window.location.href = './login.html?mode=login';
        } else if (currentUser && !currentUser.emailVerified) {
            // 📧 User logged in but not verified
            showError('Please verify your email before starting the application.');
        } else {
            // ✅ User logged in & verified → go to application form
            window.location.href = './applicationform.html';
        }
    });
}

    
    // Add hover effects to navigation buttons
    addHoverEffects();
}

// Add hover effects to buttons
function addHoverEffects() {
    const buttons = document.querySelectorAll('.btn, .nav-btn');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });
}

// Utility functions for notifications
function showLoading(show = true, message = 'Processing...') {
    const loading = document.getElementById('loading');
    if (!loading) return;
    
    if (show) {
        loading.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div class="spinner" style="border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                <p style="color: #666; font-size: 14px;">${message}</p>
            </div>
        `;
        
        // Add spinner animation if not exists
        if (!document.querySelector('#spinnerAnimation')) {
            const style = document.createElement('style');
            style.id = 'spinnerAnimation';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    loading.style.display = show ? 'block' : 'none';
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    
    if (successMessage) {
        successMessage.style.display = 'none';
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (errorMessage) errorMessage.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    if (successMessage) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
    }
    
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (successMessage) successMessage.style.display = 'none';
    }, 5000);
}

// Check if user came from login with success message
function checkForLoginSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    
    if (success === 'login') {
        showSuccess('Welcome! You have successfully logged in.');
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Home page DOM loaded');
    
    // Initialize the home page
    initializeHomePage();
    
    // Check for success messages
    checkForLoginSuccess();
    
    // Add global styles for responsive design
    addResponsiveStyles();
});

// Add responsive styles
function addResponsiveStyles() {
    if (!document.querySelector('#homePageStyles')) {
        const style = document.createElement('style');
        style.id = 'homePageStyles';
        style.textContent = `
            /* Responsive navigation */
            .nav-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem 2rem;
                background: #f8f9fa;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .nav-buttons {
                display: flex;
                gap: 1rem;
            }
            
            .btn, .nav-btn {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 14px;
                font-weight: 500;
            }
            
            .btn-primary {
                background: #007bff;
                color: white;
            }
            
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
            
            .btn-success {
                background: #28a745;
                color: white;
            }
            
            .btn-danger {
                background: #dc3545;
                color: white;
            }
            
            /* User profile styles */
            .user-profile {
                background: white;
                padding: 1rem;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin: 1rem 0;
            }
            
            /* Auth required sections */
            .auth-required.disabled {
                opacity: 0.5;
                pointer-events: none;
            }
            
            /* Responsive design */
            @media (max-width: 768px) {
                .nav-container {
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .nav-buttons {
                    width: 100%;
                    justify-content: center;
                }
                
                .btn, .nav-btn {
                    flex: 1;
                    min-width: 100px;
                }
            }
            
            /* Message styles */
            #errorMessage, #successMessage {
                padding: 1rem;
                border-radius: 5px;
                margin: 1rem 0;
                display: none;
            }
            
            #errorMessage {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            #successMessage {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
        `;
        document.head.appendChild(style);
    }
}

// Export functions for global access
window.homePageAuth = {
    getCurrentUser: () => currentUser,
    getUserInterface: () => userInterface,
    isAuthenticated: () => currentUser && currentUser.emailVerified,
    redirectToLogin: () => window.location.href = './login.html?mode=login',
    redirectToSignup: () => window.location.href = './login.html?mode=signup'
};