// Import Firebase functions
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile,
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

const googleProvider = new GoogleAuthProvider();

// Force account chooser every time
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Add required scopes
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Global variables
let currentUser = null;
let resendTimer = null;
let resendCountdown = 0;
let initialMode = 'login'; // Default mode

// DOM elements
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const otpForm = document.getElementById('otpForm');
const recoveryForm = document.getElementById('recoveryForm');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const loading = document.getElementById('loading');
const authTabs = document.getElementById('authTabs');
const backToHomeBtn = document.getElementById('backToHomeBtn');

// Initialize login page
function initializeLoginPage() {
    // Check URL parameters for mode
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    
    if (mode === 'signup') {
        initialMode = 'signup';
        switchTab('signup');
    } else {
        initialMode = 'login';
        switchTab('login');
    }
    
    // Add back to home button if it doesn't exist
    addBackToHomeButton();
    
    console.log('Login page initialized with mode:', initialMode);
}

// Add back to home button
function addBackToHomeButton() {
    if (!backToHomeBtn) {
        const container = document.querySelector('.auth-container') || document.querySelector('.container');
        if (container) {
            const backBtn = document.createElement('button');
            backBtn.id = 'backToHomeBtn';
            backBtn.className = 'btn btn-secondary back-to-home-btn';
            backBtn.innerHTML = '← Back to Home';
            backBtn.style.cssText = 'position: absolute; top: 20px; left: 20px; z-index: 1000;';
            
            backBtn.addEventListener('click', () => {
                window.location.href = './index.html'; // or './index.html' depending on your setup
            });
            
            container.appendChild(backBtn);
        }
    } else {
        // Add event listener if button already exists
        backToHomeBtn.addEventListener('click', () => {
            window.location.href = './index.html';
        });
    }
}

// Tab switching function
function switchTab(tab) {
    console.log('Switching to tab:', tab);
    
    // Hide all forms including instruction screen
    loginForm.style.display = 'none';
    signupForm.style.display = 'none';
    otpForm.style.display = 'none';
    recoveryForm.style.display = 'none';
    
    // Hide instruction screen when switching tabs
    const instructionScreen = document.getElementById('instructionScreen');
    if (instructionScreen) {
        instructionScreen.style.display = 'none';
    }
    
    // Show tabs
    authTabs.style.display = 'flex';
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.style.display = 'block';
        
        // Update URL parameter
        updateURLParameter('mode', 'login');
    } else {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.style.display = 'block';
        
        // Update URL parameter
        updateURLParameter('mode', 'signup');
    }
    clearMessages();
    console.log('Tab switched to:', tab);
}

// Update URL parameter without page refresh
function updateURLParameter(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.replaceState({}, '', url);
}

// Tab event listeners
loginTab.addEventListener('click', () => switchTab('login'));
signupTab.addEventListener('click', () => switchTab('signup'));

// OPTIMIZED Login form handler - Updated for home redirect
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

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
        
        showSuccess('Login successful! Redirecting to home...');
        showLoading(false);
        
        // Update last login time in background (fire and forget)
        const userRef = doc(db, 'users', userCredential.user.uid);
        setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true })
            .catch(error => console.error('Failed to update last login time:', error));
        
        // Redirect to home with success parameter
        setTimeout(() => {
            window.location.href = './index.html?success=login';
        }, 300);

    } catch (error) {
        let errorMsg = 'Login failed. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMsg = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorMsg = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMsg = 'Invalid email address format.';
                break;
            case 'auth/user-disabled':
                errorMsg = 'This account has been disabled.';
                break;
            case 'auth/too-many-requests':
                errorMsg = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/network-request-failed':
                errorMsg = 'Network error. Please check your connection.';
                break;
        }
        
        showError(errorMsg);
        showLoading(false);
    }
});

