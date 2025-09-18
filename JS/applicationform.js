// Philippine Location Dropdown System
class PhilippineLocationSelector {
    constructor(options) {
        this.provinceId = options.provinceId;
        this.cityId = options.cityId;
        this.barangayId = options.barangayId || null;

        this.provinceSelect = document.getElementById(this.provinceId);
        this.citySelect = document.getElementById(this.cityId);
        this.barangaySelect = this.barangayId ? document.getElementById(this.barangayId) : null;

        this.loadProvinces();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.provinceSelect.addEventListener("change", async (e) => {
            await this.loadCities(e.target.value);
            this.clearBarangays();
        });

        this.citySelect.addEventListener("change", async (e) => {
            if (this.barangaySelect) {
                await this.loadBarangays(e.target.value);
            }
        });
    }

    async loadProvinces(selectedCode = "") {
        try {
            const response = await fetch("https://psgc.gitlab.io/api/provinces/");
            const provinces = await response.json();

            this.provinceSelect.innerHTML = '<option value="">Select Province</option>';
            provinces.sort((a, b) => a.name.localeCompare(b.name));

            provinces.forEach((province) => {
                const option = document.createElement("option");
                option.value = province.code;
                option.textContent = province.name.toUpperCase();
                if (province.code === selectedCode) option.selected = true;
                this.provinceSelect.appendChild(option);
            });

            this.provinceSelect.disabled = false;
            if (selectedCode) await this.loadCities(selectedCode);
        } catch (error) {
            console.error("Error loading provinces:", error);
            this.showLocationError(this.provinceSelect, "Failed to load provinces");
        }
    }

    async loadCities(provinceCode, selectedCode = "") {
        if (!provinceCode) {
            this.clearCities();
            return;
        }
        try {
            const response = await fetch(
                `https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`
            );
            const cities = await response.json();

            this.citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
            cities.sort((a, b) => a.name.localeCompare(b.name));

            cities.forEach((city) => {
                const option = document.createElement("option");
                option.value = city.code;
                option.textContent = city.name.toUpperCase();
                if (city.code === selectedCode) option.selected = true;
                this.citySelect.appendChild(option);
            });

            this.citySelect.disabled = false;
            if (selectedCode && this.barangaySelect) {
                await this.loadBarangays(selectedCode);
            }
        } catch (error) {
            console.error("Error loading cities:", error);
            this.showLocationError(this.citySelect, "Failed to load cities");
        }
    }

    async loadBarangays(cityCode, selectedCode = "") {
        if (!cityCode || !this.barangaySelect) {
            this.clearBarangays();
            return;
        }
        try {
            const response = await fetch(
                `https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`
            );
            const barangays = await response.json();

            this.barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
            barangays.sort((a, b) => a.name.localeCompare(b.name));

            barangays.forEach((barangay) => {
                const option = document.createElement("option");
                option.value = barangay.code;
                option.textContent = barangay.name.toUpperCase();
                if (barangay.code === selectedCode) option.selected = true;
                this.barangaySelect.appendChild(option);
            });

            this.barangaySelect.disabled = false;
        } catch (error) {
            console.error("Error loading barangays:", error);
            this.showLocationError(this.barangaySelect, "Failed to load barangays");
        }
    }

    showLocationError(element, message) {
        const errorOption = document.createElement("option");
        errorOption.value = "";
        errorOption.textContent = message;
        errorOption.disabled = true;
        errorOption.selected = true;
        element.innerHTML = "";
        element.appendChild(errorOption);
    }

    clearCities() {
        this.citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
        this.citySelect.disabled = true;
        this.clearBarangays();
    }

    clearBarangays() {
        if (this.barangaySelect) {
            this.barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
            this.barangaySelect.disabled = true;
        }
    }
}

// Enhanced Form Validator
class FormValidator {
    constructor(formId) {
        this.form = document.getElementById(formId);
        this.errors = new Map();
        this.setupValidation();
    }

