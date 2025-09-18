// loginSignUp.js - Fixed Firebase Authentication System
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    sendEmailVerification,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
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

// Google Provider Setup
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Global Variables
let currentUser = null;

// Password toggle function (must be global)
window.togglePassword = function(fieldId) {
    const field = document.getElementById(fieldId);
    const toggle = field?.nextElementSibling;
    
    if (!field || !toggle) return;
    
    if (field.type === 'password') {
        field.type = 'text';
        toggle.textContent = '🙈';
    } else {
        field.type = 'password';
        toggle.textContent = '👁️';
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page DOM loaded');
    setupEventListeners();
    showLogin(); // Start with login view
});

// Setup all event listeners
function setupEventListeners() {
    const headerRegisterBtn = document.getElementById('headerRegisterBtn');
    const signupLink = document.getElementById('signupLink');

    // Header toggle: Register ↔ Login
    if (headerRegisterBtn) {
        headerRegisterBtn.addEventListener('click', function(e) {
            e.preventDefault();

            if (headerRegisterBtn.textContent.trim() === "Register") {
                showSignup();
            } else {
                showLogin();
            }
        });
    }

    // Link inside login form → go to signup
    if (signupLink) {
        signupLink.addEventListener('click', function(e) {
            e.preventDefault();
            showSignup();
        });
    }
    
    // Form submissions
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const otpForm = document.getElementById('otpForm');
    const recoveryForm = document.getElementById('recoveryForm');
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (otpForm) otpForm.addEventListener('submit', handleOTPVerification);
    if (recoveryForm) recoveryForm.addEventListener('submit', handlePasswordRecovery);
    
    // Navigation buttons
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToLoginBtn = document.getElementById('backToLoginBtn');
    const backToSignupBtn = document.getElementById('backToSignupBtn');
    const googleSignIn = document.getElementById('googleSignIn');
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            showRecovery();
        });
    }
    
    if (backToLoginBtn) backToLoginBtn.addEventListener('click', showLogin);
    if (backToSignupBtn) backToSignupBtn.addEventListener('click', showSignup);
    if (googleSignIn) googleSignIn.addEventListener('click', handleGoogleSignIn);
    
    // Setup OTP inputs
    setupOTPInputs();
    
    // Setup form validation
    setupFormValidation();
}

// Form handlers
async function handleLogin(e) {
    e.preventDefault();
    clearMessages();
    
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;

    if (!validateEmail(email)) {
        showError('Please enter a valid email address.');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
    }

    showLoading(true, 'Signing in...');

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        if (!userCredential.user.emailVerified) {
            showError('Please verify your email address before signing in.');
            showLoading(false);
            return;
        }
        
        updateLastLogin(userCredential.user.uid); // background
        showSuccess('Login successful! Redirecting to home...');
        showLoading(false);
        
        setTimeout(() => {
            window.location.href = './index.html?success=login';
        }, 500);

    } catch (error) {
        showError(getAuthErrorMessage(error));
        showLoading(false);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    clearMessages();

    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) {
        showError("Please verify that you're not a robot.");
        return;
    }

    const name = document.getElementById('signupName')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim();
    const password = document.getElementById('signupPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;

    if (!name) return showError('Please enter your full name.');
    if (!validateEmail(email)) return showError('Please enter a valid email address.');
    if (password.length < 6) return showError('Password must be at least 6 characters long.');
    if (password !== confirmPassword) return showError('Passwords do not match.');

    showLoading(true, 'Creating your account...');

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;

        sendEmailVerification(currentUser).catch(err => console.error('Email verification failed:', err));
        createUserDocument(currentUser, { displayName: name }).catch(err => console.error('User document creation failed:', err));

        showLoading(false);
        showInstructionScreen(email);

    } catch (error) {
        showError(getAuthErrorMessage(error));
        showLoading(false);
    }
}

async function handleOTPVerification(e) {
    e.preventDefault();
    clearMessages();
    
    const otpValue = getOTPValue();
    if (otpValue.length !== 6) {
        showError('Please enter the complete 6-digit verification code.');
        return;
    }

    showLoading(true, 'Verifying...');

    try {
        await currentUser.reload();
        
        if (currentUser.emailVerified) {
            updateVerificationStatus(currentUser.uid);
            showSuccess('Email verified successfully! Welcome to VPES!');
            setTimeout(() => {
                window.location.href = './index.html?success=verification';
            }, 500);
        } else {
            showError('Email verification failed. Please check your email and try again.');
        }
        
    } catch (error) {
        showError('Verification failed. Please try again.');
        console.error('OTP verification error:', error);
    } finally {
        showLoading(false);
    }
}

