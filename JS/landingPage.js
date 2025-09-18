// Firebase configuration and imports
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

        // Global variables
        let currentUser = null;
        let userInterface = 'guest';

        // DOM elements
        const guestNavigation = document.getElementById('guestNavigation');
        const authenticatedNavigation = document.getElementById('authenticatedNavigation');
        const enrollBtn = document.getElementById('enrollBtn');
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userProfile = document.getElementById('userProfile');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const startApplicationBtn = document.getElementById('startApplicationBtn');
        const welcomeMessage = document.getElementById('welcomeMessage');

        // Mobile authentication elements
        const mobileGuestNavigation = document.getElementById('mobileGuestNavigation');
        const mobileAuthenticatedNavigation = document.getElementById('mobileAuthenticatedNavigation');
        const mobileEnrollBtn = document.getElementById('mobileEnrollBtn');
        const mobileLoginBtn = document.getElementById('mobileLoginBtn');
        const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
        const mobileUserName = document.getElementById('mobileUserName');
        const mobileUserEmail = document.getElementById('mobileUserEmail');

        // Initialize authentication monitoring
        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            updateUIForAuthState(user);
            
            if (user && user.emailVerified) {
                const userRef = doc(db, 'users', user.uid);
                setDoc(userRef, { 
                    lastLoginAt: serverTimestamp() 
                }, { merge: true })
                    .catch(error => console.error('Failed to update last login time:', error));
            }
        });

        // Update UI based on authentication state
        function updateUIForAuthState(user) {
            if (user && user.emailVerified) {
                userInterface = 'authenticated';
                showAuthenticatedUI(user);
            } else {
                userInterface = 'guest';
                showGuestUI();
            }
        }

        // Show UI for authenticated users
        function showAuthenticatedUI(user) {
            // Desktop authentication UI
            if (guestNavigation) guestNavigation.style.display = 'none';
            if (authenticatedNavigation) authenticatedNavigation.style.display = 'flex';
            
            if (userName) userName.textContent = user.displayName || user.email.split('@')[0];
            if (userEmail) userEmail.textContent = user.email;
            if (userProfile) userProfile.style.display = 'block';

            // Mobile authentication UI
            if (mobileGuestNavigation) mobileGuestNavigation.style.display = 'none';
            if (mobileAuthenticatedNavigation) mobileAuthenticatedNavigation.style.display = 'block';
            
            if (mobileUserName) mobileUserName.textContent = user.displayName || user.email.split('@')[0];
            if (mobileUserEmail) mobileUserEmail.textContent = user.email;

            const restrictedSections = document.querySelectorAll('.auth-required');
            restrictedSections.forEach(section => {
                section.style.display = 'block';
                section.classList.remove('disabled');
            });
        }

        // Show UI for guest users
        function showGuestUI() {
            // Desktop guest UI
            if (guestNavigation) guestNavigation.style.display = 'flex';
            if (authenticatedNavigation) authenticatedNavigation.style.display = 'none';
            if (userProfile) userProfile.style.display = 'none';

            // Mobile guest UI
            if (mobileGuestNavigation) mobileGuestNavigation.style.display = 'block';
            if (mobileAuthenticatedNavigation) mobileAuthenticatedNavigation.style.display = 'none';

            const restrictedSections = document.querySelectorAll('.auth-required');
            restrictedSections.forEach(section => {
                section.style.display = 'none';
                section.classList.add('disabled');
            });
        }

        // Show enrollment prompts for guests
        function showEnrollmentPrompts() {
            // Function removed - enrollment prompts disabled
        }

        // Utility functions
        function showLoading(show = true, message = 'Processing...') {
            const loading = document.getElementById('loading');
            if (!loading) return;
            
            if (show) {
                loading.innerHTML = `
                    <div class="spinner"></div>
                    <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">${message}</p>
                `;
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
            if (successMessage) successMessage.style.display = 'none';
            
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
            if (errorMessage) errorMessage.style.display = 'none';
            
            setTimeout(() => {
                if (successMessage) successMessage.style.display = 'none';
            }, 5000);
        }

        // Event listeners for desktop authentication
        if (enrollBtn) {
            enrollBtn.addEventListener('click', () => {
                window.location.href = './login.html?mode=signup';
            });
        }

        // Event listener for footer Enroll Now
        const footerEnrollBtn = document.getElementById('footerEnrollBtn');
        if (footerEnrollBtn) {
            footerEnrollBtn.addEventListener('click', (e) => {
                e.preventDefault(); // stop jumping to "#"

                if (!currentUser) {
                    // Not logged in → go to signup
                    window.location.href = './login.html?mode=signup';
                } else if (currentUser && !currentUser.emailVerified) {
                    // Logged in but not verified
                    showError('Please verify your email before starting the application.');
                } else {
                    // Logged in & verified → go to application form
                    window.location.href = './applicationform.html';
                }
            });
        }


        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                window.location.href = './login.html?mode=login';
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    showLoading(true, 'Signing out...');
                    await signOut(auth);
                    showSuccess('Successfully logged out!');
                    
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

        // Event listeners for mobile authentication
        if (mobileEnrollBtn) {
            mobileEnrollBtn.addEventListener('click', () => {
                window.location.href = './login.html?mode=signup';
            });
        }

        if (mobileLoginBtn) {
            mobileLoginBtn.addEventListener('click', () => {
                window.location.href = './login.html?mode=login';
            });
        }

        if (mobileLogoutBtn) {
            mobileLogoutBtn.addEventListener('click', async () => {
                try {
                    showLoading(true, 'Signing out...');
                    await signOut(auth);
                    showSuccess('Successfully logged out!');
                    
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

        if (startApplicationBtn) {
            startApplicationBtn.addEventListener('click', () => {
                if (!currentUser) {
                    window.location.href = './login.html?mode=login';
                } else if (currentUser && !currentUser.emailVerified) {
                    showError('Please verify your email before starting the application.');
                } else {
                    window.location.href = './applicationform.html';
                }
            });
        }

        // Mobile menu functionality
        const hamburger = document.getElementById('hamburger');
        const mobileMenu = document.getElementById('mobileMenu');

        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });

        mobileMenu.addEventListener('click', (e) => {
            if (e.target === mobileMenu) {
                hamburger.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        });

        const mobileNavLinks = document.querySelectorAll('.mobile-nav-link, .mobile-enroll-btn');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });

        // Smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Check for login success message
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        
        if (success === 'login') {
            showSuccess('Welcome! You have successfully logged in.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Global access
        window.homePageAuth = {
            getCurrentUser: () => currentUser,
            getUserInterface: () => userInterface,
            isAuthenticated: () => currentUser && currentUser.emailVerified,
            redirectToLogin: () => window.location.href = './login.html?mode=login',
            redirectToSignup: () => window.location.href = './login.html?mode=signup'
        };