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

// Initialize dropdowns
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

// Same Address Toggle
async function togglePermanentAddress() {
  const same = document.getElementById("sameAddress").checked;

  const fields = [
    "permProvince",
    "permMunicipality",
    "permBarangay",
    "permHouseNo",
    "permZipCode",
  ];

  if (same) {
    // copy values
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

    fields.forEach((id) => document.getElementById(id).setAttribute("disabled", true));

    // auto-update if current address changes
    ["currentProvince", "currentMunicipality", "currentBarangay", "currentHouseNo", "currentZipCode"].forEach((id) => {
      document.getElementById(id).addEventListener("change", togglePermanentAddress);
    });
  } else {
    fields.forEach((id) => document.getElementById(id).removeAttribute("disabled"));
  }
}

// Auto-calculate Age from Birthdate
document.addEventListener("DOMContentLoaded", () => {
  const birthdateInput = document.getElementById("birthDate");
  const ageInput = document.getElementById("age");

  birthdateInput.addEventListener("change", () => {
    const birthDate = new Date(birthdateInput.value);
    if (!isNaN(birthDate)) {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();

      // adjust if birthday hasn't happened yet this year
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      ageInput.value = age >= 0 ? age : "";
    } else {
      ageInput.value = "";
    }
  });
});