// OPTIMIZED Signup form handler - Updated for home redirect
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Signup form submitted');
    clearMessages();

    // Get reCAPTCHA response
    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) {
        showError("Please verify that you're not a robot.");
        return;
    }

    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (!validateEmail(email)) {
        showError('Please enter a valid email address.');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
    }

    if (password !== confirmPassword) {
        showError('Passwords do not match.');
        return;
    }

    console.log('Starting signup process...');
    showLoading(true, 'Creating your account...');

    try {
        console.log('Creating user account...');
        // Firebase signup
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        console.log('User created:', currentUser.uid);

        // Send verification email and create user document in background (fire and forget)
        const emailPromise = sendEmailVerification(currentUser)
            .catch(error => console.error('Failed to send verification email:', error));
        
        const userDocPromise = createUserDocument(currentUser)
            .catch(error => console.error('Failed to create user document:', error));

        // Show instruction screen immediately (within 200ms)
        setTimeout(() => {
            showLoading(false);
            showInstructionScreen(email);
        }, 200);

        // Let background processes complete without blocking UI
        Promise.all([emailPromise, userDocPromise])
            .then(() => console.log('Background signup processes completed'))
            .catch(error => console.error('Background signup process error:', error));

    } catch (error) {
        console.error('Signup error:', error);
        let errorMsg = "Signup failed. Please try again.";
        
        // Handle specific Firebase errors
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMsg = 'An account with this email already exists.';
                break;
            case 'auth/invalid-email':
                errorMsg = 'Invalid email address format.';
                break;
            case 'auth/operation-not-allowed':
                errorMsg = 'Email/password accounts are not enabled.';
                break;
            case 'auth/weak-password':
                errorMsg = 'Password is too weak. Please use a stronger password.';
                break;
            case 'auth/network-request-failed':
                errorMsg = 'Network error. Please check your connection.';
                break;
        }
        
        showError(errorMsg);
        showLoading(false);
    }
});

