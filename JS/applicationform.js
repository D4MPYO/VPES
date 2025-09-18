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
        } else {
            lrnInput.disabled = false;
            lrnInput.setAttribute('required', 'required');
            lrnInput.placeholder = '000000000000';
            lrnInput.style.backgroundColor = '';
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

    // Save Draft function
    window.saveDraft = function() {
        const formData = new FormData(document.getElementById('applicationForm'));
        const data = Object.fromEntries(formData);
        localStorage.setItem('applicationDraft', JSON.stringify(data));
        alert('Draft saved successfully!');
    }

    // Load saved draft if exists
    const savedDraft = localStorage.getItem('applicationDraft');
    if (savedDraft) {
        const data = JSON.parse(savedDraft);
        Object.keys(data).forEach(key => {
            const element = document.querySelector(`[name="${key}"]`);
            if (element) {
                if (element.type === 'radio' || element.type === 'checkbox') {
                    element.checked = element.value === data[key];
                } else {
                    element.value = data[key];
                }
            }
        });
        
        // Check if LRN should be disabled based on saved data
        if (data.withLrn === 'NO') {
            toggleLRNField();
        }
        
        // Check if returning learner fields should be enabled
        if (data.returning === 'YES') {
            toggleReturningLearnerSection();
        }
    }

    // Form submission handler with validation
    window.handleSubmit = function(event) {
        event.preventDefault();
        
        // Check if returning learner is selected
        const returningYes = document.getElementById('returningYes').checked;
        
        if (returningYes) {
            // Validate ALL FOUR required returning learner fields
            const lastGradeLevel = document.getElementById('lastGradeLevel');
            const lastSchoolYear = document.getElementById('lastSchoolYear');
            const lastSchoolAttended = document.getElementById('lastSchoolAttended');
            const schoolId = document.getElementById('schoolId');
            
            let allValid = true;
            let firstInvalidField = null;
            
            // Check each field
            if (!lastGradeLevel.value) {
                allValid = false;
                lastGradeLevel.style.borderColor = 'var(--danger)';
                if (!firstInvalidField) firstInvalidField = lastGradeLevel;
            }
            
            if (!lastSchoolYear.value) {
                allValid = false;
                lastSchoolYear.style.borderColor = 'var(--danger)';
                if (!firstInvalidField) firstInvalidField = lastSchoolYear;
            }
            
            if (!lastSchoolAttended.value) {
                allValid = false;
                lastSchoolAttended.style.borderColor = 'var(--danger)';
                if (!firstInvalidField) firstInvalidField = lastSchoolAttended;
            }
            
            if (!schoolId.value) {
                allValid = false;
                schoolId.style.borderColor = 'var(--danger)';
                if (!firstInvalidField) firstInvalidField = schoolId;
            }
            
            if (!allValid) {
                alert('Please complete ALL required fields in the Returning Learner section.');
                if (firstInvalidField) {
                    firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstInvalidField.focus();
                }
                return false;
            }
        }
        
        // Check if at least one learning modality is selected
        const modalityCheckboxes = document.querySelectorAll('input[name="learningModality"]:checked');
        if (modalityCheckboxes.length === 0) {
            alert('Please select at least one learning modality preference.');
            document.getElementById('faceToFace').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }
        
        // If all validation passes, save the form data
        const formData = new FormData(document.getElementById('applicationForm'));
        const data = Object.fromEntries(formData);
        
        // Save to localStorage
        localStorage.setItem('applicationData', JSON.stringify(data));
        
        // Navigate to next page
        window.location.href = 'uploadDocument.html';
    }

    // Form validation feedback
    const form = document.getElementById('applicationForm');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            // Skip validation for disabled fields
            if (this.disabled) return;
            
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
            if (this.style.borderColor === 'var(--danger)') {
                this.style.borderColor = '';
            }
        });
    });
});