    setupValidation() {
        // Real-time validation for all inputs
        const inputs = this.form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Validate on blur
            input.addEventListener('blur', () => this.validateField(input));
            
            // Clear errors on input
            input.addEventListener('input', () => this.clearFieldError(input));
            
            // Special handling for radio and checkbox groups
            if (input.type === 'radio' || input.type === 'checkbox') {
                input.addEventListener('change', () => {
                    this.clearFieldError(input);
                    this.validateField(input);
                });
            }
        });
    }

    validateField(field) {
        // Skip disabled fields
        if (field.disabled) return true;

        const fieldName = field.name || field.id;
        let isValid = true;
        let errorMessage = '';

        // Required field validation
        if (field.hasAttribute('required') || this.isConditionallyRequired(field)) {
            if (field.type === 'radio' || field.type === 'checkbox') {
                const group = this.form.querySelectorAll(`[name="${fieldName}"]:checked`);
                if (group.length === 0) {
                    isValid = false;
                    errorMessage = this.getFieldLabel(field) + ' is required';
                }
            } else if (!field.value || field.value.trim() === '') {
                isValid = false;
                errorMessage = this.getFieldLabel(field) + ' is required';
            }
        }

        // Additional validations
        if (isValid && field.value) {
            // Email validation
            if (field.type === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(field.value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
            }

            // Phone number validation
            if (field.type === 'tel') {
                const phoneRegex = /^(09|\+639)\d{9}$/;
                if (field.value && !phoneRegex.test(field.value.replace(/[\s-]/g, ''))) {
                    isValid = false;
                    errorMessage = 'Please enter a valid Philippine mobile number';
                }
            }

            // LRN validation
            if (field.id === 'lrn') {
                if (field.value.length !== 12 || !/^\d+$/.test(field.value)) {
                    isValid = false;
                    errorMessage = 'LRN must be exactly 12 digits';
                }
            }

            // Age validation
            if (field.id === 'age') {
                const age = parseInt(field.value);
                if (age < 3 || age > 25) {
                    isValid = false;
                    errorMessage = 'Age must be between 3 and 25';
                }
            }

            // School Year format validation
            if (field.id === 'schoolYear') {
                const syRegex = /^\d{4}-\d{4}$/;
                if (!syRegex.test(field.value)) {
                    isValid = false;
                    errorMessage = 'Format should be YYYY-YYYY (e.g., 2024-2025)';
                }
            }
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
            this.errors.set(fieldName, errorMessage);
        } else {
            this.clearFieldError(field);
            this.errors.delete(fieldName);
        }

        return isValid;
    }

    isConditionallyRequired(field) {
        // Check if field is in returning learner section and required
        const returningSection = document.getElementById('returningLearnerSection');
        if (returningSection && returningSection.contains(field)) {
            const returningYes = document.getElementById('returningYes');
            return returningYes && returningYes.checked;
        }
        return false;
    }

    showFieldError(field, message) {
        // Visual indication
        if (field.type === 'radio' || field.type === 'checkbox') {
            const container = field.closest('.radio-group, .checkbox-group, .modality-grid');
            if (container) {
                container.style.border = '2px solid var(--danger)';
                container.style.borderRadius = '8px';
                container.style.padding = '8px';
            }
        } else {
            field.style.borderColor = 'var(--danger)';
            field.classList.add('error-highlight');
        }

        // Show error message for specific fields
        if (field.name === 'learningModality') {
            this.showModalityError();
        }
    }

    clearFieldError(field) {
        // Clear visual indication
        if (field.type === 'radio' || field.type === 'checkbox') {
            const container = field.closest('.radio-group, .checkbox-group, .modality-grid');
            if (container) {
                container.style.border = '';
                container.style.padding = '';
            }
        } else {
            field.style.borderColor = '';
            field.classList.remove('error-highlight');
        }

        // Clear error messages
        if (field.name === 'learningModality') {
            this.clearModalityError();
        }
    }

    showModalityError() {
        const modalityGrid = document.querySelector('.modality-grid');
        const modalityCard = modalityGrid?.closest('.form-card');
        
        if (!modalityCard) return;

        // Check if error already exists
        let errorDiv = modalityCard.querySelector('.modality-error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'modality-error-message fade-in';
            errorDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; color: var(--danger); 
                     background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; 
                     padding: 10px 14px; margin-top: 12px; font-size: 0.9rem; font-weight: 500;">
                    <span style="font-size: 1.1rem;">⚠️</span>
                    <span>Please select at least one learning modality preference</span>
                </div>
            `;
            modalityGrid.insertAdjacentElement('afterend', errorDiv);
        }
    }

    clearModalityError() {
        const errorDiv = document.querySelector('.modality-error-message');
        if (errorDiv) {
            errorDiv.classList.add('fade-out');
            setTimeout(() => errorDiv.remove(), 300);
        }
    }

    getFieldLabel(field) {
        const label = this.form.querySelector(`label[for="${field.id}"]`);
        if (label) {
            return label.textContent.replace('*', '').trim();
        }
        return field.name || field.id;
    }

    validateForm() {
        this.errors.clear();
        let isValid = true;
        let firstInvalidField = null;

        // Clear all previous errors
        this.form.querySelectorAll('.error-highlight').forEach(el => {
            el.classList.remove('error-highlight');
            el.style.borderColor = '';
        });

        // Validate all required fields
        const requiredFields = this.form.querySelectorAll('[required]:not(:disabled)');
        requiredFields.forEach(field => {
            if (!this.validateField(field) && !firstInvalidField) {
                firstInvalidField = field;
                isValid = false;
            }
        });

        // Special validations
        isValid = this.validateSpecialCases(firstInvalidField) && isValid;

        if (!isValid && firstInvalidField) {
            this.scrollToError(firstInvalidField);
            this.showSummaryError();
        }

        return isValid;
    }

    validateSpecialCases(firstInvalidField) {
        let isValid = true;

        // Check With LRN selection
        const withLrnYes = document.getElementById('withLrnYes');
        const withLrnNo = document.getElementById('withLrnNo');
        if (!withLrnYes.checked && !withLrnNo.checked) {
            this.showFieldError(withLrnYes, 'Please select whether the student has an LRN');
            if (!firstInvalidField) firstInvalidField = withLrnYes;
            isValid = false;
        }

        // Check Returning Learner selection
        const returningYes = document.getElementById('returningYes');
        const returningNo = document.getElementById('returningNo');
        if (!returningYes.checked && !returningNo.checked) {
            this.showFieldError(returningYes, 'Please select whether the student is a Returning Learner');
            if (!firstInvalidField) firstInvalidField = returningYes;
            isValid = false;
        }

        // Check learning modality
        const modalityChecked = document.querySelectorAll('input[name="learningModality"]:checked');
        if (modalityChecked.length === 0) {
            const firstModality = document.getElementById('faceToFace');
            this.showFieldError(firstModality, 'Please select at least one learning modality');
            if (!firstInvalidField) firstInvalidField = firstModality;
            isValid = false;
        }

        return isValid;
    }

    scrollToError(field) {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight temporarily
        setTimeout(() => {
            if (field.type !== 'radio' && field.type !== 'checkbox') {
                field.focus();
                field.style.backgroundColor = '#fff3cd';
                setTimeout(() => {
                    field.style.backgroundColor = '';
                }, 3000);
            }
        }, 500);
    }

    showSummaryError() {
        // Create a summary of all errors
        if (this.errors.size > 0) {
            const errorList = Array.from(this.errors.values()).slice(0, 3);
            const message = `Please correct the following:\n• ${errorList.join('\n• ')}`;
            
            // Use a custom notification instead of alert
            this.showNotification(message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.form-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `form-notification form-notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            max-width: 400px;
            padding: 16px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            border-left: 4px solid ${type === 'error' ? 'var(--danger)' : 'var(--primary)'};
        `;

        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1; padding-right: 12px;">
                    <strong style="color: ${type === 'error' ? 'var(--danger)' : 'var(--primary)'};">
                        ${type === 'error' ? 'Validation Error' : 'Information'}
                    </strong>
                    <div style="margin-top: 4px; font-size: 0.9rem; white-space: pre-line;">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; cursor: pointer; font-size: 1.2rem; 
                               color: var(--gray); padding: 0;">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Auto-save form data to sessionStorage
class FormAutoSave {
    constructor(formId, storageKey) {
        this.form = document.getElementById(formId);
        this.storageKey = storageKey;
        this.saveTimeout = null;
        this.setupAutoSave();
    }

    setupAutoSave() {
        const formElements = this.form.querySelectorAll('input, select, textarea');
        
        formElements.forEach(element => {
            if (element.type === 'checkbox' || element.type === 'radio') {
                element.addEventListener('change', () => this.debouncedSave());
            } else if (element.tagName === 'SELECT') {
                element.addEventListener('change', () => this.debouncedSave());
            } else {
                element.addEventListener('input', () => this.debouncedSave(500));
            }
        });

        // Load saved data on initialization
        this.loadFormData();
    }

    debouncedSave(delay = 100) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveFormData(), delay);
    }

    saveFormData() {
        const formData = new FormData(this.form);
        const data = {};
        
        // Collect all form data
        for (let [key, value] of formData.entries()) {
            if (data[key]) {
                // Handle multiple values
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        
        // Save checkbox states
        data.sameAddressChecked = document.getElementById('sameAddress')?.checked || false;
        
        // Save timestamp
        data.lastSaved = new Date().toISOString();
        
        sessionStorage.setItem(this.storageKey, JSON.stringify(data));
        
        // Show save indicator
        this.showSaveIndicator();
    }

    loadFormData() {
        const savedData = sessionStorage.getItem(this.storageKey);
        if (!savedData) return;

        const data = JSON.parse(savedData);
        
        // Restore form fields
        Object.keys(data).forEach(key => {
            if (key === 'sameAddressChecked' || key === 'lastSaved') return;
            
            const elements = document.querySelectorAll(`[name="${key}"]`);
            elements.forEach(element => {
                if (element.type === 'radio') {
                    element.checked = element.value === data[key];
                } else if (element.type === 'checkbox') {
                    if (Array.isArray(data[key])) {
                        element.checked = data[key].includes(element.value);
                    } else {
                        element.checked = element.value === data[key];
                    }
                } else {
                    element.value = data[key] || '';
                }
            });
        });

        // Show restore message
        if (data.lastSaved) {
            const timeDiff = new Date() - new Date(data.lastSaved);
            const minutes = Math.floor(timeDiff / 60000);
            if (minutes < 60) {
                this.showNotification(`Form data restored from ${minutes} minute(s) ago`, 'success');
            }
        }
    }

    showSaveIndicator() {
        const existing = document.querySelector('.save-indicator');
        if (existing) existing.remove();

        const indicator = document.createElement('div');
        indicator.className = 'save-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--secondary);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 0.85rem;
            animation: fadeIn 0.3s ease;
            z-index: 1000;
        `;
        indicator.textContent = '✓ Saved';
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            indicator.classList.add('fade-out');
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? 'var(--secondary)' : 'var(--primary)'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 0.9rem;
            animation: slideDown 0.3s ease;
            z-index: 9999;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    clearSavedData() {
        sessionStorage.removeItem(this.storageKey);
    }
}

// Main Application Controller
class ApplicationFormController {
    constructor() {
        this.validator = null;
        this.autoSave = null;
        this.locationSelectors = {};
        this.init();
    }

    init() {
        this.setupLocationSelectors();
        this.setupFormControls();
        this.setupValidator();
        this.setupAutoSave();
        this.restoreFormState();
    }

    setupLocationSelectors() {
        this.locationSelectors.birth = new PhilippineLocationSelector({
            provinceId: "birthProvince",
            cityId: "birthCity",
        });

        this.locationSelectors.current = new PhilippineLocationSelector({
            provinceId: "currentProvince",
            cityId: "currentMunicipality",
            barangayId: "currentBarangay",
        });

        this.locationSelectors.permanent = new PhilippineLocationSelector({
            provinceId: "permProvince",
            cityId: "permMunicipality",
            barangayId: "permBarangay",
        });
    }

    setupFormControls() {
        // LRN Control
        const withLrnYes = document.getElementById('withLrnYes');
        const withLrnNo = document.getElementById('withLrnNo');
        
        if (withLrnYes && withLrnNo) {
            withLrnYes.addEventListener('change', () => this.toggleLRNField());
            withLrnNo.addEventListener('change', () => this.toggleLRNField());
        }

        // Returning Learner Control
        const returningYes = document.getElementById('returningYes');
        const returningNo = document.getElementById('returningNo');
        
        if (returningYes && returningNo) {
            returningYes.addEventListener('change', () => this.toggleReturningLearnerSection());
            returningNo.addEventListener('change', () => this.toggleReturningLearnerSection());
        }

        // Same Address Toggle
        const sameAddress = document.getElementById('sameAddress');
        if (sameAddress) {
            sameAddress.addEventListener('change', () => this.togglePermanentAddress());
        }

        // Auto-calculate Age
        const birthdateInput = document.getElementById('birthDate');
        if (birthdateInput) {
            birthdateInput.addEventListener('change', () => this.calculateAge());
        }

        // Auto-uppercase text inputs
        const textInputs = document.querySelectorAll('input[type="text"]:not([type="email"]):not(#lrn)');
        textInputs.forEach(input => {
            input.addEventListener('input', function() {
                this.value = this.value.toUpperCase();
            });
        });

        // Initialize conditional sections
        this.toggleReturningLearnerSection();
    }

    toggleLRNField() {
        const withLrnNo = document.getElementById('withLrnNo');
        const lrnInput = document.getElementById('lrn');
        
        if (!lrnInput) return;

        if (withLrnNo.checked) {
            lrnInput.value = '';
            lrnInput.disabled = true;
            lrnInput.removeAttribute('required');
            lrnInput.placeholder = 'Not Applicable';
            lrnInput.style.backgroundColor = '#f3f4f6';
            lrnInput.style.borderColor = '';
        } else {
            lrnInput.disabled = false;
            lrnInput.setAttribute('required', 'required');
            lrnInput.placeholder = '000000000000';
            lrnInput.style.backgroundColor = '';
            lrnInput.style.borderColor = '';
        }
    }

    toggleReturningLearnerSection() {
        const returningYes = document.getElementById('returningYes');
        const section = document.getElementById('returningLearnerSection');
        
        if (!section) return;

        const fields = ['lastGradeLevel', 'lastSchoolYear', 'lastSchoolAttended', 'schoolId'];
        const conditionalRequired = document.querySelectorAll('.conditional-required');
        
        if (returningYes.checked) {
            section.classList.remove('conditional-disabled');
            
            fields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.disabled = false;
                    field.setAttribute('required', 'required');
                    field.style.backgroundColor = '';
                }
            });
            
            conditionalRequired.forEach(asterisk => asterisk.classList.add('show'));
        } else {
            section.classList.add('conditional-disabled');
            
            fields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = '';
                    field.disabled = true;
                    field.removeAttribute('required');
                    field.style.backgroundColor = '#f3f4f6';
                    field.style.borderColor = '';
                }
            });
            
            conditionalRequired.forEach(asterisk => asterisk.classList.remove('show'));
        }
    }

    async togglePermanentAddress() {
        const same = document.getElementById('sameAddress').checked;
        const section = document.getElementById('permanentAddressSection');
        const fields = ['permProvince', 'permMunicipality', 'permBarangay', 'permHouseNo', 'permZipCode'];

        if (same) {
            section.classList.remove('show');
            
            // Copy values
            const currentProvince = document.getElementById('currentProvince').value;
            const currentMunicipality = document.getElementById('currentMunicipality').value;
            const currentBarangay = document.getElementById('currentBarangay').value;

            const permSelector = this.locationSelectors.permanent;
            await permSelector.loadProvinces(currentProvince);
            await permSelector.loadCities(currentProvince, currentMunicipality);
            await permSelector.loadBarangays(currentMunicipality, currentBarangay);

            document.getElementById('permHouseNo').value = document.getElementById('currentHouseNo').value;
            document.getElementById('permZipCode').value = document.getElementById('currentZipCode').value;

            // Disable fields
            fields.forEach(id => {
                const field = document.getElementById(id);
                if (field) {
                    field.setAttribute('disabled', true);
                    if (field.hasAttribute('required')) {
                        field.setAttribute('data-required', 'true');
                        field.removeAttribute('required');
                    }
                }
            });

            // Setup auto-update listeners
            this.setupAddressSync();
        } else {
            section.classList.add('show');
            
            // Re-enable fields
            fields.forEach(id => {
                const field = document.getElementById(id);
                if (field) {
                    field.removeAttribute('disabled');
                    if (field.getAttribute('data-required') === 'true') {
                        field.setAttribute('required', 'true');
                        field.removeAttribute('data-required');
                    }
                    if (id === 'permMunicipality' || id === 'permBarangay') {
                        field.disabled = true;
                    }
                }
            });

            // Remove auto-update listeners
            this.removeAddressSync();
        }

        // Trigger auto-save
        if (this.autoSave) {
            this.autoSave.saveFormData();
        }
    }

    setupAddressSync() {
        const currentFields = ['currentProvince', 'currentMunicipality', 'currentBarangay', 'currentHouseNo', 'currentZipCode'];
        currentFields.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.removeEventListener('change', this.updatePermanentFromCurrent);
                element.addEventListener('change', this.updatePermanentFromCurrent.bind(this));
            }
        });
    }

    removeAddressSync() {
        const currentFields = ['currentProvince', 'currentMunicipality', 'currentBarangay', 'currentHouseNo', 'currentZipCode'];
        currentFields.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.removeEventListener('change', this.updatePermanentFromCurrent);
            }
        });
    }

    async updatePermanentFromCurrent() {
        if (document.getElementById('sameAddress').checked) {
            await this.togglePermanentAddress();
        }
    }

    calculateAge() {
        const birthdateInput = document.getElementById('birthDate');
        const ageInput = document.getElementById('age');
        
        if (!birthdateInput || !ageInput) return;

        const birthDate = new Date(birthdateInput.value);
        if (!isNaN(birthDate)) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();

            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            ageInput.value = age >= 0 ? age : '';
        } else {
            ageInput.value = '';
        }
    }

    setupValidator() {
        this.validator = new FormValidator('applicationForm');
    }

    setupAutoSave() {
        this.autoSave = new FormAutoSave('applicationForm', 'applicationFormData');
    }

    async restoreFormState() {
        const savedData = sessionStorage.getItem('applicationFormData');
        if (!savedData) return;

        const data = JSON.parse(savedData);
        
        // Restore conditional states after data is loaded
        setTimeout(async () => {
            // Restore LRN state
            if (data.withLrn === 'NO') {
                this.toggleLRNField();
            }
            
            // Restore returning learner state
            if (data.returning === 'YES') {
                this.toggleReturningLearnerSection();
            }
            
            // Restore location dropdowns
            await this.restoreLocationData(data);
            
            // Restore same address state
            if (data.sameAddressChecked) {
                document.getElementById('sameAddress').checked = true;
                await this.togglePermanentAddress();
            }
        }, 100);
    }

    async restoreLocationData(data) {
        const loadPromises = [];
        
        // Birth location
        if (data.birthProvince) {
            loadPromises.push(
                this.locationSelectors.birth.loadProvinces(data.birthProvince).then(() => {
                    if (data.birthCity) {
                        return this.locationSelectors.birth.loadCities(data.birthProvince, data.birthCity);
                    }
                })
            );
        }
        
        // Current location
        if (data.currentProvince) {
            loadPromises.push(
                this.locationSelectors.current.loadProvinces(data.currentProvince).then(() => {
                    if (data.currentMunicipality) {
                        return this.locationSelectors.current.loadCities(data.currentProvince, data.currentMunicipality).then(() => {
                            if (data.currentBarangay) {
                                return this.locationSelectors.current.loadBarangays(data.currentMunicipality, data.currentBarangay);
                            }
                        });
                    }
                })
            );
        }
        
        // Permanent location (if not same as current)
        if (data.permProvince && !data.sameAddressChecked) {
            loadPromises.push(
                this.locationSelectors.permanent.loadProvinces(data.permProvince).then(() => {
                    if (data.permMunicipality) {
                        return this.locationSelectors.permanent.loadCities(data.permProvince, data.permMunicipality).then(() => {
                            if (data.permBarangay) {
                                return this.locationSelectors.permanent.loadBarangays(data.permMunicipality, data.permBarangay);
                            }
                        });
                    }
                })
            );
        }
        
        await Promise.all(loadPromises);
    }

    handleSubmit(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // Validate form
        if (!this.validator.validateForm()) {
            return false;
        }
        
        // Save form data one final time
        this.autoSave.saveFormData();
        
        // Set completion flag
        sessionStorage.setItem('applicationFormCompleted', 'true');
        
        // Show success message
        this.showSuccessMessage();
        
        // Navigate to next page after a short delay
        setTimeout(() => {
            window.location.href = 'uploadDocument.html';
        }, 1500);
        
        return false;
    }

    showSuccessMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--secondary);
            color: white;
            padding: 20px 40px;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: scaleIn 0.3s ease;
        `;
        message.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 1.5rem;">✓</span>
                <span>Form validated successfully! Proceeding to document upload...</span>
            </div>
        `;
        
        document.body.appendChild(message);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        @keyframes slideIn {
            from { 
                opacity: 0;
                transform: translateX(20px);
            }
            to { 
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes slideDown {
            from { 
                opacity: 0;
                transform: translate(-50%, -20px);
            }
            to { 
                opacity: 1;
                transform: translate(-50%, 0);
            }
        }
        
        @keyframes scaleIn {
            from { 
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            to { 
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        .fade-in {
            animation: fadeIn 0.3s ease;
        }
        
        .fade-out {
            animation: fadeOut 0.3s ease;
            opacity: 0;
        }
        
        .error-highlight {
            animation: shake 0.3s ease;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        /* Smooth transitions for form elements */
        input, select, textarea {
            transition: all 0.2s ease;
        }
        
        /* Hover effects for better UX */
        input:hover:not(:disabled), 
        select:hover:not(:disabled), 
        textarea:hover:not(:disabled) {
            border-color: var(--primary-light);
        }
        
        /* Focus effects */
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
        
        /* Disabled field styling */
        input:disabled, select:disabled, textarea:disabled {
            background: var(--light-gray);
            cursor: not-allowed;
            opacity: 0.6;
        }
        
        /* Success state for validated fields */
        .field-valid {
            border-color: var(--secondary) !important;
        }
        
        /* Loading spinner for async operations */
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid var(--border);
            border-radius: 50%;
            border-top-color: var(--primary);
            animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Tooltip for helper text */
        .tooltip {
            position: relative;
            display: inline-block;
        }
        
        .tooltip .tooltiptext {
            visibility: hidden;
            width: 200px;
            background-color: var(--dark);
            color: white;
            text-align: center;
            border-radius: 6px;
            padding: 8px;
            position: absolute;
            z-index: 1;
            bottom: 125%;
            left: 50%;
            margin-left: -100px;
            opacity: 0;
            transition: opacity 0.3s;
            font-size: 0.8rem;
        }
        
        .tooltip:hover .tooltiptext {
            visibility: visible;
            opacity: 0.95;
        }
        
        /* Progress bar for form completion */
        .form-progress {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--border);
            z-index: 9998;
        }
        
        .form-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--primary), var(--primary-light));
            width: 0%;
            transition: width 0.3s ease;
        }
    `;
    document.head.appendChild(style);
    
    // Initialize the application
    const app = new ApplicationFormController();
    
    // Make handleSubmit globally available for the form onsubmit attribute
    window.handleSubmit = (event) => app.handleSubmit(event);
    
    // Add permanent address section visibility on load
    const permSection = document.getElementById('permanentAddressSection');
    if (permSection) {
        permSection.classList.add('show');
    }
    
    // Add form progress tracking
    const form = document.getElementById('applicationForm');
    if (form) {
        const progressBar = document.createElement('div');
        progressBar.className = 'form-progress';
        progressBar.innerHTML = '<div class="form-progress-bar"></div>';
        document.body.insertBefore(progressBar, document.body.firstChild);
        
        // Update progress on input change
        const updateProgress = () => {
            const inputs = form.querySelectorAll('input[required]:not(:disabled), select[required]:not(:disabled)');
            const filled = Array.from(inputs).filter(input => {
                if (input.type === 'radio' || input.type === 'checkbox') {
                    return form.querySelector(`[name="${input.name}"]:checked`);
                }
                return input.value && input.value.trim() !== '';
            });
            
            const progress = (filled.length / inputs.length) * 100;
            progressBar.querySelector('.form-progress-bar').style.width = `${progress}%`;
        };
        
        form.addEventListener('input', updateProgress);
        form.addEventListener('change', updateProgress);
        
        // Initial progress check
        updateProgress();
    }
    
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
    
    // Performance optimization: Debounce resize events
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // Handle any resize-dependent logic here
        }, 250);
    });
    
    // Prevent form submission on Enter key (except in textareas)
    form?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });
    
    console.log('Application Form initialized successfully');
});