// Updated Show instruction screen function
function showInstructionScreen(userEmail = '') {
    console.log('showInstructionScreen called');
    
    // Hide all other forms/tabs
    loginForm.style.display = 'none';
    signupForm.style.display = 'none';
    otpForm.style.display = 'none';
    recoveryForm.style.display = 'none';
    authTabs.style.display = 'none';
    
    // Clear any messages
    clearMessages();
    
    // Get or create instruction screen
    let instructionScreen = document.getElementById('instructionScreen');
    
    if (!instructionScreen) {
        // Create instruction screen if it doesn't exist
        instructionScreen = document.createElement('div');
        instructionScreen.id = 'instructionScreen';
        instructionScreen.style.cssText = 'text-align:center; padding:40px 20px; animation: fadeIn 0.3s ease-in;';
        
        // Add to container
        const container = document.querySelector('.auth-container') || document.body;
        container.appendChild(instructionScreen);
        
        // Add CSS animation if not exists
        if (!document.querySelector('#instructionAnimation')) {
            const style = document.createElement('style');
            style.id = 'instructionAnimation';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .instruction-icon {
                    font-size: 72px;
                    margin-bottom: 20px;
                    animation: bounce 0.8s ease-in-out;
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Update instruction screen content with updated messaging
    instructionScreen.innerHTML = `
        <div style="max-width: 500px; margin: 0 auto;">
            <div class="instruction-icon">🎉</div>
            <h2 style="color: #28a745; margin-bottom: 20px;">Account Created Successfully!</h2>
            <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 15px;">
                    We've sent a verification link to:
                </p>
                <p style="font-size: 18px; font-weight: bold; color: #007bff; margin-bottom: 15px;">
                    ${userEmail || 'your email address'}
                </p>
                <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                    📧 Please check your inbox (and spam folder)
                </p>
                <p style="font-size: 14px; color: #666;">
                    ✅ Click the verification link before logging in
                </p>
            </div>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button id="goToLoginBtn" class="btn" style="background: #007bff; color: white; padding: 12px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; transition: all 0.3s;">
                    Go to Login
                </button>
                <button id="backToHomeFromInstruction" class="btn" style="background: #6c757d; color: white; padding: 12px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; transition: all 0.3s;">
                    Back to Home
                </button>
            </div>
            <p style="margin-top: 15px; font-size: 13px; color: #999;">
                Didn't receive the email? Check your spam folder or try signing up again.
            </p>
        </div>
    `;
    
    // Show the instruction screen
    instructionScreen.style.display = 'block';
    console.log('Instruction screen displayed');
    
    // Attach event listener to the login button
    const goToLoginBtn = document.getElementById('goToLoginBtn');
    if (goToLoginBtn) {
        goToLoginBtn.addEventListener('click', () => {
            console.log('Go to Login button clicked');
            instructionScreen.style.display = 'none';
            switchTab('login');
            showSuccess('Please log in with your verified account.');
        });
        
        // Add hover effect
        goToLoginBtn.addEventListener('mouseenter', function() {
            this.style.background = '#0056b3';
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        });
        
        goToLoginBtn.addEventListener('mouseleave', function() {
            this.style.background = '#007bff';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    }
    
    // Attach event listener to the back to home button
    const backToHomeFromInstruction = document.getElementById('backToHomeFromInstruction');
    if (backToHomeFromInstruction) {
        backToHomeFromInstruction.addEventListener('click', () => {
            console.log('Back to Home from instruction clicked');
            window.location.href = './index.html';
        });
        
        // Add hover effect
        backToHomeFromInstruction.addEventListener('mouseenter', function() {
            this.style.background = '#545b62';
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        });
        
        backToHomeFromInstruction.addEventListener('mouseleave', function() {
            this.style.background = '#6c757d';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    }
}

// OTP verification form handler - Updated for home redirect
otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();
    
    const otpValue = getOtpValue();
    
    if (otpValue.length !== 6) {
        showError('Please enter the complete 6-digit verification code.');
        return;
    }

    showLoading(true, 'Verifying...');

    try {
        // Reload user to get updated email verification status
        await currentUser.reload();
        
        if (currentUser.emailVerified) {
            // Update user document in background
            const userRef = doc(db, 'users', currentUser.uid);
            setDoc(userRef, { 
                emailVerified: true,
                verifiedAt: serverTimestamp()
            }, { merge: true }).catch(error => console.error('Failed to update verification status:', error));
            
            showSuccess('Email verified successfully! Welcome to VPES!');
            
            setTimeout(() => {
                window.location.href = './index.html?success=verification';
            }, 300);
        } else {
            showError('Email verification failed. Please check your email and try again.');
        }
        
    } catch (error) {
        showError('Verification failed. Please try again.');
        console.error('OTP verification error:', error);
    } finally {
        showLoading(false);
    }
});

// Recovery form handler
recoveryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();
    
    const email = document.getElementById('recoveryEmail').value.trim();
    
    if (!validateEmail(email)) {
        showError('Please enter a valid email address.');
        return;
    }

    showLoading(true, 'Sending reset email...');

    try {
        await sendPasswordResetEmail(auth, email);
        showSuccess('Password reset email sent! Check your inbox for instructions.');
    } catch (error) {
        let errorMsg = 'Failed to send password reset email.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMsg = 'No account found with this email address.';
                break;
            case 'auth/invalid-email':
                errorMsg = 'Invalid email address format.';
                break;
            case 'auth/network-request-failed':
                errorMsg = 'Network error. Please check your connection.';
                break;
        }
        
        showError(errorMsg);
    } finally {
        showLoading(false);
    }
});

// OPTIMIZED Google Sign In - Updated for home redirect
document.getElementById('googleSignIn').addEventListener('click', async () => {
    clearMessages();
    showLoading(true, 'Connecting to Google...');

    try {
        const result = await signInWithPopup(auth, googleProvider);
        
        // Create user document in background (fire and forget)
        createUserDocument(result.user)
            .catch(error => console.error('Failed to create user document:', error));
        
        showSuccess('Google sign-in successful! Redirecting to home...');
        
        // Redirect to home with success parameter
        setTimeout(() => {
            window.location.href = './index.html?success=login';
        }, 300);

    } catch (error) {
        let errorMsg = 'Google sign-in failed. Please try again.';
        
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                errorMsg = 'Sign-in was cancelled.';
                break;
            case 'auth/popup-blocked':
                errorMsg = 'Pop-up was blocked. Please allow pop-ups and try again.';
                break;
            case 'auth/account-exists-with-different-credential':
                errorMsg = 'An account already exists with the same email. Try signing in with a different method.';
                break;
            case 'auth/network-request-failed':
                errorMsg = 'Network error. Please check your connection.';
                break;
        }
        
        showError(errorMsg);
    } finally {
        showLoading(false);
    }
});

// Event handlers
document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
    e.preventDefault();
    showRecoveryForm();
});