async function handlePasswordRecovery(e) {
    e.preventDefault();
    clearMessages();
    
    const email = document.getElementById('recoveryEmail')?.value.trim();
    if (!validateEmail(email)) {
        showError('Please enter a valid email address.');
        return;
    }

    showLoading(true, 'Sending reset email...');

    try {
        await sendPasswordResetEmail(auth, email);
        showSuccess('Password reset email sent! Check your inbox.');
    } catch (error) {
        showError(getAuthErrorMessage(error));
    } finally {
        showLoading(false);
    }
}

async function handleGoogleSignIn() {
    clearMessages();
    showLoading(true, 'Connecting to Google...');

    try {
        const result = await signInWithPopup(auth, googleProvider);
        createUserDocument(result.user).catch(err => console.error('User doc creation failed:', err));
        
        showSuccess('Google sign-in successful! Redirecting to home...');
        setTimeout(() => {
            window.location.href = './index.html?success=login';
        }, 500);

    } catch (error) {
        showError(getAuthErrorMessage(error));
    } finally {
        showLoading(false);
    }
}

// View management
function showLogin() {
    updateHeaderButton('Register');
    updateFormHeader('Welcome Back!', 'Sign in to your account');
    showForm('login');
    showSignupPrompt(true);
}

function showSignup() {
    updateHeaderButton('Login');
    updateFormHeader('Create Account', 'Sign up for your account');
    showForm('signup');
    showSignupPrompt(false);
}

function showRecovery() {
    updateFormHeader('Reset Password', 'Enter your email to reset password');
    showForm('recovery');
    showSignupPrompt(false);
    
    const loginEmail = document.getElementById('loginEmail')?.value;
    if (loginEmail) {
        const recoveryEmail = document.getElementById('recoveryEmail');
        if (recoveryEmail) recoveryEmail.value = loginEmail;
    }
}

function showOTP() {
    updateFormHeader('Verify Email', 'Enter the verification code sent to your email');
    showForm('otp');
    showSignupPrompt(false);
}

function showForm(formType) {
    ['loginForm', 'signupForm', 'recoveryForm', 'otpForm'].forEach(id => {
        const form = document.getElementById(id);
        if (form) form.style.display = 'none';
    });
    
    const instructionScreen = document.getElementById('instructionScreen');
    if (instructionScreen) instructionScreen.style.display = 'none';
    
    const targetForm = document.getElementById(formType + 'Form');
    if (targetForm) targetForm.style.display = 'block';
    
    clearMessages();
}

function updateHeaderButton(text) {
    const headerRegisterBtn = document.getElementById('headerRegisterBtn');
    if (headerRegisterBtn) {
        headerRegisterBtn.textContent = text;
    }
}

function updateFormHeader(title, subtitle) {
    const formTitle = document.getElementById('formTitle');
    const formSubtitle = document.getElementById('formSubtitle');
    
    if (formTitle) formTitle.textContent = title;
    if (formSubtitle) formSubtitle.textContent = subtitle;
}

function showSignupPrompt(show) {
    const signupPrompt = document.getElementById('signupPrompt');
    if (signupPrompt) {
        signupPrompt.style.display = show ? 'block' : 'none';
    }
}

// (rest of file: instruction screen, loading, error/success, otp, validation, firestore utils, auth state monitoring — unchanged)


// Instruction screen
function showInstructionScreen(userEmail) {
    showForm('none'); // Hide all forms
    
    let instructionScreen = document.getElementById('instructionScreen');
    
    if (!instructionScreen) {
        instructionScreen = document.createElement('div');
        instructionScreen.id = 'instructionScreen';
        instructionScreen.style.cssText = 'text-align: center; padding: 40px 20px;';
        
        const container = document.querySelector('.form-content') || document.body;
        container.appendChild(instructionScreen);
    }
    
    instructionScreen.innerHTML = `
        <div style="max-width: 500px; margin: 0 auto;">
            <div style="font-size: 3rem; margin-bottom: 20px;">🎉</div>
            <h2 style="color: #28a745; margin-bottom: 20px; font-weight: 600;">Account Created Successfully!</h2>
            <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin-bottom: 25px; border: 1px solid #e9ecef;">
                <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 15px;">
                    We've sent a verification link to:
                </p>
                <p style="font-size: 18px; font-weight: 600; color: #6366f1; margin-bottom: 15px;">
                    ${userEmail}
                </p>
                <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
                    📧 Please check your inbox (and spam folder)
                </p>
                <p style="font-size: 14px; color: #6b7280;">
                    ✅ Click the verification link before logging in
                </p>
            </div>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button id="goToLoginBtn" style="padding: 12px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer;">
                    Go to Login
                </button>
                <button id="backToHomeFromInstruction" style="padding: 12px 24px; background: #6b7280; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer;">
                    Back to Home
                </button>
            </div>
            <p style="margin-top: 15px; font-size: 13px; color: #9ca3af;">
                Didn't receive the email? Check your spam folder or try signing up again.
            </p>
        </div>
    `;
    
    instructionScreen.style.display = 'block';
    
    // Setup button event listeners
    const goToLoginBtn = document.getElementById('goToLoginBtn');
    const backToHomeBtn = document.getElementById('backToHomeFromInstruction');
    
    if (goToLoginBtn) {
        goToLoginBtn.addEventListener('click', () => {
            instructionScreen.style.display = 'none';
            showLogin();
            showSuccess('Please log in with your verified account.');
        });
    }
    
    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => {
            window.location.href = './index.html';
        });
    }
}

