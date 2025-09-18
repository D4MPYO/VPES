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
        }
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

// Auto-save form data to sessionStorage
function autoSaveFormData() {
    const form = document.getElementById('applicationForm');
    const formData = new FormData(form);
    const data = {};
    
    // Collect all form data
    for (let [key, value] of formData.entries()) {
        if (data[key]) {
            // Handle multiple values (checkboxes with same name)
            if (Array.isArray(data[key])) {
                data[key].push(value);
            } else {
                data[key] = [data[key], value];
            }
        } else {
            data[key] = value;
        }
    }
    
    // Also save checkbox states for unchecked boxes
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked && checkbox.name === 'learningModality') {
            // Track which modalities were considered but not selected
            if (!data.learningModalityState) {
                data.learningModalityState = [];
            }
            data.learningModalityState.push(checkbox.value + '_unchecked');
        }
    });
    
    // Save the "same address" checkbox state explicitly
    data.sameAddressChecked = document.getElementById('sameAddress').checked;
    
    // Save to sessionStorage (clears when browser/tab closes)
    sessionStorage.setItem('applicationFormData', JSON.stringify(data));
}

// Initialize page when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    // Initialize location dropdowns
    const birthSelector = new PhilippineLocationSelector({
        provinceId: "birthProvince",
        cityId: "birthCity",
    });

    const currentSelector = new PhilippineLocationSelector({
        provinceId: "currentProvince",
        cityId: "currentMunicipality",
        barangayId: "currentBarangay",
    });

    const permSelector = new PhilippineLocationSelector({
        provinceId: "permProvince",
        cityId: "permMunicipality",
        barangayId: "permBarangay",
    });

    // LRN Control based on With LRN selection
    function toggleLRNField() {
        const withLrnNo = document.getElementById('withLrnNo');
        const lrnInput = document.getElementById('lrn');
        
        if (withLrnNo.checked) {
            lrnInput.value = '';
            lrnInput.disabled = true;
            lrnInput.removeAttribute('required');
            lrnInput.placeholder = 'Not Applicable';
            lrnInput.style.backgroundColor = '#f3f4f6';
            lrnInput.style.borderColor = ''; // Clear any validation styling
        } else {
            lrnInput.disabled = false;
            lrnInput.setAttribute('required', 'required');
            lrnInput.placeholder = '000000000000';
            lrnInput.style.backgroundColor = '';
            lrnInput.style.borderColor = '';
        }
    }

    // Add event listeners for LRN radio buttons
    document.getElementById('withLrnYes').addEventListener('change', toggleLRNField);
    document.getElementById('withLrnNo').addEventListener('change', toggleLRNField);

    // Control Returning Learner section with ALL FIELDS REQUIRED
    function toggleReturningLearnerSection() {
        const returningYes = document.getElementById('returningYes');
        const section = document.getElementById('returningLearnerSection');
        const lastGradeLevel = document.getElementById('lastGradeLevel');
        const lastSchoolYear = document.getElementById('lastSchoolYear');
        const lastSchoolAttended = document.getElementById('lastSchoolAttended');
        const schoolId = document.getElementById('schoolId');
        const conditionalRequired = document.querySelectorAll('.conditional-required');
        
        if (returningYes.checked) {
            // Enable section and make ALL fields REQUIRED
            section.classList.remove('conditional-disabled');
            
            // Enable and require ALL fields
            lastGradeLevel.disabled = false;
            lastGradeLevel.setAttribute('required', 'required');
            lastGradeLevel.style.backgroundColor = '';
            
            lastSchoolYear.disabled = false;
            lastSchoolYear.setAttribute('required', 'required');
            lastSchoolYear.style.backgroundColor = '';
            
            lastSchoolAttended.disabled = false;
            lastSchoolAttended.setAttribute('required', 'required');
            lastSchoolAttended.style.backgroundColor = '';
            
            schoolId.disabled = false;
            schoolId.setAttribute('required', 'required');
            schoolId.style.backgroundColor = '';
            
            // Show required asterisks
            conditionalRequired.forEach(asterisk => {
                asterisk.classList.add('show');
            });
        } else {
            // Disable section and remove required - CANNOT BE EDITED
            section.classList.add('conditional-disabled');
            
            // Clear and disable ALL fields
            lastGradeLevel.value = '';
            lastGradeLevel.disabled = true;
            lastGradeLevel.removeAttribute('required');
            lastGradeLevel.style.backgroundColor = '#f3f4f6';
            lastGradeLevel.style.borderColor = ''; // Clear validation styling
            
            lastSchoolYear.value = '';
            lastSchoolYear.disabled = true;
            lastSchoolYear.removeAttribute('required');
            lastSchoolYear.style.backgroundColor = '#f3f4f6';
            lastSchoolYear.style.borderColor = ''; // Clear validation styling
            
            lastSchoolAttended.value = '';
            lastSchoolAttended.disabled = true;
            lastSchoolAttended.removeAttribute('required');
            lastSchoolAttended.style.backgroundColor = '#f3f4f6';
            lastSchoolAttended.style.borderColor = ''; // Clear validation styling
            
            schoolId.value = '';
            schoolId.disabled = true;
            schoolId.removeAttribute('required');
            schoolId.style.backgroundColor = '#f3f4f6';
            schoolId.style.borderColor = ''; // Clear validation styling
            
            // Hide required asterisks
            conditionalRequired.forEach(asterisk => {
                asterisk.classList.remove('show');
            });
        }
    }

    // Add event listeners for Returning Learner radio buttons
    document.getElementById('returningYes').addEventListener('change', toggleReturningLearnerSection);
    document.getElementById('returningNo').addEventListener('change', toggleReturningLearnerSection);

    // Initialize returning learner section as disabled by default
    toggleReturningLearnerSection();

    // Same Address Toggle
    window.togglePermanentAddress = async function() {
        const same = document.getElementById("sameAddress").checked;
        const section = document.getElementById('permanentAddressSection');

        const fields = [
            "permProvince",
            "permMunicipality",
            "permBarangay",
            "permHouseNo",
            "permZipCode",
        ];

        if (same) {
            section.classList.remove('show');
            
            // Copy values from current to permanent
            const currentProvince = document.getElementById("currentProvince").value;
            const currentMunicipality = document.getElementById("currentMunicipality").value;
            const currentBarangay = document.getElementById("currentBarangay").value;

            await permSelector.loadProvinces(currentProvince);
            await permSelector.loadCities(currentProvince, currentMunicipality);
            await permSelector.loadBarangays(currentMunicipality, currentBarangay);

            document.getElementById("permHouseNo").value = 
                document.getElementById("currentHouseNo").value;
            document.getElementById("permZipCode").value = 
                document.getElementById("currentZipCode").value;

            // Disable all permanent fields
            fields.forEach((id) => {
                const field = document.getElementById(id);
                field.setAttribute("disabled", true);
                if (field.hasAttribute('required')) {
                    field.setAttribute('data-required', 'true');
                    field.removeAttribute('required');
                }
            });

            // Auto-update if current address changes
            ["currentProvince", "currentMunicipality", "currentBarangay", "currentHouseNo", "currentZipCode"].forEach((id) => {
                const element = document.getElementById(id);
                element.removeEventListener("change", updatePermanentFromCurrent);
                element.addEventListener("change", updatePermanentFromCurrent);
            });
        } else {
            section.classList.add('show');
            
            // Re-enable permanent fields
            fields.forEach((id) => {
                const field = document.getElementById(id);
                field.removeAttribute("disabled");
                if (field.getAttribute('data-required') === 'true') {
                    field.setAttribute('required', 'true');
                    field.removeAttribute('data-required');
                }
                // Keep municipality and barangay disabled initially
                if (id === 'permMunicipality' || id === 'permBarangay') {
                    field.disabled = true;
                }
            });

            // Remove auto-update listeners
            ["currentProvince", "currentMunicipality", "currentBarangay", "currentHouseNo", "currentZipCode"].forEach((id) => {
                document.getElementById(id).removeEventListener("change", updatePermanentFromCurrent);
            });
        }
        
        // Auto-save after toggle
        autoSaveFormData();
    }

    // Function to update permanent address from current
    async function updatePermanentFromCurrent() {
        if (document.getElementById("sameAddress").checked) {
            await togglePermanentAddress();
        }
    }

    // Initialize permanent address section as visible
    const section = document.getElementById('permanentAddressSection');
    section.classList.add('show');

    // Auto-calculate Age from Birthdate
    const birthdateInput = document.getElementById("birthDate");
    const ageInput = document.getElementById("age");

    birthdateInput.addEventListener("change", () => {
        const birthDate = new Date(birthdateInput.value);
        if (!isNaN(birthDate)) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();

            // Adjust if birthday hasn't happened yet this year
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            ageInput.value = age >= 0 ? age : "";
        } else {
            ageInput.value = "";
        }
    });

    // Auto-uppercase text inputs (exclude email and excluded fields)
    const textInputs = document.querySelectorAll('input[type="text"]:not([type="email"]):not(#lrn)');
    textInputs.forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    });

    // Load saved data from sessionStorage
    const savedData = sessionStorage.getItem('applicationFormData');
    if (savedData) {
        const data = JSON.parse(savedData);
        
        // Restore all form fields
        Object.keys(data).forEach(key => {
            if (key === 'sameAddressChecked' || key === 'learningModalityState') {
                // Skip these special keys
                return;
            }
            
            const elements = document.querySelectorAll(`[name="${key}"]`);
            
            elements.forEach(element => {
                if (element.type === 'radio') {
                    // For radio buttons, check if value matches
                    element.checked = element.value === data[key];
                } else if (element.type === 'checkbox') {
                    // For checkboxes, check if value is in array or matches
                    if (Array.isArray(data[key])) {
                        element.checked = data[key].includes(element.value);
                    } else {
                        element.checked = element.value === data[key];
                    }
                } else {
                    // For other inputs
                    element.value = data[key] || '';
                }
            });
        });
        
        // After restoring data, check states
        if (data.withLrn === 'NO') {
            toggleLRNField();
        }
        
        if (data.returning === 'YES') {
            toggleReturningLearnerSection();
        }
        
        // Restore same address checkbox state
        if (data.sameAddressChecked) {
            document.getElementById('sameAddress').checked = true;
            // Don't call togglePermanentAddress yet, wait for dropdowns to load
        }
        
        // Trigger location dropdowns if data exists
        const loadPromises = [];
        
        if (data.birthProvince) {
            loadPromises.push(
                birthSelector.loadProvinces(data.birthProvince).then(() => {
                    if (data.birthCity) {
                        return birthSelector.loadCities(data.birthProvince, data.birthCity);
                    }
                })
            );
        }
        
        if (data.currentProvince) {
            loadPromises.push(
                currentSelector.loadProvinces(data.currentProvince).then(() => {
                    if (data.currentMunicipality) {
                        return currentSelector.loadCities(data.currentProvince, data.currentMunicipality).then(() => {
                            if (data.currentBarangay) {
                                return currentSelector.loadBarangays(data.currentMunicipality, data.currentBarangay);
                            }
                        });
                    }
                })
            );
        }
        
        if (data.permProvince && !data.sameAddressChecked) {
            loadPromises.push(
                permSelector.loadProvinces(data.permProvince).then(() => {
                    if (data.permMunicipality) {
                        return permSelector.loadCities(data.permProvince, data.permMunicipality).then(() => {
                            if (data.permBarangay) {
                                return permSelector.loadBarangays(data.permMunicipality, data.permBarangay);
                            }
                        });
                    }
                })
            );
        }
        
        // After all dropdowns are loaded, handle same address checkbox
        Promise.all(loadPromises).then(() => {
            if (data.sameAddressChecked) {
                togglePermanentAddress();
            }
        });
    }

    // Set up auto-save on any form change
    const form = document.getElementById('applicationForm');
    const formElements = form.querySelectorAll('input, select, textarea');
    
    formElements.forEach(element => {
        // Add appropriate event listeners based on element type
        if (element.type === 'checkbox' || element.type === 'radio') {
            element.addEventListener('change', autoSaveFormData);
        } else if (element.tagName === 'SELECT') {
            element.addEventListener('change', autoSaveFormData);
        } else {
            // For text inputs, save on input but debounce to avoid too frequent saves
            let saveTimeout;
            element.addEventListener('input', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(autoSaveFormData, 500); // Save after 500ms of no typing
            });
        }
    });

    // Also save when LRN or Returning Learner toggles change
    document.getElementById('withLrnYes').addEventListener('change', autoSaveFormData);
    document.getElementById('withLrnNo').addEventListener('change', autoSaveFormData);
    document.getElementById('returningYes').addEventListener('change', autoSaveFormData);
    document.getElementById('returningNo').addEventListener('change', autoSaveFormData);

    // Form submission handler with validation
    window.handleSubmit = function(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        const form = document.getElementById('applicationForm');
        let isValid = true;
        let firstInvalidField = null;
        let errorMessage = '';
        
        // Clear previous error styling
        document.querySelectorAll('.error-highlight').forEach(el => {
            el.classList.remove('error-highlight');
            el.style.borderColor = '';
            el.style.backgroundColor = '';
        });
        
        // Check all required fields that are not disabled
        const requiredFields = form.querySelectorAll('[required]:not(:disabled)');
        
        requiredFields.forEach(field => {
            if (!field.value || field.value.trim() === '') {
                isValid = false;
                field.style.borderColor = 'var(--danger)';
                field.classList.add('error-highlight');
                
                // Set first invalid field for focus
                if (!firstInvalidField) {
                    firstInvalidField = field;
                    
                    // Get the field label for better error message
                    const label = form.querySelector(`label[for="${field.id}"]`);
                    const fieldName = label ? label.textContent.replace('*', '').trim() : field.name;
                    
                    // Determine which section the field is in
                    if (field.closest('#returningLearnerSection')) {
                        errorMessage = `Please complete the required field: ${fieldName} (in Returning Learner section)`;
                    } else if (field.closest('.form-card')) {
                        const sectionTitle = field.closest('.form-card').querySelector('.form-title')?.textContent.trim();
                        errorMessage = `Please complete the required field: ${fieldName}${sectionTitle ? ` (in ${sectionTitle} section)` : ''}`;
                    } else {
                        errorMessage = `Please complete the required field: ${fieldName}`;
                    }
                }
            }
        });
        
        // Special check for radio button groups
        const radioGroups = ['withLrn', 'returning', 'sex', 'hasDisability', 'indigenousPeople', 'fourPs'];
        radioGroups.forEach(groupName => {
            const checked = form.querySelector(`[name="${groupName}"]:checked`);
            const firstRadio = form.querySelector(`[name="${groupName}"]`);
            
            // Check if this radio group exists and is required
            if (firstRadio && firstRadio.hasAttribute('required') && !firstRadio.disabled && !checked) {
                isValid = false;
                const radioContainer = firstRadio.closest('.radio-group');
                if (radioContainer) {
                    radioContainer.style.border = '1px solid var(--danger)';
                    radioContainer.style.borderRadius = '4px';
                    radioContainer.style.padding = '4px';
                }
                
                if (!firstInvalidField) {
                    firstInvalidField = firstRadio;
                    const label = firstRadio.closest('.form-field')?.querySelector('label');
                    const fieldName = label ? label.textContent.replace('*', '').trim() : groupName;
                    errorMessage = `Please select an option for: ${fieldName}`;
                }
            }
        });
        
        // Check if LRN is required and filled
        const withLrnYes = document.getElementById('withLrnYes');
        const withLrnNo = document.getElementById('withLrnNo');
        const lrnInput = document.getElementById('lrn');
        
        // First check if With LRN is answered
        if (!withLrnYes.checked && !withLrnNo.checked) {
            isValid = false;
            const radioContainer = withLrnYes.closest('.radio-group');
            if (radioContainer) {
                radioContainer.style.border = '1px solid var(--danger)';
                radioContainer.style.borderRadius = '4px';
                radioContainer.style.padding = '4px';
            }
            if (!firstInvalidField) {
                firstInvalidField = withLrnYes;
                errorMessage = 'Please select whether the student has an LRN (With LRN?)';
            }
        } else if (withLrnYes.checked && (!lrnInput.value || lrnInput.value.trim() === '')) {
            isValid = false;
            lrnInput.style.borderColor = 'var(--danger)';
            lrnInput.classList.add('error-highlight');
            if (!firstInvalidField) {
                firstInvalidField = lrnInput;
                errorMessage = 'Please enter the Learner Reference Number (LRN)';
            }
        }
        
        // Check if returning learner is answered
        const returningYes = document.getElementById('returningYes');
        const returningNo = document.getElementById('returningNo');
        
        if (!returningYes.checked && !returningNo.checked) {
            isValid = false;
            const radioContainer = returningYes.closest('.radio-group');
            if (radioContainer) {
                radioContainer.style.border = '1px solid var(--danger)';
                radioContainer.style.borderRadius = '4px';
                radioContainer.style.padding = '4px';
            }
            if (!firstInvalidField) {
                firstInvalidField = returningYes;
                errorMessage = 'Please select whether the student is a Returning Learner (Balik-Aral)';
            }
        } else if (returningYes.checked) {
            // Check returning learner fields
            const returningFields = [
                { id: 'lastGradeLevel', name: 'Last Grade Level Completed' },
                { id: 'lastSchoolYear', name: 'Last School Year Completed' },
                { id: 'lastSchoolAttended', name: 'Last School Attended' },
                { id: 'schoolId', name: 'School ID' }
            ];
            
            returningFields.forEach(fieldInfo => {
                const field = document.getElementById(fieldInfo.id);
                if (!field.value || field.value.trim() === '') {
                    isValid = false;
                    field.style.borderColor = 'var(--danger)';
                    field.classList.add('error-highlight');
                    if (!firstInvalidField) {
                        firstInvalidField = field;
                        errorMessage = `Please complete: ${fieldInfo.name} (Required for Returning Learners)`;
                    }
                }
            });
        }
        
        // Check if sex is selected
        const male = document.getElementById('male');
        const female = document.getElementById('female');
        
        if (!male.checked && !female.checked) {
            isValid = false;
            const radioContainer = male.closest('.radio-group');
            if (radioContainer) {
                radioContainer.style.border = '1px solid var(--danger)';
                radioContainer.style.borderRadius = '4px';
                radioContainer.style.padding = '4px';
            }
            if (!firstInvalidField) {
                firstInvalidField = male;
                errorMessage = 'Please select the student\'s sex';
            }
        }
        
        // Check if at least one learning modality is selected
        const modalityCheckboxes = document.querySelectorAll('input[name="learningModality"]:checked');
        if (modalityCheckboxes.length === 0) {
            isValid = false;
            const modalitySection = document.querySelector('.modality-grid');
            if (modalitySection) {
                modalitySection.style.border = '2px solid var(--danger)';
                modalitySection.style.borderRadius = '8px';
                modalitySection.style.padding = '8px';
            }
            if (!firstInvalidField) {
                firstInvalidField = document.getElementById('faceToFace');
                errorMessage = 'Please select at least one learning modality preference';
            }
        }
        
        // If validation fails, show error and focus on first invalid field
        if (!isValid) {
            // Show custom alert with specific field information
            alert(errorMessage || 'Please complete all required fields before proceeding.');
            
            // Scroll to and focus the first invalid field
            if (firstInvalidField) {
                // Add visual emphasis
                if (firstInvalidField.type !== 'radio' && firstInvalidField.type !== 'checkbox') {
                    firstInvalidField.style.backgroundColor = '#fff3cd';
                    setTimeout(() => {
                        firstInvalidField.style.backgroundColor = '';
                    }, 3000);
                }
                
                // Scroll into view with offset for better visibility
                firstInvalidField.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // Focus the field after scroll
                setTimeout(() => {
                    if (firstInvalidField.type !== 'radio' && firstInvalidField.type !== 'checkbox') {
                        firstInvalidField.focus();
                    }
                }, 500);
            }
            
            // CRITICAL: Return false to prevent form submission
            return false;
        }
        
        // All validation passed - save one final time before navigation
        autoSaveFormData();
        
        // Set a flag in sessionStorage to indicate successful submission from this page
        sessionStorage.setItem('applicationFormCompleted', 'true');
        
        // Navigate to next page
        window.location.href = 'uploadDocument.html';
        
        // Return false to prevent default form submission
        return false;
    }

    // Form validation feedback
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        // Add change listener for radio buttons to clear group error styling
        if (input.type === 'radio') {
            input.addEventListener('change', function() {
                const radioGroup = this.closest('.radio-group');
                if (radioGroup && radioGroup.style.border) {
                    radioGroup.style.border = '';
                    radioGroup.style.padding = '';
                }
            });
        }
        
        // Add change listener for checkboxes in learning modality
        if (input.type === 'checkbox' && input.name === 'learningModality') {
            input.addEventListener('change', function() {
                const modalityGrid = this.closest('.modality-grid');
                if (modalityGrid && modalityGrid.style.border) {
                    modalityGrid.style.border = '';
                    modalityGrid.style.padding = '';
                }
            });
        }
        
        input.addEventListener('blur', function() {
            // Skip validation for disabled fields or LRN when "No" is selected
            if (this.disabled) return;
            
            // Special handling for LRN field
            if (this.id === 'lrn') {
                const withLrnNo = document.getElementById('withLrnNo').checked;
                if (withLrnNo) {
                    // Don't show error for LRN when "No" is selected
                    this.style.borderColor = '';
                    return;
                }
            }
            
            // Check if field is in returning learner section
            const returningSection = document.getElementById('returningLearnerSection');
            const isInReturningSection = returningSection && returningSection.contains(this);
            
            if (isInReturningSection) {
                const returningYes = document.getElementById('returningYes').checked;
                
                if (returningYes && !this.value) {
                    this.style.borderColor = 'var(--danger)';
                } else {
                    this.style.borderColor = '';
                }
            } else if (this.hasAttribute('required') && !this.value) {
                this.style.borderColor = 'var(--danger)';
            } else {
                this.style.borderColor = '';
            }
        });
        
        // Clear error styling when user starts typing
        input.addEventListener('input', function() {
            if (this.style.borderColor === 'var(--danger)' || this.style.borderColor.includes('danger')) {
                this.style.borderColor = '';
            }
        });
    });
});