// Resend OTP handler
document.getElementById('resendOtpBtn')?.addEventListener('click', async () => {
    if (!currentUser) {
        showError('Session expired. Please try signing up again.');
        return;
    }
    
    showLoading(true, 'Resending email...');
    
    try {
        const actionCodeSettings = {
            url: window.location.origin + '/login.html',
            handleCodeInApp: false,
        };
        
        await sendEmailVerification(currentUser, actionCodeSettings);
        showSuccess('Verification email sent again! Please check your inbox.');
        startResendTimer();
    } catch (error) {
        console.error('Error resending verification email:', error);
        showError('Failed to resend verification email. Please try again.');
    } finally {
        showLoading(false);
    }
});

document.getElementById('backToSignupBtn')?.addEventListener('click', () => {
    clearInterval(resendTimer);
    switchTab('signup');
});

document.getElementById('backToLoginBtn')?.addEventListener('click', () => {
    switchTab('login');
});

// Utility functions
function showLoading(show = true, message = 'Processing...') {
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
    
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => btn.disabled = show);
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
}

function clearMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// OPTIMIZED Create user document in Firestore (fire and forget)
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
        // Don't throw error as this is now fire-and-forget
    }
}

// Show OTP form
function showOtpForm(email) {
    authTabs.style.display = 'none';
    loginForm.style.display = 'none';
    signupForm.style.display = 'none';
    otpForm.style.display = 'block';
    document.getElementById('otpEmail').textContent = email;
    clearMessages();
    
    // Focus first OTP input
    document.getElementById('otp1').focus();
    
    // Start resend timer
    startResendTimer();
}

// Show recovery form
function showRecoveryForm() {
    authTabs.style.display = 'none';
    loginForm.style.display = 'none';
    signupForm.style.display = 'none';
    recoveryForm.style.display = 'block';
    clearMessages();
    
    // Auto-fill recovery email from login email if available
    const loginEmail = document.getElementById('loginEmail').value;
    if (loginEmail) {
        document.getElementById('recoveryEmail').value = loginEmail;
    }
}

// OTP input handling
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
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('verifyOtpBtn').click();
        }
    });
    
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = e.clipboardData.getData('text');
        const digits = paste.replace(/[^0-9]/g, '').slice(0, 6);
        
        digits.split('').forEach((digit, i) => {
            if (otpInputs[i]) {
                otpInputs[i].value = digit;
            }
        });
        
        if (digits.length === 6) {
            otpInputs[5].focus();
        }
    });
});

// Get OTP value
function getOtpValue() {
    const otpInputs = document.querySelectorAll('.otp-input');
    return Array.from(otpInputs).map(input => input.value).join('');
}

// Clear OTP inputs
function clearOtpInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach(input => input.value = '');
    if (otpInputs.length > 0) {
        otpInputs[0].focus();
    }
}

// Resend timer
function startResendTimer() {
    const resendBtn = document.getElementById('resendOtpBtn');
    const resendTimerEl = document.getElementById('resendTimer');
    
    if (!resendBtn || !resendTimerEl) {
        console.warn('Resend button or timer element not found');
        return;
    }
    
    resendCountdown = 60;
    resendBtn.disabled = true;
    
    resendTimer = setInterval(() => {
        resendTimerEl.textContent = `Resend code in ${resendCountdown}s`;
        resendCountdown--;
        
        if (resendCountdown < 0) {
            clearInterval(resendTimer);
            resendBtn.disabled = false;
            resendTimerEl.textContent = '';
        }
    }, 1000);
}