// Utility functions
function showLoading(show = true, message = 'Processing...') {
    const loading = document.getElementById('loading');
    if (!loading) return;
    
    if (show) {
        loading.innerHTML = `
            <div class="spinner"></div>
            <p>${message}</p>
        `;
    }
    
    loading.style.display = show ? 'block' : 'none';
    
    // Disable/enable buttons
    const buttons = document.querySelectorAll('.btn, button');
    buttons.forEach(btn => btn.disabled = show);
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
}

function clearMessages() {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    if (errorMessage) errorMessage.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getAuthErrorMessage(error) {
    const errorMessages = {
        'auth/user-not-found': 'No account found with this email address.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-email': 'Invalid email address format.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
        'auth/weak-password': 'Password is too weak. Please use a stronger password.',
        'auth/popup-closed-by-user': 'Sign-in was cancelled.',
        'auth/popup-blocked': 'Pop-up was blocked. Please allow pop-ups and try again.',
        'auth/account-exists-with-different-credential': 'An account already exists with the same email. Try signing in with a different method.',
        'auth/network-request-failed': 'Network error. Please check your connection.'
    };
    
    return errorMessages[error.code] || 'An unexpected error occurred. Please try again.';
}

// OTP handling
function setupOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = value;
            
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
        
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = e.clipboardData.getData('text');
            const digits = paste.replace(/[^0-9]/g, '').slice(0, 6);
            
            digits.split('').forEach((digit, i) => {
                if (otpInputs[i]) otpInputs[i].value = digit;
            });
            
            if (digits.length === 6) otpInputs[5].focus();
        });
    });
}

function getOTPValue() {
    const otpInputs = document.querySelectorAll('.otp-input');
    return Array.from(otpInputs).map(input => input.value).join('');
}

// Form validation
function setupFormValidation() {
    const signupPassword = document.getElementById('signupPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (signupPassword) {
        signupPassword.addEventListener('input', function() {
            const isValid = this.value.length === 0 || this.value.length >= 6;
            this.classList.toggle('error', !isValid);
            
            if (confirmPassword?.value && confirmPassword.value !== this.value) {
                confirmPassword.classList.add('error');
            } else {
                confirmPassword.classList.remove('error');
            }
        });
    }
    
    if (confirmPassword) {
        confirmPassword.addEventListener('input', function() {
            const password = signupPassword?.value || '';
            const isMatch = this.value === '' || this.value === password;
            this.classList.toggle('error', !isMatch);
        });
    }

    // Email validation
    ['loginEmail', 'signupEmail', 'recoveryEmail'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', function() {
                const isValid = this.value === '' || validateEmail(this.value);
                this.classList.toggle('error', !isValid);
            });
        }
    });
}

// Firebase utilities
async function createUserDocument(user, additionalData = {}) {
    const userRef = doc(db, 'users', user.uid);
    const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'applicant',
        status: 'active',
        emailVerified: user.emailVerified,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        ...additionalData
    };

    try {
        await setDoc(userRef, userData, { merge: true });
        console.log('User document created successfully');
    } catch (error) {
        console.error('Error creating user document:', error);
    }
}

async function updateLastLogin(uid) {
    try {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    } catch (error) {
        console.error('Failed to update last login time:', error);
    }
}

async function updateVerificationStatus(uid) {
    try {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, { 
            emailVerified: true,
            verifiedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Failed to update verification status:', error);
    }
}

// Auth state monitoring
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        console.log('User is signed in and verified:', user.uid);
        showSuccess('You are already logged in. You can go back to home page.');
    } else {
        console.log('User is not signed in or not verified');
    }
});