// Monitor authentication state - Updated for optional authentication
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        console.log('User is signed in and verified:', user);
        // Don't auto-redirect - let user choose to stay or go home
        showSuccess('You are already logged in. You can go back to home page.');
    } else {
        console.log('User is not signed in or not verified');
    }
});

// Make functions globally available
window.togglePassword = function(fieldId) {
    const field = document.getElementById(fieldId);
    const toggle = field.nextElementSibling;
    
    if (field.type === 'password') {
        field.type = 'text';
        toggle.textContent = '🙈';
    } else {
        field.type = 'password';
        toggle.textContent = '👁️';
    }
};

// Real-time password validation
document.getElementById('signupPassword')?.addEventListener('input', function() {
    const password = this.value;
    const confirmField = document.getElementById('confirmPassword');
    
    if (password.length > 0 && password.length < 6) {
        this.classList.add('error');
    } else {
        this.classList.remove('error');
    }
    
    // Check confirm password match
    if (confirmField.value && confirmField.value !== password) {
        confirmField.classList.add('error');
    } else {
        confirmField.classList.remove('error');
    }
});

document.getElementById('confirmPassword')?.addEventListener('input', function() {
    const password = document.getElementById('signupPassword').value;
    
    if (this.value && this.value !== password) {
        this.classList.add('error');
    } else {
        this.classList.remove('error');
    }
});

// Email validation for form fields
document.getElementById('loginEmail')?.addEventListener('blur', function() {
    if (this.value && !validateEmail(this.value)) {
        this.classList.add('error');
    } else {
        this.classList.remove('error');
    }
});

document.getElementById('signupEmail')?.addEventListener('blur', function() {
    if (this.value && !validateEmail(this.value)) {
        this.classList.add('error');
    } else {
        this.classList.remove('error');
    }
});

document.getElementById('recoveryEmail')?.addEventListener('blur', function() {
    if (this.value && !validateEmail(this.value)) {
        this.classList.add('error');
    } else {
        this.classList.remove('error');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (resendTimer) {
        clearInterval(resendTimer);
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Login page DOM loaded');
    
    // Initialize the login page
    initializeLoginPage();
    
    // Add styles for back button and responsive design
    addLoginPageStyles();
});

// Add styles for login page
function addLoginPageStyles() {
    if (!document.querySelector('#loginPageStyles')) {
        const style = document.createElement('style');
        style.id = 'loginPageStyles';
        style.textContent = `
            /* Back to home button styles */
            .back-to-home-btn {
                position: absolute !important;
                top: 20px !important;
                left: 20px !important;
                z-index: 1000 !important;
                background: #6c757d !important;
                color: white !important;
                padding: 8px 16px !important;
                border: none !important;
                border-radius: 5px !important;
                font-size: 14px !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                text-decoration: none !important;
            }
            
            .back-to-home-btn:hover {
                background: #545b62 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2) !important;
            }
            
            /* Responsive design for mobile */
            @media (max-width: 768px) {
                .back-to-home-btn {
                    position: relative !important;
                    top: auto !important;
                    left: auto !important;
                    margin: 10px auto !important;
                    display: block !important;
                    width: fit-content !important;
                }
                
                .auth-container {
                    padding-top: 20px !important;
                }
            }
            
            /* Tab styles */
            .auth-tabs {
                display: flex;
                justify-content: center;
                margin-bottom: 2rem;
            }
            
            .tab {
                padding: 12px 24px;
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .tab:first-child {
                border-radius: 5px 0 0 5px;
            }
            
            .tab:last-child {
                border-radius: 0 5px 5px 0;
                border-left: none;
            }
            
            .tab.active {
                background: #007bff;
                color: white;
                border-color: #007bff;
            }
            
            .tab:hover:not(.active) {
                background: #e9ecef;
            }
        `;
        document.head.appendChild(style);
    }
}