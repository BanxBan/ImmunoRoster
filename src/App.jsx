import { useEffect, useState, useMemo, useRef } from "react";
import {
  adminLogin,
  adminLogout,
  getAdminSession,
  searchPatients,
  createPatient,
  updatePatient,
  deletePatient,
  getImmunizations,
  createImmunization,
  updateImmunization,
  deleteImmunization,
  getAnimalBites,
  createAnimalBite,
  updateAnimalBite,
  deleteAnimalBite,
  getCommunityData,
  registerNurse,
  updateNurseProfile,
  getCensus
} from "./api";

const VACCINE_TYPES = [
  "Hepatitis B Vaccine", "BCG (Bacillus Calmette-Guerin)", "OPV (Oral Polio Vaccine)",
  "IPV (Inactivated Polio Vaccine)", "Pentavalent Vaccine (DPT-HepB-Hib)",
  "Rotavirus Vaccine", "Measles", "MMR (Measles, Mumps, Rubella)",
  "TT1 (Tetanus Toxoid)", "TT2 (Tetanus Toxoid)", "TT3 (Tetanus Toxoid)",
  "TT4 (Tetanus Toxoid)", "TT5 (Tetanus Toxoid)"
];


const EPI_VACCINE_GROUPS = [
  {
    key: "hep-b",
    label: "Hepatitis B",
    group: "single",
    minimumAge: "Birth",
    requiredDoses: 1,
    minimumInterval: "N/A",
    description: "Birth dose protection against hepatitis B infection."
  },
  {
    key: "bcg",
    label: "BCG (Bacillus Calmette-Guerin)",
    group: "single",
    minimumAge: "Birth",
    requiredDoses: 1,
    minimumInterval: "N/A",
    description: "Birth dose protection against severe childhood tuberculosis."
  },
  {
    key: "ipv",
    label: "IPV (Inactivated Polio Vaccine)",
    group: "single",
    minimumAge: "14 weeks",
    requiredDoses: 1,
    minimumInterval: "Coexists with OPV",
    description: "Injected polio vaccine used with OPV for stronger polio protection."
  },
  {
    key: "measles",
    label: "Measles",
    group: "single",
    minimumAge: "9 months",
    requiredDoses: 1,
    minimumInterval: "N/A",
    description: "First measles-containing vaccine dose."
  },
  {
    key: "mmr",
    label: "MMR (Measles, Mumps, Rubella)",
    group: "single",
    minimumAge: "1 year +",
    requiredDoses: 1,
    minimumInterval: "N/A",
    description: "Protection against measles, mumps, and rubella."
  },
  {
    key: "pcv",
    label: "PCV (Pneumococcal Conjugate Vaccine)",
    group: "single",
    minimumAge: "6 weeks",
    requiredDoses: 1,
    minimumInterval: "N/A",
    description: "Pneumococcal vaccine dose tracked in records."
  },
  {
    key: "opv",
    label: "OPV (Oral Polio Vaccine)",
    group: "multi",
    minimumAge: "6 weeks",
    requiredDoses: 3,
    minimumInterval: "4 weeks",
    description: "Three-dose oral polio vaccine series. Patient is complete only after all 3 doses are completed."
  },
  {
    key: "pentavalent",
    label: "Pentavalent Vaccine (DPT-HepB-Hib)",
    group: "multi",
    minimumAge: "6 weeks",
    requiredDoses: 3,
    minimumInterval: "4 weeks",
    description: "Three-dose series against diphtheria, pertussis, tetanus, hepatitis B, and Hib."
  },
  {
    key: "rotavirus",
    label: "Rotavirus Vaccine",
    group: "multi",
    minimumAge: "6 weeks",
    requiredDoses: 2,
    minimumInterval: "4 weeks",
    description: "Two-dose series against severe rotavirus diarrhea."
  },
  {
    key: "tt",
    label: "TT1-TT5 (Maternal Tetanus Toxoid)",
    group: "multi",
    minimumAge: "Pregnancy / maternal care",
    requiredDoses: 5,
    minimumInterval: "Per TT schedule",
    description: "Maternal tetanus toxoid series. Completion requires TT1 through TT5."
  }


];

function getEpiVaccineKey(immunization = {}) {
  const name = String(immunization.vaccine_name || "").toLowerCase();
  const dose = Number(immunization.dose_number || 1);

  if (name.includes("rabies")) return null;
  if (name.includes("hepatitis b") || name === "hep b" || name.includes("hep b")) return "hep-b";
  if (name.includes("bcg")) return "bcg";
  if (name.includes("oral polio") || name.includes("opv")) return "opv";
  if (name.includes("inactivated polio") || name.includes("ipv")) return "ipv";
  if (name.includes("pentavalent") || name.includes("dpt")) return "pentavalent";
  if (name.includes("rotavirus")) return "rotavirus";
  if (name.includes("mmr")) return "mmr";
  if (name.includes("measles")) return "measles";
  if (name.includes("tt1") || name.includes("tt2") || name.includes("tt3") || name.includes("tt4") || name.includes("tt5")) return "tt";
  if (name.includes("tetanus")) return "tt";
  return null;
}

function normalizePhContactNumber(rawValue) {
  const digits = String(rawValue || "").replace(/\D/g, "");
  if (!digits) return { local: "", e164: "" };

  // Accept 09XXXXXXXXX, 9XXXXXXXXX, 63XXXXXXXXXX, +63XXXXXXXXXX; store as +63 + 10 digits
  let local = digits;
  if (local.startsWith("63")) local = local.slice(2);
  if (local.startsWith("0")) local = local.slice(1);
  local = local.slice(0, 10);

  return { local, e164: local ? `+63${local}` : "" };
}

const BITE_PROTOCOLS = {
  "Standard IM (0, 3, 7, 14, 28)": [0, 3, 7, 14, 28],
  "Thai Red Cross ID/2-site regimen (0, 3, 7, 28)": [0, 3, 7, 28],
  "Zagreb 2-1-1 (0, 7, 21)": [0, 7, 21],
  "Booster (0, 3)": [0, 3]
};
const EXPOSURE_CATEGORIES = ["1", "2", "3"];
const DEFAULT_BITE_VACCINE_GENERIC_NAME = "Purified Rabies Vaccine (Vero Cell)";
const RABIES_VACCINE_GENERIC_NAMES = [
  "Purified Rabies Vaccine (Vero Cell)",
  "Rabies Vaccine (Inactivated)"
];
const RIG_GENERIC_NAMES = [
  "Equine Rabies Immunoglobulin (ERIG)",
  "Human Rabies Immunoglobulin (HRIG)"
];
const RABIES_VACCINE_BRAND_NAMES = ["SPEEDA", "VERORAB"];
const RABIES_VACCINE_BRAND_BY_GENERIC_NAME = {
  "Purified Rabies Vaccine (Vero Cell)": "SPEEDA",
  "Rabies Vaccine (Inactivated)": "VERORAB",
  // Backward-compat / casing variants
  "Rabies Vaccine (inactivated)": "VERORAB"
};
const RABIES_VACCINE_GENERIC_BY_BRAND_NAME = {
  SPEEDA: "Purified Rabies Vaccine (Vero Cell)",
  VERORAB: "Rabies Vaccine (Inactivated)"
};
const ADULT_CONSENT_STATEMENT =
  "I voluntarily consent to medical treatment for EPI or Animal Bite management and authorize the electronic logging of my health data in the immunization Registry for community surveillance and continuity of care. By checking this box, I confirm that I am providing this authorization freely, officially notifying the attending nurse of my informed consent to proceed with both clinical treatment and digital documentaion.";
const GUARDIAN_CONSENT_STATEMENT =
  "I am the parent/guardian and I voluntarily consent to medical treatment for EPI or Animal Bite management for this patient and authorize the electronic logging of this patient's health data in the immunization Registry for community surveillance and continuity of care. By checking this box, I confirm that I am providing this authorization freely, officially notifying the attending nurse of my informed consent to proceed with both clinical treatment and digital documentaion.";

const normalizeBarangayName = (value) => {
  const normalized = String(value || "Unknown").trim().toLowerCase();
  return normalized || "unknown";
};

const getBarangayDisplayScore = (value) => {
  const name = String(value || "").trim();
  if (!name) return 0;
  const hasUpper = /[A-Z]/.test(name);
  const hasLower = /[a-z]/.test(name);
  if (hasUpper && hasLower) return 3;
  if (hasUpper) return 2;
  return 1;
};

const buildBarangayOptionMap = (records = []) => {
  return records.reduce((acc, value) => {
    const name = String(value || "").trim();
    if (!name) return acc;

    const key = normalizeBarangayName(name);
    const score = getBarangayDisplayScore(name);
    const existing = acc.get(key);
    if (!existing || score > existing.score) {
      acc.set(key, { key, label: name, score });
    }
    return acc;
  }, new Map());
};

const EPI_ROUTE_BY_VACCINE_KEY = {
  "hep-b": "IM",
  "bcg": "ID",
  "opv": "Oral",
  "ipv": "IM",
  "pentavalent": "IM",
  "rotavirus": "Oral",
  "measles": "SC",
  "mmr": "SC",
  "tt": "IM"
};
const EPI_INTERVAL_DAYS_BY_VACCINE_KEY = {
  "hep-b": 0,
  "bcg": 0,
  "opv": 28,
  "ipv": 0,
  "pentavalent": 28,
  "rotavirus": 28,
  "measles": 0,
  "mmr": 0,
  "tt": 28
};
const EPI_MAX_DOSES_BY_VACCINE_KEY = {
  "hep-b": 1,
  "bcg": 1,
  "opv": 3,
  "ipv": 1,
  "pentavalent": 3,
  "rotavirus": 2,
  "measles": 1,
  "mmr": 1,
  "tt": 5
};
const EPI_INTERVAL_LABEL_BY_VACCINE_KEY = {
  "hep-b": "Single dose (birth)",
  "bcg": "Single dose (birth/anytime after birth)",
  "opv": "Every 4 weeks (3 doses)",
  "ipv": "Single dose; with OPV 3 if possible",
  "pentavalent": "Every 4 weeks (3 doses)",
  "rotavirus": "Every 4 weeks (2 doses)",
  "measles": "Single dose at 9 months",
  "mmr": "Single dose at 1 year +",
  "tt": "TT2:+4w, TT3:+6m, TT4:+1y, TT5:+1y"
};

function getTtIntervalDaysForNextDose(nextDoseNumber) {
  if (nextDoseNumber <= 1) return 0;
  if (nextDoseNumber === 2) return 28;
  if (nextDoseNumber === 3) return 182;
  if (nextDoseNumber === 4) return 365;
  return 365;
}

const ANIMAL_GROUPS = ["Dogs", "Cats", "Rats", "Others"];

function getAnimalGroup(animalType = "") {
  const normalized = animalType.toLowerCase();
  if (normalized.includes("dog") || normalized.includes("canine")) return "Dogs";
  if (normalized.includes("cat") || normalized.includes("feline")) return "Cats";
  if (normalized.includes("rat") || normalized.includes("mouse") || normalized.includes("rodent")) return "Rats";
  return "Others";
}

function getExposureType(bite = {}) {
  const source = `${bite.severity_category || ""} ${bite.notes || ""} ${bite.animal_type || ""}`.toLowerCase();
  return source.includes("scratch") ? "scratched" : "bitten";
}
function isAntiRabiesImmunization(imm = {}) {
  const name = String(imm.vaccine_name || "").toLowerCase();
  return name.includes("rabies") || name.includes("anti-rabies");
}

function getAgeFromDateOfBirth(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

const PatientProfileSummary = ({ patient, biteRecords = [], epiRecords = [] }) => {
  if (!patient) return null;
  const profileItems = [
    { label: "Full Name", value: patient.full_name },
    { label: "Sex", value: patient.sex },
    { label: "Date of Birth", value: `${patient.date_of_birth} (${getAgeFromDateOfBirth(patient.date_of_birth)} yrs)` },
    { label: "Barangay", value: patient.barangay },
    { label: "Municipality", value: patient.municipality || "N/A" },
    { label: "Full Address", value: patient.address },
    { label: "Contact Number", value: patient.contact_number },
    { label: "Mother's Name", value: patient.mother_name },
    { label: "Father's Name", value: patient.father_name },
    { label: "Place of Birth", value: patient.place_of_birth },
    { label: "Health Center", value: patient.health_center },
    { label: "Family No.", value: patient.family_no },
  ];

  return (
    <div className="patient-profile-summary">
      <div className="profile-grid">
        {profileItems.map((item, idx) => (
          <div className="profile-item" key={idx}>
            <span className="profile-item-label">{item.label}</span>
            <span className="profile-item-value">{item.value || "—"}</span>
          </div>
        ))}
      </div>

      {biteRecords.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <hr style={{ margin: "1.5rem 0", border: "none", borderTop: "1px dashed var(--border)" }} />
          <h4 style={{ marginBottom: "1.2rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🐕</span> Animal Bite Case Details
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {biteRecords.map((bite, bidx) => (
              <div key={bidx} className="bite-case-summary" style={{ background: "#f8fafc", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
                   <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
                     {bite.animal_type} Case {bite.registration_no ? `(#${bite.registration_no})` : ""} • Incident: {bite.incident_date}
                   </span>
                   <span className={`badge badge-${bite.treatment_status}`}>{bite.treatment_status}</span>
                </div>
                <div className="profile-grid">
                  <div className="profile-item">
                    <span className="profile-item-label">Category of Exposure</span>
                    <span className="profile-item-value">Category {bite.severity_category || "—"}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-item-label">Site of Exposure</span>
                    <span className="profile-item-value">{bite.site_of_exposure || "—"}</span>
                  </div>
                  <div className="profile-item">
                     <span className="profile-item-label">Exposure Type</span>
                     <span className="profile-item-value" style={{ textTransform: "capitalize" }}>{getExposureType(bite)}</span>
                  </div>
                  <div className="profile-item">
                     <span className="profile-item-label">Source of Exposure</span>
                     <span className="profile-item-value">{bite.source_of_exposure || "—"}</span>
                  </div>
                  <div className="profile-item">
                     <span className="profile-item-label">Place of Exposure</span>
                     <span className="profile-item-value">{bite.place_of_exposure || "—"}</span>
                  </div>
                  <div className="profile-item">
                     <span className="profile-item-label">Wound Washing</span>
                     <span className="profile-item-value">{bite.wound_washing_done ? "✅ Done" : "❌ Not Done"}</span>
                  </div>
                  <div className="profile-item">
                     <span className="profile-item-label">RIG Given</span>
                     <span className="profile-item-value">{bite.rig_given ? "✅ Yes" : "❌ No"}</span>
                  </div>
                  <div className="profile-item">
                     <span className="profile-item-label">Vaccine Route</span>
                     <span className="profile-item-value">{bite.vaccine_route || "—"}</span>
                  </div>
                  <div className="profile-item">
                     <span className="profile-item-label">Treatment Protocol</span>
                     <span className="profile-item-value" style={{ fontSize: "0.8rem" }}>{bite.treatment_protocol || "—"}</span>
                  </div>
                  <div className="profile-item">
                     <span className="profile-item-label">Vaccine Brand</span>
                     <span className="profile-item-value">{bite.vaccine_brand_name || "—"}</span>
                  </div>
                </div>
                {bite.notes && (
                  <div style={{ marginTop: "0.75rem", padding: "0.6rem", background: "#eff6ff", borderRadius: "8px", fontSize: "0.8rem" }}>
                    <strong style={{ color: "#1e40af" }}>Notes:</strong> {bite.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {epiRecords.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <hr style={{ margin: "1.5rem 0", border: "none", borderTop: "1px dashed var(--border)" }} />
          <h4 style={{ marginBottom: "1.2rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>💉</span> EPI Immunization Details
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {epiRecords.map((imm, idx) => (
              <div key={idx} style={{ background: "#f8fafc", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div className="profile-grid">
                  <div className="profile-item">
                    <span className="profile-item-label">Vaccine</span>
                    <span className="profile-item-value">{imm.vaccine_name}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-item-label">Sched</span>
                    <span className="profile-item-value">{imm.administered_date || imm.scheduled_date}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-item-label">Dose Number</span>
                    <span className="profile-item-value">{imm.dose_number}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-item-label">Route</span>
                    <span className="profile-item-value">{imm.route || (imm.notes?.includes("Route: ") ? imm.notes.match(/Route: (.*?)(?:\s|\[|$)/)?.[1] : "—")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};




const initialPatientForm = {
  full_name: "",
  date_of_birth: "",
  sex: "",
  contact_number: "",
  place_of_birth: "",
  mother_name: "",
  father_name: "",
  birth_height: "",
  birth_weight: "",
  health_center: "",
  family_no: "",
  barangay: "",
  municipality: "",
  address: ""
};

export default function App() {
  const [adminUser, setAdminUser] = useState(() => getAdminSession());
  const [registrySearch, setRegistrySearch] = useState("");
  const [registryPage, setRegistryPage] = useState(1);
  const registryItemsPerPage = 5;
  const [activeTab, setActiveTab] = useState("census");
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [loggingIn, setLoggingIn] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirmWorking, setConfirmWorking] = useState(false);
  const [toast, setToast] = useState(null);
  const [showSendReminders, setShowSendReminders] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  const [patients, setPatients] = useState([]);
  const [immunizations, setImmunizations] = useState([]);
  const [animalBites, setAnimalBites] = useState([]);

  const [patientForm, setPatientForm] = useState(initialPatientForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [community, setCommunity] = useState([]);
  const [globalStats, setGlobalStats] = useState({ patients: [], immunizations: [], animalBites: [], community: [] });
  const [isSignup, setIsSignup] = useState(false);
  const [logType, setLogType] = useState('none');
  const [showBiteDetails, setShowBiteDetails] = useState(false);
  const [showEpiDetails, setShowEpiDetails] = useState(false);
  const [showActiveBiteAlert, setShowActiveBiteAlert] = useState(false);
  const [showHeaderNotifications, setShowHeaderNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ first_name: "", last_name: "", username: "", email: "", password: "", shift: "" });
  const [biteAnimalType, setBiteAnimalType] = useState("Dog");
  const [selectedBarangayFilter, setSelectedBarangayFilter] = useState("all");
  const [selectedHistoryPatientId, setSelectedHistoryPatientId] = useState(null);
  const [selectedRegistryEpiHistoryPatientId, setSelectedRegistryEpiHistoryPatientId] = useState(null);
  const [selectedRegistryBiteHistoryPatientId, setSelectedRegistryBiteHistoryPatientId] = useState(null);
  const [epiForm, setEpiForm] = useState({
    vaccine_name: "",
    route: "",
    dose_number: 1,
    scheduled_date: new Date().toISOString().split('T')[0]
  });
  const [biteDateOfExposure, setBiteDateOfExposure] = useState(new Date().toISOString().split('T')[0]);
  const [biteProtocol, setBiteProtocol] = useState(Object.keys(BITE_PROTOCOLS)[0]);
  const [biteSchedulePreview, setBiteSchedulePreview] = useState({ d0: "", d3: "", d7: "", d14: "", d21: "", d28: "" });
  const [biteVaccineGenericName, setBiteVaccineGenericName] = useState(DEFAULT_BITE_VACCINE_GENERIC_NAME);
  const [biteVaccineBrandName, setBiteVaccineBrandName] = useState(
    RABIES_VACCINE_BRAND_BY_GENERIC_NAME[DEFAULT_BITE_VACCINE_GENERIC_NAME] || ""
  );
  const [biteRigGiven, setBiteRigGiven] = useState(false);
  const [historyTab, setHistoryTab] = useState('treatment'); // 'treatment' or 'profile'
  const [patientPhoneLocal, setPatientPhoneLocal] = useState(() => normalizePhContactNumber(initialPatientForm.contact_number).local);
  const [guardianPhoneLocal, setGuardianPhoneLocal] = useState("");
  const formRef = useRef(null);

  useEffect(() => {
    setPatientPhoneLocal(normalizePhContactNumber(patientForm.contact_number).local);
  }, [patientForm.contact_number]);

  useEffect(() => {
    if (editingId && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingId, logType]);

  // Load Initial Data
  async function loadAllData() {
    if (!adminUser) return;
    setLoading(true);
    try {
      const [pData, iData, bData, cGlobal] = await Promise.all([
        searchPatients(),
        getImmunizations(),
        getAnimalBites(),
        getCensus()
      ]);
      setPatients(pData || []);
      setImmunizations(iData || []);
      setAnimalBites(bData || []);
      setGlobalStats(cGlobal || { patients: [], immunizations: [], animalBites: [], community: [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, [adminUser]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.notif-wrap')) {
        setShowProfileMenu(false);
        setShowHeaderNotifications(false);
        setShowSendReminders(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setShowBiteDetails(false);
    setShowEpiDetails(false);
    setShowActiveBiteAlert(false);
  }, [activeTab]);

  useEffect(() => {
    if (logType !== "bite") return;
    const incident = new Date(biteDateOfExposure);
    if (Number.isNaN(incident.getTime())) return;
    const days = BITE_PROTOCOLS[biteProtocol] || [];
    const nextPreview = { d0: "", d3: "", d7: "", d14: "", d21: "", d28: "" };
    days.forEach((day) => {
      const dt = new Date(incident);
      dt.setDate(incident.getDate() + day);
      const value = dt.toISOString().split("T")[0];
      if (day === 0) nextPreview.d0 = value;
      if (day === 3) nextPreview.d3 = value;
      if (day === 7) nextPreview.d7 = value;
      if (day === 14) nextPreview.d14 = value;
      if (day === 21) nextPreview.d21 = value;
      if (day === 28) nextPreview.d28 = value;
    });
    setBiteSchedulePreview(nextPreview);
  }, [biteDateOfExposure, biteProtocol, logType]);

  useEffect(() => {
    if (logType !== "epi") return;
    if (!epiForm.vaccine_name) return;
    const key = getEpiVaccineKey({ vaccine_name: epiForm.vaccine_name });
    const route = EPI_ROUTE_BY_VACCINE_KEY[key] || "IM";
    const intervalDays = EPI_INTERVAL_DAYS_BY_VACCINE_KEY[key] ?? 28;
    const maxDoses = EPI_MAX_DOSES_BY_VACCINE_KEY[key] || 1;
    const targetPatientId = editingId || null;
    let nextDoseNumber = 1;
    let nextDate = new Date().toISOString().split("T")[0];

    if (targetPatientId) {
      const sameSeriesRecords = immunizations
        .filter((imm) => imm.patient_id === targetPatientId && getEpiVaccineKey(imm) === key)
        .sort((a, b) => Number(a.dose_number || 1) - Number(b.dose_number || 1));

      if (sameSeriesRecords.length > 0) {
        const last = sameSeriesRecords[sameSeriesRecords.length - 1];
        const lastDose = Number(last.dose_number || 0);
        nextDoseNumber = lastDose + 1;
        if (lastDose >= maxDoses) nextDoseNumber = maxDoses;

        const base = new Date(last.administered_date || last.scheduled_date || new Date());
        if (!Number.isNaN(base.getTime())) {
          const addDays = key === "tt"
            ? getTtIntervalDaysForNextDose(nextDoseNumber)
            : intervalDays;
          base.setDate(base.getDate() + addDays);
          nextDate = base.toISOString().split("T")[0];
        }
      }

      if (key === "ipv") {
        const opvRecords = immunizations
          .filter((imm) => imm.patient_id === targetPatientId && getEpiVaccineKey(imm) === "opv")
          .sort((a, b) => Number(a.dose_number || 1) - Number(b.dose_number || 1));
        const opv3 = opvRecords.find((imm) => Number(imm.dose_number || 0) === 3);
        if (opv3) {
          const opv3Date = opv3.administered_date || opv3.scheduled_date;
          if (opv3Date) nextDate = opv3Date;
        }
      }
    }

    setEpiForm((prev) => ({ ...prev, route, dose_number: nextDoseNumber, scheduled_date: nextDate }));
  }, [epiForm.vaccine_name, logType, editingId, immunizations]);

  // Auth Handlers
  const getCurrentShift = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return "AM";
    if (hour >= 14 && hour < 22) return "PM";
    return "Night";
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setLoggingIn(true);
    try {
      if (isSignup) {
        await registerNurse({
          username: fd.get("username"),
          email: fd.get("email"),
          password: fd.get("password"),
          full_name: `${fd.get("firstname")} ${fd.get("lastname")}`.trim(),
          shift: getCurrentShift() // Auto-assign shift on signup
        });
        setIsSignup(false);
        setError("Account created! Please sign in.");
      } else {
        const user = await adminLogin({
          identifier: fd.get("email"),
          password: fd.get("password"),
          // Note: We can also update the shift in the session here
          currentShift: getCurrentShift()
        });
        setAdminUser({ ...user, shift: getCurrentShift() }); // Use current real-time shift
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  function handleLogout() {
    adminLogout();
    setAdminUser(null);
    setActiveTab("census");
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const username = editProfileForm.username.trim();
      const password = editProfileForm.password.trim();
      const payload = {
        email: editProfileForm.email.trim(),
        full_name: `${editProfileForm.first_name.trim()} ${editProfileForm.last_name.trim()}`.trim()
      };

      if (username) payload.username = username;
      if (password) payload.password = password;

      const data = await updateNurseProfile(adminUser.id, payload);
      setAdminUser(data.user);
      // Update local storage too via API helper
      const auth = JSON.parse(localStorage.getItem("immunoroster_admin_auth") || "{}");
      auth.user = data.user;
      localStorage.setItem("immunoroster_admin_auth", JSON.stringify(auth));
      
      setIsEditingProfile(false);
      setToast({ type: "success", message: "Profile updated successfully!" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Patient Handlers
  async function savePatient(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const payload = {
        full_name: patientForm.full_name,
        date_of_birth: patientForm.date_of_birth,
        sex: patientForm.sex,
        place_of_birth: patientForm.place_of_birth,
        mother_name: patientForm.mother_name,
        father_name: patientForm.father_name,
        birth_height: patientForm.birth_height,
        birth_weight: patientForm.birth_weight,
        health_center: patientForm.health_center,
        family_no: patientForm.family_no,
        barangay: patientForm.barangay,
        municipality: patientForm.municipality,
        contact_number: patientForm.contact_number,
        address: patientForm.address
      };

      let savedPatient;
      if (editingId) {
        savedPatient = await updatePatient(editingId, payload);
      } else {
        savedPatient = await createPatient(payload);
      }

      if (logType === 'bite') {
        const age = getAgeFromDateOfBirth(patientForm.date_of_birth);
        const isMinor = age !== null && age < 18;
        const guardianName = String(fd.get("guardianName") || "").trim();
        const guardianEmail = String(fd.get("guardianEmail") || "").trim();
        const guardianPhone = normalizePhContactNumber(fd.get("guardianPhone")).e164;
        const guardianConsent = fd.get("guardianConsent") === "on";
        const adultConsent = fd.get("adultConsent") === "on";

        if (isMinor) {
          if (!guardianName) throw new Error("Guardian name is required for minors.");
          if (!guardianEmail) throw new Error("Guardian email is required for minors.");
          if (!guardianPhone) throw new Error("Guardian phone number is required for minors.");
          if (!guardianConsent) throw new Error("Guardian consent is required for minors.");
        } else if (!adultConsent) {
          throw new Error("Patient consent is required for adults.");
        }

        const selectedAnimal = fd.get("animal");
        const customAnimal = String(fd.get("otherAnimal") || "").trim();
        const finalAnimal = selectedAnimal === "Other" ? customAnimal : selectedAnimal;
        
        const rigGiven = fd.get("rigGiven") === "on";
        const rigRemarks = rigGiven ? `RIG: ${fd.get("rigGenericName")}, Site: ${fd.get("rigSiteOfInfiltration")}, Date: ${fd.get("rigDateGiven")}` : null;
        
        await generateBiteSchedule(
          savedPatient.id,
          finalAnimal,
          fd.get("dateOfExposure"),
          fd.get("protocol"),
          fd.get("typeOfExposure"),
          {
            registration_no: String(fd.get("registrationNo") || "").trim() || null,
            date_registered: String(fd.get("dateRegistered") || "").trim() || null,
            place_of_exposure: String(fd.get("placeOfExposure") || "").trim() || null,
            site_of_exposure: String(fd.get("siteOfExposure") || "").trim() || null,
            source_of_exposure: selectedAnimal,
            source_other_details: selectedAnimal === "Other" ? customAnimal : null,
            status_of_animal_after_14_days: String(fd.get("animalStatus14Days") || "").trim() || null,
            severity_category: String(fd.get("categoryOfExposure") || "").trim() || null,
            wound_washing_done: fd.get("woundWashingDone") === "on",
            rig_given: rigGiven,
            anti_rabies_vaccine_given: fd.get("arvGiven") === "on",
            vaccine_generic_name: String(fd.get("vaccineGenericName") || "").trim() || null,
            vaccine_brand_name: String(fd.get("vaccineBrandName") || "").trim() || null,
            vaccine_route: String(fd.get("vaccineRoute") || "").trim() || null,
            post_exposure_schedule: protocolNameToLabel(fd.get("protocol")),
            notes: rigRemarks || String(fd.get("remarks") || "").trim() || null,
            schedule_d0: String(fd.get("scheduleD0") || "").trim() || null,
            schedule_d3: String(fd.get("scheduleD3") || "").trim() || null,
            schedule_d7: String(fd.get("scheduleD7") || "").trim() || null,
            schedule_d14: String(fd.get("scheduleD14") || "").trim() || null,
            schedule_d21: String(fd.get("scheduleD21") || "").trim() || null,
            schedule_d28: String(fd.get("scheduleD28") || "").trim() || null,
            is_minor_patient: isMinor,
            guardian_name: isMinor ? guardianName : null,
            guardian_email: isMinor ? guardianEmail : null,
            guardian_contact_number: isMinor ? guardianPhone : null,
            consent_given: isMinor ? guardianConsent : adultConsent,
            consent_given_by: isMinor ? "guardian" : "patient",
            consent_statement: isMinor ? GUARDIAN_CONSENT_STATEMENT : ADULT_CONSENT_STATEMENT
          }
        );
        setToast({
          type: "success",
          message: "Animal Bite Log saved successfully."
        });
      } else if (logType === 'epi') {
        const age = getAgeFromDateOfBirth(patientForm.date_of_birth);
        const isMinor = age !== null && age < 18;
        const guardianName = String(fd.get("guardianName") || "").trim();
        const guardianEmail = String(fd.get("guardianEmail") || "").trim();
        const guardianPhone = normalizePhContactNumber(fd.get("guardianPhone")).e164;
        const guardianConsent = fd.get("guardianConsent") === "on";
        const adultConsent = fd.get("adultConsent") === "on";

        if (isMinor) {
          if (!guardianName) throw new Error("Guardian name is required for minors.");
          if (!guardianEmail) throw new Error("Guardian email is required for minors.");
          if (!guardianPhone) throw new Error("Guardian phone number is required for minors.");
          if (!guardianConsent) throw new Error("Guardian consent is required for minors.");
        } else if (!adultConsent) {
          throw new Error("Patient consent is required for adults.");
        }

        const epiKey = getEpiVaccineKey({ vaccine_name: epiForm.vaccine_name });
        const maxDoses = EPI_MAX_DOSES_BY_VACCINE_KEY[epiKey] || 1;
        const existingSeriesCount = immunizations.filter(
          (imm) => imm.patient_id === savedPatient.id && getEpiVaccineKey(imm) === epiKey
        ).length;
        if (existingSeriesCount >= maxDoses) {
          throw new Error(`All required doses already scheduled for ${epiForm.vaccine_name}.`);
        }
        const routeNote = epiForm.route ? `Route: ${epiForm.route}` : null;
        await createImmunization({
          patient_id: savedPatient.id,
          vaccine_name: epiForm.vaccine_name,
          dose_number: Number(epiForm.dose_number || 1),
          scheduled_date: epiForm.scheduled_date,
          status: 'pending',
          is_minor_patient: isMinor,
          guardian_name: isMinor ? guardianName : null,
          guardian_email: isMinor ? guardianEmail : null,
          guardian_contact_number: isMinor ? guardianPhone : null,
          consent_given: isMinor ? guardianConsent : adultConsent,
          consent_given_by: isMinor ? "guardian" : "patient",
          consent_statement: isMinor ? GUARDIAN_CONSENT_STATEMENT : ADULT_CONSENT_STATEMENT,
          notes: routeNote
        });
        setToast({
          type: "success",
          message: "EPI record saved successfully."
        });
      }

      setPatientForm(initialPatientForm);
      setEditingId(null);
      setLogType('none');
      setBiteAnimalType('Dog');
      setBiteVaccineGenericName(DEFAULT_BITE_VACCINE_GENERIC_NAME);
      setBiteVaccineBrandName(RABIES_VACCINE_BRAND_BY_GENERIC_NAME[DEFAULT_BITE_VACCINE_GENERIC_NAME] || "");
      setPatientPhoneLocal("");
      setGuardianPhoneLocal("");
      setEpiForm({
        vaccine_name: "",
        route: "",
        dose_number: 1,
        scheduled_date: new Date().toISOString().split('T')[0]
      });
      loadAllData();
    } catch (err) { setError(err.message); }
  }

  // Animal Bite Protocol Logic
  function protocolNameToLabel(protocolName = "") {
    if (!protocolName) return null;
    return protocolName;
  }

  async function generateBiteSchedule(patientId, animalType, incidentDate, protocolName, exposureType = "Bitten", intake = {}) {
    const days = BITE_PROTOCOLS[protocolName];
    const incident = new Date(incidentDate);

    // Create the Bite Record
    const biteRecord = await createAnimalBite({
      patient_id: patientId,
      animal_type: animalType,
      incident_date: incidentDate,
      severity_category: exposureType,
      treatment_protocol: protocolName,
      total_required_doses: days.length,
      doses_administered: 0,
      treatment_status: 'pending',
      ...intake
    });

    // If RIG was given, create a separate immunization record for it
    if (intake.rig_given) {
      const rigDetails = intake.notes ? ` [${intake.notes}]` : "";
      await createImmunization({
        patient_id: patientId,
        vaccine_name: "Rabies Immunoglobulin (RIG)",
        dose_number: 1,
        scheduled_date: intake.date_registered || incidentDate,
        administered_date: intake.date_registered || incidentDate,
        status: 'completed',
        notes: `Administered as part of Bite Case #${biteRecord.id.slice(0, 5)}.${rigDetails}`
      });
    }

    // Generate individual immunization doses for ARV
    for (let i = 0; i < days.length; i++) {
      const scheduledDate = new Date(incident);
      scheduledDate.setDate(incident.getDate() + days[i]);

      await createImmunization({
        patient_id: patientId,
        vaccine_name: "Anti-Rabies",
        dose_number: i + 1,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        status: 'pending',
        notes: `Bite Case #${biteRecord.id.slice(0, 5)} - Day ${days[i]}`
      });
    }
    loadAllData();
    setActiveTab("registry"); // Go to Registries to see the patient list
  }

  // Census Calculations
  const censusBarangayOptions = useMemo(() => {
    const optionMap = buildBarangayOptionMap([
      ...(globalStats.community || []).map(c => c.barangay),
      ...(globalStats.patients || []).map(p => p.barangay)
    ]);

    return [...optionMap.values()]
      .map(({ key, label }) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [globalStats]);

  const barangayLabelByKey = useMemo(() => {
    return censusBarangayOptions.reduce((acc, barangay) => {
      acc[barangay.key] = barangay.label;
      return acc;
    }, {});
  }, [censusBarangayOptions]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const { patients: gPatients = [], immunizations: gImms = [], animalBites: gBites = [], community: gComm = [] } = globalStats;
    const communityPopulationByBarangay = gComm.reduce((acc, entry) => {
      const key = normalizeBarangayName(entry.barangay);
      if (!acc.has(key)) acc.set(key, Number(entry.total_population || 0));
      return acc;
    }, new Map());
    const scopedPatients = selectedBarangayFilter === "all"
      ? gPatients
      : gPatients.filter(p => normalizeBarangayName(p.barangay) === selectedBarangayFilter);
    const scopedPopulation = selectedBarangayFilter === "all"
      ? [...communityPopulationByBarangay.values()].reduce((sum, population) => sum + population, 0)
      : (communityPopulationByBarangay.get(selectedBarangayFilter) || 0);
    const scopedPatientIds = new Set(scopedPatients.map(p => p.id));
    const scopedImms = gImms.filter(imm => scopedPatientIds.has(imm.patient_id));
    const scopedBites = gBites.filter(bite => scopedPatientIds.has(bite.patient_id));
    const epiImms = scopedImms.filter(imm => getEpiVaccineKey(imm));
    const epiStatsByVaccine = EPI_VACCINE_GROUPS.reduce((acc, vaccine) => {
      acc[vaccine.key] = {
        ...vaccine,
        totalCourses: 0,
        completedCourses: 0,
        pendingCourses: 0,
        completedDoses: 0,
        pendingDoses: 0,
        totalRecordedDoses: 0,
        completionRate: 0,
        patientCourses: new Map()
      };
      return acc;
    }, {});

    epiImms.forEach(imm => {
      const key = getEpiVaccineKey(imm);
      if (!key || !epiStatsByVaccine[key]) return;
      const vaccineStats = epiStatsByVaccine[key];
      const patientKey = imm.patient_id || "unknown";
      if (!vaccineStats.patientCourses.has(patientKey)) {
        vaccineStats.patientCourses.set(patientKey, { completedDoseNumbers: new Set(), recordedDoses: 0 });
      }
      const course = vaccineStats.patientCourses.get(patientKey);
      course.recordedDoses++;
      vaccineStats.totalRecordedDoses++;

      if (imm.status === 'completed') {
        course.completedDoseNumbers.add(Number(imm.dose_number || 1));
        vaccineStats.completedDoses++;
      } else {
        vaccineStats.pendingDoses++;
      }
    });

    Object.values(epiStatsByVaccine).forEach(data => {
      data.patientCourses.forEach(course => {
        data.totalCourses++;
        if (course.completedDoseNumbers.size >= data.requiredDoses) {
          data.completedCourses++;
        } else {
          data.pendingCourses++;
        }
      });
      data.completionRate = data.totalCourses > 0 ? Math.round((data.completedCourses / data.totalCourses) * 100) : 0;
      delete data.patientCourses;
    });

    const completedBiteCases = scopedBites.filter(b => b.treatment_status === 'completed').length;
    const activeBiteCases = scopedBites.filter(b => b.treatment_status !== 'completed').length;
    const biteStatsByAnimal = ANIMAL_GROUPS.reduce((acc, group) => {
      acc[group] = {
        total: 0,
        bitten: 0,
        scratched: 0,
        completed: 0,
        pending: 0,
        active: 0,
        activeShare: 0,
        treatmentRate: 0
      };
      return acc;
    }, {});

    scopedBites.forEach(bite => {
      const group = getAnimalGroup(bite.animal_type);
      const exposureType = getExposureType(bite);
      biteStatsByAnimal[group].total++;
      biteStatsByAnimal[group][exposureType]++;

      if (bite.treatment_status === 'completed') {
        biteStatsByAnimal[group].completed++;
      } else {
        biteStatsByAnimal[group].pending++;
        biteStatsByAnimal[group].active++;
      }
    });

    Object.values(biteStatsByAnimal).forEach(data => {
      data.treatmentRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
      data.activeShare = activeBiteCases > 0 ? Math.round((data.active / activeBiteCases) * 100) : 0;
    });

    // Group stats by Barangay
    const barangayStats = scopedPatients.reduce((acc, p) => {
      const barangayKey = normalizeBarangayName(p.barangay);
      const barangayLabel = barangayLabelByKey[barangayKey] || p.barangay || "Unknown";
      if (!acc[barangayLabel]) {
        acc[barangayLabel] = {
          count: 0,
          fullyImmunized: 0,
          totalDoses: 0,
          completedDoses: 0,
          population: communityPopulationByBarangay.get(barangayKey) || 0
        };
      }
      acc[barangayLabel].count++;

      const pImms = scopedImms.filter(i => i.patient_id === p.id && getEpiVaccineKey(i));
      acc[barangayLabel].totalDoses += pImms.length;
      acc[barangayLabel].completedDoses += pImms.filter(i => i.status === 'completed').length;

      const isFull = pImms.length > 0 && pImms.every(i => i.status === 'completed');
      if (isFull) acc[barangayLabel].fullyImmunized++;

      return acc;
    }, {});

    return {
      filterLabel: selectedBarangayFilter === "all" ? "Overall" : barangayLabelByKey[selectedBarangayFilter] || selectedBarangayFilter,
      totalPatients: scopedPatients.length,
      totalAnimalBiteCases: scopedBites.length,
      scopedPopulation,
      animalBiteIncidencePer1000: scopedPopulation > 0
        ? Math.round(((scopedBites.length / scopedPopulation) * 1000) * 100) / 100
        : 0,
      completedBiteCases,
      animalBiteTreatmentRate: Math.round((completedBiteCases / (scopedBites.length || 1)) * 100),
      activeBiteCases,
      activeBiteCaseRate: Math.round((activeBiteCases / (scopedBites.length || 1)) * 100),
      biteStatsByAnimal,
      totalVaccinations: Object.values(epiStatsByVaccine).reduce((sum, data) => sum + data.totalCourses, 0),
      completedVaccines: Object.values(epiStatsByVaccine).reduce((sum, data) => sum + data.completedCourses, 0),
      totalEpiRecordedDoses: Object.values(epiStatsByVaccine).reduce((sum, data) => sum + data.totalRecordedDoses, 0),
      completedEpiRecordedDoses: Object.values(epiStatsByVaccine).reduce((sum, data) => sum + data.completedDoses, 0),
      epiStatsByVaccine,
      dueToday: scopedImms.filter(i => i.scheduled_date === today && i.status !== 'completed').length,
      barangayStats
    };
  }, [globalStats, selectedBarangayFilter, barangayLabelByKey]);

  const censusBarangayScope = censusBarangayOptions.length === 1 ? `Barangay ${censusBarangayOptions[0].label}` : "all barangays";
  const overallEpiRate = Math.round((stats.completedEpiRecordedDoses / (stats.totalEpiRecordedDoses || 1)) * 100);
  const barangayFilterOptions = [{ key: "all", label: "Overall" }, ...censusBarangayOptions];
  const patientById = useMemo(() => {
    return (globalStats.patients || []).reduce((acc, patient) => {
      acc[patient.id] = patient;
      return acc;
    }, {});
  }, [globalStats.patients]);
  const activeBiteAlerts = useMemo(() => {
    return (globalStats.animalBites || [])
      .filter(bite => bite.treatment_status !== 'completed')
      .filter(bite => {
        if (selectedBarangayFilter === "all") return true;
        return normalizeBarangayName(patientById[bite.patient_id]?.barangay) === selectedBarangayFilter;
      })
      .slice(0, 5);
  }, [globalStats.animalBites, patientById, selectedBarangayFilter]);
  const registryAnimalBiteActive = useMemo(() => {
    const sorted = [...animalBites]
      .filter(b => b.treatment_status !== 'completed')
      .sort((a, b) => new Date(b.incident_date) - new Date(a.incident_date));
    const seenPatients = new Set();
    return sorted.filter((bite) => {
      if (!bite.patient_id) return true;
      if (seenPatients.has(bite.patient_id)) return false;
      seenPatients.add(bite.patient_id);
      return true;
    }).map(bite => {
      const patientArvDoses = immunizations.filter(i => 
        i.patient_id === bite.patient_id && 
        isAntiRabiesImmunization(i) && 
        i.status !== 'completed'
      ).sort((a, b) => new Date(a.scheduled_date || "2999-12-31") - new Date(b.scheduled_date || "2999-12-31"));
      
      return {
        ...bite,
        next_due_dose: patientArvDoses[0] || null
      };
    });
  }, [animalBites, immunizations]);
  const registryAnimalBiteHistory = useMemo(() => {
    return [...animalBites]
      .sort((a, b) => new Date(b.incident_date) - new Date(a.incident_date))
      .slice(0, 12);
  }, [animalBites]);
  const registryEpiActive = useMemo(() => {
    const pending = [...immunizations]
      .filter((i) => !isAntiRabiesImmunization(i))
      .filter(i => i.status !== 'completed')
      .sort((a, b) => new Date(a.scheduled_date || "2999-12-31") - new Date(b.scheduled_date || "2999-12-31"));

    const grouped = pending.reduce((acc, imm) => {
      const key = imm.patient_id || `unknown-${imm.id}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(imm);
      return acc;
    }, {});

    return Object.values(grouped)
      .map((entries) => {
        const ordered = [...entries].sort((a, b) => new Date(a.scheduled_date || "2999-12-31") - new Date(b.scheduled_date || "2999-12-31"));
        const nextDue = ordered[0];
        return {
          patient_id: nextDue.patient_id,
          patient_name: nextDue.patients?.full_name || patientById[nextDue.patient_id]?.full_name || "Unknown Patient",
          next_due: nextDue,
          pending_count: ordered.length,
          pending_items: ordered
        };
      })
      .sort((a, b) => a.patient_name.localeCompare(b.patient_name));
  }, [immunizations, patientById]);
  const registryEpiHistory = useMemo(() => {
    return [...immunizations]
      .filter((i) => !isAntiRabiesImmunization(i))
      .filter(i => i.status === 'completed')
      .sort((a, b) => new Date(b.administered_date || b.scheduled_date) - new Date(a.administered_date || a.scheduled_date))
      .slice(0, 12);
  }, [immunizations]);
  const selectedHistoryPatient = useMemo(
    () => patients.find(p => p.id === selectedHistoryPatientId) || null,
    [patients, selectedHistoryPatientId]
  );
  const selectedPatientImmunizationHistory = useMemo(() => {
    if (!selectedHistoryPatientId) return [];
    return [...immunizations]
      .filter(i => i.patient_id === selectedHistoryPatientId && !isAntiRabiesImmunization(i))
      .sort((a, b) => new Date(b.administered_date || b.scheduled_date) - new Date(a.administered_date || a.scheduled_date));
  }, [immunizations, selectedHistoryPatientId]);
  const selectedPatientBiteHistory = useMemo(() => {
    if (!selectedHistoryPatientId) return [];
    return [...animalBites]
      .filter(b => b.patient_id === selectedHistoryPatientId)
      .sort((a, b) => new Date(b.incident_date) - new Date(a.incident_date));
  }, [animalBites, selectedHistoryPatientId]);
  const selectedRegistryEpiHistoryPatient = useMemo(
    () => patients.find(p => p.id === selectedRegistryEpiHistoryPatientId) || null,
    [patients, selectedRegistryEpiHistoryPatientId]
  );
  const selectedRegistryBiteHistoryPatient = useMemo(
    () => patients.find(p => p.id === selectedRegistryBiteHistoryPatientId) || null,
    [patients, selectedRegistryBiteHistoryPatientId]
  );
  const selectedRegistryRecentDoses = useMemo(() => {
    if (!selectedRegistryEpiHistoryPatientId) return [];
    return [...immunizations]
      .filter((i) => !isAntiRabiesImmunization(i))
      .filter(i => i.patient_id === selectedRegistryEpiHistoryPatientId)
      .sort((a, b) => new Date(b.administered_date || b.scheduled_date) - new Date(a.administered_date || a.scheduled_date))
      .slice(0, 8);
  }, [immunizations, selectedRegistryEpiHistoryPatientId]);
  const selectedRegistryVaccineCard = useMemo(() => {
    if (!selectedRegistryEpiHistoryPatientId) return [];
    const patientImms = immunizations.filter(
      i => i.patient_id === selectedRegistryEpiHistoryPatientId && !isAntiRabiesImmunization(i)
    );
    return EPI_VACCINE_GROUPS.map(vaccine => {
      const vaccineImms = patientImms
        .filter(imm => getEpiVaccineKey(imm) === vaccine.key)
        .sort((a, b) => Number(a.dose_number || 1) - Number(b.dose_number || 1));
      const doses = [];
      for (let d = 1; d <= vaccine.requiredDoses; d++) {
        const record = vaccineImms.find(imm => Number(imm.dose_number || 1) === d);
        doses.push({
          doseNumber: d,
          date: record ? (record.administered_date || record.scheduled_date || "") : "",
          status: record ? record.status : null,
          record
        });
      }
      const allCompleted = doses.length > 0 && doses.every(d => d.status === 'completed');
      const hasAnyRecord = doses.some(d => d.record);
      const remarks = !hasAnyRecord ? "—" : allCompleted ? "Accomplished" : "Pending";
      return { ...vaccine, doses, remarks, allCompleted, hasAnyRecord };
    });
  }, [immunizations, selectedRegistryEpiHistoryPatientId]);

  const filteredPatients = useMemo(() => {
    if (!registrySearch) return patients;
    const s = registrySearch.toLowerCase();
    return patients.filter(p => 
      p.full_name?.toLowerCase().includes(s) || 
      p.barangay?.toLowerCase().includes(s) ||
      p.contact_number?.includes(s)
    );
  }, [patients, registrySearch]);

  const totalRegistryPages = Math.ceil(filteredPatients.length / registryItemsPerPage);
  const paginatedPatients = useMemo(() => {
    const start = (registryPage - 1) * registryItemsPerPage;
    return filteredPatients.slice(start, start + registryItemsPerPage);
  }, [filteredPatients, registryPage, registryItemsPerPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setRegistryPage(1);
  }, [registrySearch]);

  const selectedRegistryBiteRecords = useMemo(() => {
    if (!selectedRegistryBiteHistoryPatientId) return [];
    const patientBites = animalBites.filter((b) => b.patient_id === selectedRegistryBiteHistoryPatientId);
    const patientImms = immunizations.filter((imm) => imm.patient_id === selectedRegistryBiteHistoryPatientId);

    return patientBites.map(bite => {
      // Link immunizations that were created for this bite case
      const relatedImms = patientImms.filter(imm => 
        imm.notes?.includes(`Bite Case #${bite.id.slice(0, 5)}`)
      );
      return { ...bite, relatedImms };
    }).sort((a, b) => new Date(b.incident_date || "1900-01-01") - new Date(a.incident_date || "1900-01-01"))
      .slice(0, 12);
  }, [animalBites, immunizations, selectedRegistryBiteHistoryPatientId]);
  const todayISO = new Date().toLocaleDateString('en-CA');
  const reminderItems = useMemo(() => {
    const todayDate = new Date(todayISO);
    return [...immunizations]
      .filter(imm => imm.status !== "completed" && imm.scheduled_date)
      .map(imm => {
        const scheduledDate = new Date(imm.scheduled_date);
        // Normalize both to midnight for accurate day difference
        const diffTime = scheduledDate.getTime() - todayDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        return { imm, diffDays };
      })
      .filter(({ diffDays }) => diffDays <= 7)
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 12)
      .map(({ imm, diffDays }) => ({
        id: imm.id,
        patient_id: imm.patient_id,
        level: diffDays < 0 ? "overdue" : "upcoming",
        title: patientById[imm.patient_id]?.full_name || "Unknown Patient",
        subtitle: `${imm.vaccine_name} (Dose ${imm.dose_number}) • ${diffDays < 0 ? `${Math.abs(diffDays)} day(s) overdue` : diffDays === 0 ? "due today" : `due in ${diffDays} day(s)`}`,
        dateLabel: imm.scheduled_date
      }));
  }, [immunizations, patientById, todayISO]);
  const dueTodayReminderItems = useMemo(() => {
    // Include both overdue and due today items in the "Send Reminders" list
    return reminderItems.filter((r) => r.dateLabel <= todayISO);
  }, [reminderItems, todayISO]);
  const dueTodayPatients = useMemo(() => {
    const byPatient = new Map();
    dueTodayReminderItems.forEach((item) => {
      const pid = item.patient_id || "unknown";
      if (!byPatient.has(pid)) {
        const p = patientById[item.patient_id] || {};
        byPatient.set(pid, {
          patient_id: item.patient_id,
          name: item.title,
          contact_number: p.contact_number || "",
          items: []
        });
      }
      byPatient.get(pid).items.push(item);
    });
    return [...byPatient.values()].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [dueTodayReminderItems, patientById]);
  const sendRemindersStorageKey = `immunoroster_reminders_sent_${todayISO}`;
  const alreadySentRemindersToday = useMemo(() => {
    try {
      return localStorage.getItem(sendRemindersStorageKey) === "1";
    } catch {
      return false;
    }
  }, [sendRemindersStorageKey]);
  const notificationCount = reminderItems.filter(r => r.level === "overdue").length || reminderItems.length;
  const patientAge = getAgeFromDateOfBirth(patientForm.date_of_birth);
  const isMinorPatient = patientAge !== null && patientAge < 18;
  const epiSelectedKey = getEpiVaccineKey({ vaccine_name: epiForm.vaccine_name });
  const epiDoseGuide = epiSelectedKey ? EPI_INTERVAL_LABEL_BY_VACCINE_KEY[epiSelectedKey] : "";
  const epiMaxDoses = epiSelectedKey ? (EPI_MAX_DOSES_BY_VACCINE_KEY[epiSelectedKey] || 1) : 1;

  function handleNotificationClick(item) {
    setShowHeaderNotifications(false);
    setActiveTab("registry");
    if (item?.patient_id) {
      setHistoryTab('treatment');
      setSelectedRegistryEpiHistoryPatientId(item.patient_id);
    }
  }

  async function markImmunizationDone(id, currentNotes = "") {
    try {
      setLoading(true);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      
      let newNotes = currentNotes || "";
      if (!newNotes.includes("[Done at")) {
        newNotes = newNotes ? `${newNotes} [Done at ${timeStr}]` : `[Done at ${timeStr}]`;
      }

      await updateImmunization(id, { 
        status: 'completed', 
        administered_date: now.toISOString().split('T')[0],
        notes: newNotes
      });
      await loadAllData();
      setToast({ type: 'success', message: 'Dose marked as accomplished.' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function markBiteDoseDone(biteId, doseImmId) {
    try {
      setLoading(true);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      
      const imm = immunizations.find(i => i.id === doseImmId);
      const currentNotes = imm?.notes || "";
      let newNotes = currentNotes;
      if (!currentNotes.includes("[Done at")) {
        newNotes = currentNotes ? `${currentNotes} [Done at ${timeStr}]` : `[Done at ${timeStr}]`;
      }

      // 1. Mark immunization as completed
      await updateImmunization(doseImmId, { 
        status: 'completed', 
        administered_date: now.toISOString().split('T')[0],
        notes: newNotes
      });
      
      // 2. Increment doses_administered in animal_bites
      const bite = animalBites.find(b => b.id === biteId);
      if (bite) {
        const newCount = (bite.doses_administered || 0) + 1;
        const isFinished = newCount >= bite.total_required_doses;
        await updateAnimalBite(biteId, { 
          doses_administered: newCount,
          treatment_status: isFinished ? 'completed' : bite.treatment_status
        });
      }
      
      await loadAllData();
      setToast({ type: 'success', message: 'Dose marked as accomplished.' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openConfirmDialog({
    title = "Confirm delete",
    message = "Are you sure you want to delete this item?",
    confirmText = "Delete",
    cancelText = "Cancel",
    onConfirm
  }) {
    setConfirmDialog({ title, message, confirmText, cancelText, onConfirm });
  }

  async function handleSendReminders() {
    if (sendingReminders) return;
    if (alreadySentRemindersToday) {
      setToast({ type: "info", message: "Reminders already sent today." });
      return;
    }
    if (dueTodayPatients.length === 0) {
      setToast({ type: "info", message: "No patients due today." });
      return;
    }

    setSendingReminders(true);
    try {
      // NOTE: Without an SMS API/provider, we can only "record" sending in the app.
      // If/when you add an SMS endpoint, call it here with dueTodayPatients payload.
      localStorage.setItem(sendRemindersStorageKey, "1");
      setShowSendReminders(false);
      setToast({ type: "success", message: `Reminders successfully sent to ${dueTodayPatients.length} patient(s).` });
    } catch (err) {
      setError(err?.message || "Failed to send reminders.");
    } finally {
      setSendingReminders(false);
    }
  }

  if (!adminUser) {
    return (
      <main className="layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <section className="card" style={{ width: '100%', maxWidth: '400px' }}>
          <header style={{ flexDirection: 'column', textAlign: 'center', marginBottom: '2rem' }}>
            <h1>ImmunoRoster</h1>
            <h2>{isSignup ? "Create Nurse Account" : "Medical Staff Login"}</h2>
          </header>
          {error && <div className="error-toast">{error}</div>}
          <form className="login-form" onSubmit={handleLogin}>
            {isSignup && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>First Name</label>
                  <input name="firstname" placeholder="First Name" required />
                </div>
                <div className="input-group">
                  <label>Last Name</label>
                  <input name="lastname" placeholder="Last Name" required />
                </div>
              </div>
            )}
            {isSignup && (
              <div className="input-group">
                <label>Username</label>
                <input name="username" placeholder="nurse_user" required />
              </div>
            )}
            <div className="input-group">
              <label>Email Address</label>
              <input name="email" type="email" placeholder="nurse@immunoroster.local" required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input name="password" type="password" placeholder="••••••••" required />
            </div>
            {isSignup && (
              <div className="input-group">
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Shift Assignment
                  <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>Current: {getCurrentShift()}</span>
                </label>
                <div style={{ padding: '0.8rem', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.9rem', color: '#475569' }}>
                  Your account will be automatically assigned to the <strong>{getCurrentShift()} Shift</strong> based on the current time.
                </div>
              </div>
            )}
            <button className="primary" style={{ marginTop: '1rem', width: '100%' }}>{isSignup ? "Register Account" : "Sign In"}</button>
            <button type="button" className="secondary" style={{ marginTop: '0.5rem', width: '100%', border: 'none' }} onClick={() => setIsSignup(!isSignup)}>
              {isSignup ? "Already have an account? Login" : "New nurse? Create account"}
            </button>
            <button type="button" className="secondary" style={{ marginTop: '2rem', width: '100%', fontSize: '0.8rem', opacity: 0.6 }} onClick={() => { localStorage.clear(); window.location.reload(); }}>Clear Session & Reset</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="layout">
      <header className="app-header">
        <div className="header-main">
          <h1>🛡️ ImmunoRoster</h1>
          <div className="header-greeting">
            <span className="user-name-hero">Hi, Nurse {adminUser.full_name?.split(' ')[0] || 'Staff'}! 👋</span>
          </div>
        </div>
        <div className="header-actions">
          <div className="notif-wrap">
            <button type="button" className="notif-btn" onClick={() => setShowHeaderNotifications(prev => !prev)} aria-label="Open reminders">
              <span className="notif-icon">🔔</span>
              {notificationCount > 0 && <span className="notif-count">{notificationCount}</span>}
            </button>
            {showHeaderNotifications && (
              <div className="notif-dropdown">
                <div className="notif-head">
                  <strong>Notifications</strong>
                  <span>{reminderItems.length} reminders</span>
                </div>
                <div className="notif-list">
                  {reminderItems.map(item => (
                    <button key={item.id} type="button" className={`notif-item notif-${item.level}`} onClick={() => handleNotificationClick(item)}>
                      <div>
                        <div className="notif-title">{item.title}</div>
                        <div className="notif-sub">{item.subtitle}</div>
                      </div>
                      <div className="notif-date">{item.dateLabel}</div>
                    </button>
                  ))}
                  {reminderItems.length === 0 && <div className="notif-empty">No upcoming reminders in the next 7 days.</div>}
                </div>
              </div>
            )}
          </div>
          <div className="notif-wrap">
            <button
              type="button"
              className="notif-btn"
              onClick={() => {
                setShowHeaderNotifications(false);
                setShowSendReminders((prev) => !prev);
              }}
              aria-label="Send reminders"
              title="Send reminders (due today)"
            >
              <span className="notif-icon">📩</span>
              {dueTodayPatients.length > 0 && <span className="notif-count">{dueTodayPatients.length}</span>}
            </button>
            {showSendReminders && (
              <div className="notif-dropdown">
                <div className="notif-head">
                  <strong>Send Reminders</strong>
                  <span>{dueTodayPatients.length} patient(s) due</span>
                </div>
                <div className="notif-list">
                   {dueTodayPatients.map(p => (
                     <div key={p.patient_id} className="notif-item">
                        <div>
                          <div className="notif-title">{p.name}</div>
                          <div className="notif-sub">{p.items.length} dose(s) due • {p.contact_number || "No number"}</div>
                        </div>
                     </div>
                   ))}
                   {dueTodayPatients.length === 0 && <div className="notif-empty">No patients due for reminders today.</div>}
                </div>
                <div style={{ padding: '0.8rem', borderTop: '1px solid var(--border)' }}>
                   <button 
                     className="primary" 
                     style={{ width: '100%' }} 
                     onClick={handleSendReminders}
                     disabled={sendingReminders || alreadySentRemindersToday || dueTodayPatients.length === 0}
                   >
                     {sendingReminders ? "Sending..." : alreadySentRemindersToday ? "Reminders Sent Today" : "Send Automated SMS Reminders"}
                   </button>
                </div>
              </div>
            )}
          </div>
          <div className="notif-wrap">
            <button 
              type="button" 
              className="nurse-profile-mini" 
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowHeaderNotifications(false);
                setShowSendReminders(false);
              }}
              aria-label="User menu"
            >
              <div className={`shift-indicator shift-${adminUser.shift?.toLowerCase() || 'am'}`} title={`${adminUser.shift} Shift`}>
                {adminUser.shift?.charAt(0) || 'A'}
              </div>
              <div className="nurse-avatar">
                {adminUser.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "RN"}
              </div>
            </button>

            {showProfileMenu && (
              <div className="notif-dropdown profile-dropdown">
                <div className="notif-head">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong>Nurse {adminUser.full_name}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{adminUser.email}</span>
                  </div>
                </div>
                <div className="notif-list" style={{ padding: '0.5rem' }}>
                  <div className="profile-menu-info">
                    <span className="nurse-shift-label">Current Duty</span>
                    <span className={`badge shift-${adminUser.shift?.toLowerCase() || 'am'}`} style={{ padding: '0.2rem 0.5rem' }}>
                      {adminUser.shift} Shift
                    </span>
                  </div>
                  <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                  <button 
                    className="secondary" 
                    style={{ width: '100%', justifyContent: 'center', border: 'none', marginBottom: '0.5rem' }} 
                    onClick={() => {
                      const nameParts = (adminUser.full_name || "").split(" ");
                      const firstName = nameParts[0] || "";
                      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
                      setEditProfileForm({
                        first_name: firstName,
                        last_name: lastName,
                        username: adminUser.username || "",
                        email: adminUser.email,
                        password: "",
                        shift: adminUser.shift
                      });
                      setIsEditingProfile(true);
                      setShowProfileMenu(false);
                    }}
                  >
                    ✏️ Edit Profile
                  </button>
                  <button className="secondary" style={{ width: '100%', justifyContent: 'center', border: 'none' }} onClick={handleLogout}>
                    🚪 Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="nav-tabs">
        <button className={`nav-tab ${activeTab === 'census' ? 'active' : ''}`} onClick={() => setActiveTab('census')}>📊 Census Summary</button>
        <button className={`nav-tab ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>👤 Patient Registration</button>
        <button className={`nav-tab ${activeTab === 'registry' ? 'active' : ''}`} onClick={() => setActiveTab('registry')}>📋 Registries</button>
      </nav>

      {error && <div className="error-toast" onClick={() => setError("")}>{error}</div>}
      {toast && (
        <div
          className="error-toast"
          onClick={() => setToast(null)}
          style={{
            background: toast.type === "success" ? "#dcfce7" : toast.type === "info" ? "#dbeafe" : undefined,
            borderColor: toast.type === "success" ? "#22c55e" : toast.type === "info" ? "#3b82f6" : undefined,
            color: toast.type === "success" ? "#166534" : toast.type === "info" ? "#1e40af" : undefined
          }}
        >
{toast.message}
        </div>
      )}

      {activeTab === 'census' && (
        <section className="census-modern">
          <div className="census-intro" style={{ maxWidth: '800px', margin: '0 auto 1.5rem', textAlign: 'center', justifyContent: 'center' }}>
            This section presents the barangay trends and cumulative reported cases of selected vaccine-preventable diseases (VPDs) and animal bite incidents in {censusBarangayScope} up to the year {new Date().getFullYear()}.
          </div>

          <div className="barangay-filter-bar">
            {barangayFilterOptions.map(barangay => (
              <button
                type="button"
                key={barangay.key}
                className={`filter-chip ${selectedBarangayFilter === barangay.key ? 'active' : ''}`}
                onClick={() => setSelectedBarangayFilter(barangay.key)}
              >
                {barangay.label}
              </button>
            ))}
          </div>

          <div className="census-highlights">
            <button
              type="button"
              className={`metric-card metric-card-button bite-metric ${showBiteDetails ? 'active' : ''}`}
              onClick={() => setShowBiteDetails(!showBiteDetails)}
            >
              <div className="metric-icon bite-icon">AB</div>
              <div className="metric-content">
                <span className="stat-value" style={{ color: '#166534' }}>{stats.animalBiteTreatmentRate}%</span>
                <span className="stat-label">Overall Animal Bite Treatment Rate</span>
                <span className="metric-subvalue">{stats.filterLabel}</span>
                <span className="metric-subvalue">
                  {stats.completedBiteCases} out of {stats.totalAnimalBiteCases} recorded treatment completed
                </span>
              </div>
            </button>
            <button
              type="button"
              className={`metric-card metric-card-button epi-metric ${showEpiDetails ? 'active' : ''}`}
              onClick={() => setShowEpiDetails(!showEpiDetails)}
            >
              <div className="metric-icon epi-icon">%</div>
              <div className="metric-content">
                <span className="stat-value">{overallEpiRate}%</span>
                <span className="stat-label">Overall EPI Rate</span>
                <span className="metric-subvalue">{stats.filterLabel}</span>
                <span className="metric-subvalue">
                  {stats.completedEpiRecordedDoses} of {stats.totalEpiRecordedDoses} recorded doses completed
                </span>
              </div>
            </button>
          </div>

          {showBiteDetails && (
            <div className="module-panel module-panel-bite bite-details-panel">
              <div className="module-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: '0.2rem' }}>Animal Bite Module</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Exposure, treatment status, and active case distribution</span>
                </div>
                <button type="button" className="secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowBiteDetails(false)}>
                  ✕ Close
                </button>
              </div>
              <div className="bite-module-section">
                <div className="bite-module-heading">
                  <h3>Animal Exposure Breakdown</h3>
                  <span>Bitten vs scratched cases per animal</span>
                </div>
                <div className="bite-breakdown">
                  {ANIMAL_GROUPS.map(group => {
                    const data = stats.biteStatsByAnimal[group];
                    return (
                      <div className="bite-breakdown-card" key={`exposure-${group}`}>
                        <div className="bite-breakdown-header">
                          <div>
                            <h3>{group}</h3>
                            <span>{data.total} cases</span>
                          </div>
                          <strong>{stats.totalAnimalBiteCases > 0 ? Math.round((data.total / stats.totalAnimalBiteCases) * 100) : 0}%</strong>
                        </div>
                        <div className="bite-stat-row">
                          <span>Bitten</span>
                          <strong>{data.bitten}</strong>
                        </div>
                        <div className="bite-stat-row">
                          <span>Scratched</span>
                          <strong>{data.scratched}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bite-module-section">
                <div className="active-bite-summary treatment-summary">
                  <div>
                    <span className="stat-value">{stats.animalBiteTreatmentRate}%</span>
                    <span className="stat-label">Overall Treatment Rate</span>
                  </div>
                  <strong>{stats.completedBiteCases} / {stats.totalAnimalBiteCases}</strong>
                </div>
                <div className="bite-breakdown">
                  {ANIMAL_GROUPS.map(group => {
                    const data = stats.biteStatsByAnimal[group];
                    return (
                      <div className="bite-breakdown-card" key={`treatment-${group}`}>
                        <div className="bite-breakdown-header">
                          <div>
                            <h3>{group}</h3>
                            <span>Treatment status</span>
                          </div>
                          <strong>{data.treatmentRate}%</strong>
                        </div>
                        <div className="bite-stat-row">
                          <span>Completed</span>
                          <strong>{data.completed}</strong>
                        </div>
                        <div className="bite-stat-row">
                          <span>Pending</span>
                          <strong>{data.pending}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bite-module-section">
                <div className="active-bite-summary active-case-summary">
                  <div>
                    <span className="stat-value">{stats.activeBiteCases}</span>
                    <span className="stat-label">Active Bite Cases</span>
                  </div>
                  <strong>{stats.activeBiteCaseRate}%</strong>
                </div>

                <div className="bite-breakdown">
                  {ANIMAL_GROUPS.map(group => {
                    const data = stats.biteStatsByAnimal[group];
                    return (
                      <div className="bite-breakdown-card" key={`active-${group}`}>
                        <div className="bite-breakdown-header">
                          <div>
                            <h3>{group}</h3>
                            <span>Active cases</span>
                          </div>
                          <strong>{data.activeShare}%</strong>
                        </div>
                        <div className="bite-stat-row bite-stat-row-highlight">
                          <span>Active Share</span>
                          <strong>{data.active} ({data.activeShare}%)</strong>
                        </div>
                        <div className="bite-stat-row">
                          <span>Pending</span>
                          <strong>{data.pending}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {showEpiDetails && (
            <div className="module-panel module-panel-epi epi-details-panel">
              <div className="module-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: '0.2rem' }}>EPI Module</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Single-dose and multi-dose vaccine course completion</span>
                </div>
                <button type="button" className="secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowEpiDetails(false)}>
                  ✕ Close
                </button>
              </div>
              <div className="epi-overview-panel">
                <h3>Expanded Program on Immunization</h3>
                <p>
                  This view tracks vaccine completion by patient course. Multi-dose vaccines are marked completed only when all required doses are completed; otherwise the patient remains pending for that vaccine.
                </p>
              </div>

              {[
                ["single", "Single Dose Vaccines"],
                ["multi", "Multi-Dose Vaccines"]
              ].map(([groupKey, groupLabel]) => (
                <div className="epi-section" key={groupKey}>
                  <h3>{groupLabel}</h3>
                  <div className="epi-table">
                    <div className="epi-table-row epi-table-head">
                      <span>Vaccine Name</span>
                      <span>Minimum Age</span>
                      <span>Doses</span>
                      <span>Interval</span>
                      <span>Immunized</span>
                      <span>Pending</span>
                      <span>Rate</span>
                    </div>
                    {EPI_VACCINE_GROUPS.filter(vaccine => vaccine.group === groupKey).map(vaccine => {
                      const data = stats.epiStatsByVaccine[vaccine.key];
                      return (
                        <details className="epi-table-row epi-vaccine-row" key={vaccine.key}>
                          <summary>
                            <span className="epi-vaccine-name">{data.label}</span>
                            <span>{data.minimumAge}</span>
                            <span>{data.requiredDoses}</span>
                            <span>{data.minimumInterval}</span>
                            <span className="epi-completed">{data.completedCourses} / {data.totalCourses}</span>
                            <span className="epi-pending">{data.pendingCourses}</span>
                            <span className="epi-rate">{data.completionRate}%</span>
                          </summary>
                          <p>{data.description}</p>
                          <div className="epi-dose-detail">
                            <span>Recorded completed doses: {data.completedDoses}</span>
                            <span>Recorded pending doses: {data.pendingDoses}</span>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card" style={{ margin: 0 }}>
              <h2>🏘️ Barangay Statistics</h2>
              <div className="barangay-summary">
                <div className="summary-card summary-card-patients">
                  <span className="stat-value">{stats.totalPatients}</span>
                  <span className="stat-label">Total Registered Patients</span>
                </div>
                <div className="summary-card summary-card-bites">
                  <span className="stat-value">{stats.activeBiteCases}</span>
                  <span className="stat-label">Active Bite Cases</span>
                </div>
                <div className="summary-card summary-card-due">
                  <span className="stat-value">{stats.dueToday}</span>
                  <span className="stat-label">Due Today</span>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '0.5rem' }}>Barangay</th>
                    <th style={{ padding: '0.5rem' }}>Coverage</th>
                    <th style={{ padding: '0.5rem' }}>EPI Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.barangayStats).map(([name, data]) => {
                    const regCoverage = data.population ? Math.round((data.count / data.population) * 100) : null;
                    const doseProgress = data.totalDoses > 0 ? Math.round((data.completedDoses / data.totalDoses) * 100) : 0;
                    return (
                      <tr key={name} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <div style={{ fontWeight: 700 }}>{name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pop: {data.population || 'N/A'}</div>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <span style={{ fontSize: '0.9rem' }}>{data.count} ({regCoverage !== null ? `${regCoverage}%` : 'N/A'})</span>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, width: '60px', height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${doseProgress}%`, height: '100%', background: 'var(--primary)' }}></div>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{doseProgress}%</span>
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{data.fullyImmunized} Fully Immunized</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {false && (
              <div className="card">
                <h2>🐕 Active Bite Cases</h2>
                <ul className="data-list">
                  {globalStats.animalBites
                    .filter(b => b.treatment_status !== 'completed')
                    .slice(0, 5)
                    .map(bite => (
                      <li key={bite.id} className="data-item">
                        <div className="data-main">
                          <span className="data-title">{globalStats.patients.find(p => p.id === bite.patient_id)?.full_name || 'Loading...'}</span>
                          <span className="data-sub">{bite.animal_type} bite • Status: {bite.treatment_status}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`badge badge-${bite.treatment_status}`}>{bite.treatment_status}</span>
                        </div>
                      </li>
                    ))
                  }
                  {globalStats.animalBites.filter(b => b.treatment_status !== 'completed').length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No active bite cases.</p>}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'patients' && (
        <div className="patients-layout">
          <section ref={formRef} className="card" style={{ margin: 0 }}>
            <h2>{editingId ? "Edit Profile & Clinical Log" : "Register Patient"}</h2>
            <form onSubmit={savePatient} className="form-grid">
              <div className="input-group activity-selector">
                <label>Choose Log Module</label>
                <div className="activity-options">
                  <button
                    type="button"
                    className={`activity-choice ${logType === 'bite' ? 'active' : ''}`}
                    onClick={() => setLogType('bite')}
                  >
                    <span className="activity-choice-icon">AB</span>
                    <span className="activity-choice-text">Animal Bite Log</span>
                  </button>
                  <button
                    type="button"
                    className={`activity-choice ${logType === 'epi' ? 'active' : ''}`}
                    onClick={() => setLogType('epi')}
                  >
                    <span className="activity-choice-icon">EPI</span>
                    <span className="activity-choice-text">EPI Immunization</span>
                  </button>
                </div>
                {logType !== 'bite' && logType !== 'epi' && (
                  <div className="consent-hint">Click one icon to open its fill-up form.</div>
                )}
              </div>

              {logType === 'bite' && (
                <div className="clinical-panel clinical-panel-bite">
                  <h3 style={{ marginBottom: "0.75rem" }}>Animal Bite Treatment Center Intake Form</h3>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Registration No.</label>
                      <input name="registrationNo" />
                    </div>
                    <div className="input-group">
                      <label>Date Registered</label>
                      <input type="date" name="dateRegistered" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Name</label>
                      <input value={patientForm.full_name} onChange={e => setPatientForm({ ...patientForm, full_name: e.target.value })} required />
                    </div>
                    <div className="input-group">
                      <label>Sex</label>
                      <select value={patientForm.sex} onChange={e => setPatientForm({ ...patientForm, sex: e.target.value })} required>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Phone Number (for reminders)</label>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span style={{ padding: "0.55rem 0.75rem", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--panel)" }}>+63</span>
                        <input
                          value={patientPhoneLocal}
                          onChange={(e) => {
                            const local = String(e.target.value || "").replace(/\D/g, "").slice(0, 10);
                            setPatientPhoneLocal(local);
                            setPatientForm({ ...patientForm, contact_number: local ? `+63${local}` : "" });
                          }}
                          placeholder="9XXXXXXXXX"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Address</label>
                      <input value={patientForm.address || ""} onChange={e => setPatientForm({ ...patientForm, address: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label>Barangay</label>
                      <input
                        list="barangay-list"
                        value={patientForm.barangay}
                        onChange={e => setPatientForm({ ...patientForm, barangay: e.target.value })}
                        placeholder="Select or type new..."
                      />
                      <datalist id="barangay-list">
                        {Array.from(new Set([
                          ...globalStats.patients.map(p => p.barangay),
                          ...globalStats.community.map(c => c.barangay)
                        ])).filter(Boolean).sort().map(b => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Date of Birth</label>
                      <input
                        type="date"
                        value={patientForm.date_of_birth || ""}
                        onChange={e => setPatientForm({ ...patientForm, date_of_birth: e.target.value })}
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label>Age</label>
                      <input value={patientAge ?? ""} readOnly />
                    </div>
                  </div>
                  <h4 style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>History of Exposure</h4>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Date of Exposure</label>
                      <input type="date" name="dateOfExposure" value={biteDateOfExposure} onChange={e => setBiteDateOfExposure(e.target.value)} required />
                    </div>
                    <div className="input-group">
                      <label>Place of Exposure</label>
                      <input name="placeOfExposure" placeholder="e.g., Barangay road/home" />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Source of Exposure</label>
                      <select name="animal" value={biteAnimalType} onChange={e => setBiteAnimalType(e.target.value)} required>
                        <option value="Dog">Dog</option>
                        <option value="Cat">Cat</option>
                        <option value="Rat">Rat</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Type of Exposure</label>
                      <select name="typeOfExposure" required>
                        <option value="Bitten">Bitten</option>
                        <option value="Scratched">Scratched</option>
                        <option value="Licked on broken skin">Licked on broken skin</option>
                      </select>
                    </div>
                  </div>
                  {biteAnimalType === "Other" && (
                    <div className="input-group">
                      <label>Specify Animal</label>
                      <input name="otherAnimal" placeholder="Type animal name" required />
                    </div>
                  )}
                  <div className="input-row">
                    <div className="input-group">
                      <label>Animal Status after 14 Days</label>
                      <input name="animalStatus14Days" placeholder="Alive/Dead/Unknown" />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Category of Exposure</label>
                      <select name="categoryOfExposure" defaultValue="3">
                        {EXPOSURE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Treatment Protocol</label>
                      <select name="protocol" value={biteProtocol} onChange={e => setBiteProtocol(e.target.value)} required>
                        {Object.keys(BITE_PROTOCOLS).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Site of Exposure</label>
                    <input name="siteOfExposure" placeholder="e.g., left foot, right hand" />
                  </div>
                  <div className="input-group">
                    <label>Post-Exposure Prophylaxis</label>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <label className="radio-label"><input type="checkbox" name="woundWashingDone" defaultChecked /> A. Washing of Bite Wound</label>
                      <label className="radio-label">
                        <input
                          type="checkbox"
                          name="rigGiven"
                          checked={biteRigGiven}
                          onChange={(e) => setBiteRigGiven(e.target.checked)}
                        /> B. RIG
                      </label>
                      <label className="radio-label"><input type="checkbox" name="arvGiven" defaultChecked /> C. Anti-Rabies Vaccine</label>
                    </div>
                  </div>

                  {biteRigGiven && (
                    <div className="clinical-panel" style={{ background: '#eff6ff', borderColor: '#3b82f6', borderLeftWidth: '4px' }}>
                      <h4 style={{ marginBottom: "0.8rem", color: '#1d4ed8' }}>Rabies Immunoglobulin (RIG) Details</h4>
                      <div className="input-row">
                        <div className="input-group">
                          <label>RIG Type / Generic</label>
                          <select name="rigGenericName">
                            {RIG_GENERIC_NAMES.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="input-group">
                          <label>Date Administered</label>
                          <input type="date" name="rigDateGiven" defaultValue={new Date().toISOString().split('T')[0]} />
                        </div>
                      </div>
                      <div className="input-group">
                        <label>Site of Infiltration</label>
                        <input name="rigSiteOfInfiltration" placeholder="e.g. Around the bite site" defaultValue="Around the bite site" />
                      </div>
                    </div>
                  )}
                  <div className="input-row">
                    <div className="input-group">
                      <label>Vaccine Generic Name</label>
                      <select
                        name="vaccineGenericName"
                        value={biteVaccineGenericName}
                        onChange={(e) => {
                          const nextGeneric = e.target.value;
                          setBiteVaccineGenericName(nextGeneric);
                          setBiteVaccineBrandName(RABIES_VACCINE_BRAND_BY_GENERIC_NAME[nextGeneric] || "");
                        }}
                      >
                        {RABIES_VACCINE_GENERIC_NAMES.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Brand Name</label>
                      <select
                        name="vaccineBrandName"
                        value={biteVaccineBrandName}
                        onChange={(e) => {
                          const nextBrand = e.target.value;
                          setBiteVaccineBrandName(nextBrand);
                          setBiteVaccineGenericName(RABIES_VACCINE_GENERIC_BY_BRAND_NAME[nextBrand] || DEFAULT_BITE_VACCINE_GENERIC_NAME);
                        }}
                      >
                        {RABIES_VACCINE_BRAND_NAMES.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Route</label>
                    <select name="vaccineRoute" defaultValue="ID">
                      <option value="ID">ID</option>
                      <option value="IM">IM</option>
                    </select>
                  </div>
                  <div className="input-row">
                    {(BITE_PROTOCOLS[biteProtocol] || []).map((day) => (
                      <div className="input-group" key={`schedule-${day}`}>
                        <label>{`D${day}`}</label>
                        <input type="date" name={`scheduleD${day}`} value={biteSchedulePreview[`d${day}`] || ""} readOnly />
                      </div>
                    ))}
                  </div>
                  <div className="input-group consent-section">
                    <label>Consent for Treatment</label>
                    {isMinorPatient ? (
                      <>
                        <div className="input-row">
                          <div className="input-group">
                            <label>Parent/Guardian Name</label>
                            <input name="guardianName" required={isMinorPatient} />
                          </div>
                          <div className="input-group">
                            <label>Parent/Guardian Email</label>
                            <input type="email" name="guardianEmail" required={isMinorPatient} />
                          </div>
                        </div>
                        <div className="input-row">
                          <div className="input-group">
                            <label>Parent/Guardian Phone Number (for reminders)</label>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              <span style={{ padding: "0.55rem 0.75rem", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--panel)" }}>+63</span>
                              <input
                                name="guardianPhone"
                                value={guardianPhoneLocal}
                                onChange={(e) => setGuardianPhoneLocal(String(e.target.value || "").replace(/\D/g, "").slice(0, 10))}
                                placeholder="9XXXXXXXXX"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={10}
                                required={isMinorPatient}
                              />
                            </div>
                          </div>
                        </div>
                        <label className="radio-label">
                          <input type="checkbox" name="guardianConsent" required={isMinorPatient} />
                          {GUARDIAN_CONSENT_STATEMENT}
                        </label>
                      </>
                    ) : (
                      <label className="radio-label">
                        <input type="checkbox" name="adultConsent" />
                        {ADULT_CONSENT_STATEMENT}
                      </label>
                    )}
                    <div className="consent-hint">
                      {patientAge === null
                        ? "Set DOB to auto-detect if guardian consent is required."
                        : `Patient age detected: ${patientAge} (${isMinorPatient ? "Minor" : "Adult"})`}
                    </div>
                  </div>
                </div>
              )}

              {logType === 'epi' && (
                <div className="clinical-panel clinical-panel-epi">
                  <h3 style={{ marginBottom: "0.75rem" }}>EPI Immunization Intake Form</h3>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Full Name</label>
                      <input value={patientForm.full_name} onChange={e => setPatientForm({ ...patientForm, full_name: e.target.value })} required />
                    </div>
                    <div className="input-group">
                      <label>Sex</label>
                      <select value={patientForm.sex} onChange={e => setPatientForm({ ...patientForm, sex: e.target.value })}>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>DOB</label>
                      <input type="date" value={patientForm.date_of_birth} onChange={e => setPatientForm({ ...patientForm, date_of_birth: e.target.value })} required />
                    </div>
                    <div className="input-group">
                      <label>Place of Birth</label>
                      <input
                        value={patientForm.place_of_birth || ""}
                        onChange={e => setPatientForm({ ...patientForm, place_of_birth: e.target.value })}
                        placeholder="City / hospital"
                      />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Mother's Name</label>
                      <input
                        value={patientForm.mother_name || ""}
                        onChange={e => setPatientForm({ ...patientForm, mother_name: e.target.value })}
                      />
                    </div>
                    <div className="input-group">
                      <label>Father's Name</label>
                      <input
                        value={patientForm.father_name || ""}
                        onChange={e => setPatientForm({ ...patientForm, father_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Birth Height</label>
                      <input
                        value={patientForm.birth_height || ""}
                        onChange={e => setPatientForm({ ...patientForm, birth_height: e.target.value })}
                        placeholder="e.g., 50 cm"
                      />
                    </div>
                    <div className="input-group">
                      <label>Birth Weight</label>
                      <input
                        value={patientForm.birth_weight || ""}
                        onChange={e => setPatientForm({ ...patientForm, birth_weight: e.target.value })}
                        placeholder="e.g., 3.2 kg"
                      />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Address</label>
                      <input value={patientForm.address || ""} onChange={e => setPatientForm({ ...patientForm, address: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label>Barangay</label>
                      <input
                        list="barangay-list"
                        value={patientForm.barangay}
                        onChange={e => setPatientForm({ ...patientForm, barangay: e.target.value })}
                        placeholder="Select or type new..."
                      />
                      <datalist id="barangay-list">
                        {Array.from(new Set([
                          ...globalStats.patients.map(p => p.barangay),
                          ...globalStats.community.map(c => c.barangay)
                        ])).filter(Boolean).sort().map(b => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Health Center</label>
                      <input
                        value={patientForm.health_center || ""}
                        onChange={e => setPatientForm({ ...patientForm, health_center: e.target.value })}
                        placeholder="Name of health center"
                      />
                    </div>
                    <div className="input-group">
                      <label>Family No.</label>
                      <input
                        value={patientForm.family_no || ""}
                        onChange={e => setPatientForm({ ...patientForm, family_no: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Phone Number (for reminders)</label>
                    <input
                      value={patientForm.contact_number || ""}
                      onChange={e => setPatientForm({ ...patientForm, contact_number: e.target.value })}
                      placeholder="e.g., 09xxxxxxxxx"
                      inputMode="tel"
                    />
                  </div>
                  <hr style={{ margin: '1.2rem 0', borderTop: '1px solid var(--border)' }} />
                  <div className="input-row">
                    <div className="input-group">
                      <label>Vaccine Name</label>
                      <select
                        name="vaccine"
                        value={epiForm.vaccine_name}
                        onChange={e => setEpiForm(prev => ({ ...prev, vaccine_name: e.target.value }))}
                        required
                      >
                        <option value="">Select Vaccine...</option>
                        {VACCINE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Route</label>
                      <input value={epiForm.route} readOnly placeholder="Auto-set by vaccine" />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Dose Number</label>
                      <input type="number" name="dose" value={epiForm.dose_number} min="1" readOnly required />
                    </div>
                    <div className="input-group">
                      <label>Scheduled Date</label>
                      <input type="date" name="date" value={epiForm.scheduled_date} readOnly required />
                    </div>
                  </div>
                  {epiForm.vaccine_name && (
                    <div className="consent-hint">
                      {`Dose guide: ${epiDoseGuide}. Max doses: ${epiMaxDoses}.`}
                    </div>
                  )}
                  <div className="input-group consent-section">
                    <label>Consent for Treatment</label>
                    {isMinorPatient ? (
                      <>
                        <div className="input-row">
                          <div className="input-group">
                            <label>Parent/Guardian Name</label>
                            <input name="guardianName" required={isMinorPatient} />
                          </div>
                          <div className="input-group">
                            <label>Parent/Guardian Email</label>
                            <input type="email" name="guardianEmail" required={isMinorPatient} />
                          </div>
                        </div>
                        <div className="input-row">
                          <div className="input-group">
                            <label>Parent/Guardian Phone Number (for reminders)</label>
                            <input name="guardianPhone" placeholder="e.g., 09xxxxxxxxx" inputMode="tel" required={isMinorPatient} />
                          </div>
                        </div>
                        <label className="radio-label">
                          <input type="checkbox" name="guardianConsent" required={isMinorPatient} />
                          {GUARDIAN_CONSENT_STATEMENT}
                        </label>
                      </>
                    ) : (
                      <label className="radio-label">
                        <input type="checkbox" name="adultConsent" />
                        {ADULT_CONSENT_STATEMENT}
                      </label>
                    )}
                    <div className="consent-hint">
                      {patientAge === null
                        ? "Set DOB to auto-detect if guardian consent is required."
                        : `Patient age detected: ${patientAge} (${isMinorPatient ? "Minor" : "Adult"})`}
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="primary">{editingId ? "Save Changes" : "Register Patient"}</button>
                {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setPatientForm(initialPatientForm); setLogType('none'); }}>Cancel</button>}
              </div>
            </form>
          </section>

          <section className="card" style={{ margin: 0 }}>
            <div className="registry-search-container">
              <h2 style={{ margin: 0 }}>General Patient Registry</h2>
              <div className="search-wrapper">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  className="search-input"
                  placeholder="Search by name, barangay, or contact..." 
                  value={registrySearch}
                  onChange={e => setRegistrySearch(e.target.value)}
                />
                {registrySearch && (
                  <button 
                    onClick={() => setRegistrySearch("")} 
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", fontSize: "1.1rem", opacity: 0.4 }}
                  >✕</button>
                )}
              </div>
            </div>
            <div className="data-list">
              {paginatedPatients.map(p => (
                <div key={p.id} className="data-item">
                  <div className="data-main">
                    <span className="data-title">{p.full_name}</span>
                    <span className="data-sub">{p.barangay} • {p.date_of_birth}</span>
                  </div>
                  <div className="patient-actions">
                    <button
                      type="button"
                      className="primary action-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingId(p.id);
                        setPatientForm(p);
                        setLogType('epi');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      + Generate Sched
                    </button>
                    <button
                      type="button"
                      className="secondary action-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHistoryTab('treatment');
                        setSelectedHistoryPatientId(p.id);
                      }}
                    >
                      History
                    </button>
                    <button
                      type="button"
                      className="secondary action-btn action-btn-danger"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openConfirmDialog({
                          title: "Delete patient?",
                          message: "This will permanently remove this patient record.",
                          confirmText: "Delete",
                          onConfirm: async () => {
                            await deletePatient(p.id);
                            loadAllData();
                          }
                        });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {filteredPatients.length === 0 && (
                <p className="registry-empty">No patients found.</p>
              )}
              {totalRegistryPages > 1 && (
                <div className="pagination-container">
                  <div className="pagination-stats">
                    Showing <strong>{((registryPage - 1) * registryItemsPerPage) + 1}</strong> to <strong>{Math.min(registryPage * registryItemsPerPage, filteredPatients.length)}</strong> of <strong>{filteredPatients.length}</strong> patients
                  </div>
                  <div className="pagination-nav">
                    <button 
                      className="pg-btn" 
                      disabled={registryPage === 1} 
                      onClick={() => setRegistryPage(p => Math.max(1, p - 1))}
                      title="Previous Page"
                    >
                      <span className="pg-arrow">‹</span>
                    </button>
                    
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {Array.from({ length: totalRegistryPages }, (_, i) => i + 1).map(page => {
                        if (totalRegistryPages > 7) {
                          if (page !== 1 && page !== totalRegistryPages && (page < registryPage - 1 || page > registryPage + 1)) {
                            if (page === registryPage - 2 || page === registryPage + 2) return <span key={page} style={{ padding: "0 0.5rem", opacity: 0.4 }}>...</span>;
                            return null;
                          }
                        }
                        return (
                          <button 
                            key={page} 
                            className={`pg-btn ${registryPage === page ? "active" : ""}`} 
                            onClick={() => setRegistryPage(page)}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button 
                      className="pg-btn" 
                      disabled={registryPage === totalRegistryPages} 
                      onClick={() => setRegistryPage(p => Math.min(totalRegistryPages, p + 1))}
                      title="Next Page"
                    >
                      <span className="pg-arrow">›</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            {selectedHistoryPatient && (
              <div className="registry-modal-backdrop" onClick={() => setSelectedHistoryPatientId(null)}>
                <div className="registry-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                  <div className="registry-modal-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3>History: {selectedHistoryPatient.full_name}</h3>
                        <span className="data-sub">Clinical Record & Immunization History</span>
                      </div>
                    </div>
                  </div>
                  <div className="registry-modal-body">
                    <div className="patient-history-grid">
                        <div>
                          <h4 className="patient-history-title">EPI Vaccine History</h4>
                          <div className="data-list">
                            {selectedPatientImmunizationHistory.map(imm => (
                              <div key={`patient-history-imm-${imm.id}`} className="data-item">
                                <div className="data-main">
                                  <span className="data-title">{imm.vaccine_name} (Dose {imm.dose_number})</span>
                                  <span className="data-sub">Scheduled: {imm.scheduled_date || "N/A"}</span>
                                  <span className="data-sub">Given: {imm.administered_date || "Not yet"}{imm.status === "completed" && imm.notes?.includes("[Done at ") ? ` at ${imm.notes.match(/\[Done at (.*?)\]/)[1]}` : ""}</span>
                                </div>
                                <span className={`badge badge-${imm.status}`}>{imm.status === 'completed' ? 'accomplished' : imm.status}</span>
                              </div>
                            ))}
                            {selectedPatientImmunizationHistory.length === 0 && <p className="registry-empty">No vaccine records.</p>}
                          </div>
                        </div>
                        <div>
                          <h4 className="patient-history-title">Animal Bite Treatment History</h4>
                          <div className="data-list">
                            {selectedPatientBiteHistory.map(bite => (
                              <div key={`patient-history-bite-${bite.id}`} className="data-item">
                                <div className="data-main">
                                  <span className="data-title">{bite.animal_type} • {bite.incident_date}</span>
                                  <span className="data-sub">Exposure: {bite.severity_category || "N/A"}</span>
                                  <span className="data-sub">Protocol: {bite.treatment_protocol || "N/A"}</span>
                                </div>
                                <span className={`badge badge-${bite.treatment_status}`}>{bite.treatment_status}</span>
                              </div>
                            ))}
                            {selectedPatientBiteHistory.length === 0 && <p className="registry-empty">No animal bite treatment records.</p>}
                          </div>
                        </div>
                    </div>
                  </div>
                  <div className="registry-modal-actions">
                    <button className="primary" onClick={() => setSelectedHistoryPatientId(null)}>Close</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'registry' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <div className="registry-flow-header">
              <h2>Clinical Registries (Active Cases)</h2>
              <span>Grouped into Animal Bite and EPI with Status and Hx sections</span>
            </div>
            <div className="balanced-grid">
              <div className="card registry-card registry-card-bite">
                <h2>🐕 Animal Bite</h2>
                <div className="registry-group-header">
                  <h3>Status (Active Patients)</h3>
                  <span>{registryAnimalBiteActive.length} active</span>
                </div>
                <div className="data-list">
                  {registryAnimalBiteActive.map(b => (
                    <div key={b.id} className="data-item">
                      <div className="data-main">
                        <button
                          type="button"
                          className="registry-link-btn"
                          onClick={() => {
                            setHistoryTab('treatment');
                            setSelectedRegistryBiteHistoryPatientId(b.patient_id);
                          }}
                        >
                          {b.patients?.full_name}
                        </button>
                        <span className="data-sub">Status: {b.doses_administered}/{b.total_required_doses} doses</span>
                        <span className="data-sub" style={{ fontSize: '0.75rem' }}>Hx: {b.animal_type} bite ({b.incident_date})</span>
                      </div>
                      <div className="registry-row-actions">
                        <span className={`badge badge-${b.treatment_status}`}>{b.treatment_status}</span>
                        {b.next_due_dose ? (
                          <>
                            <button
                              className="primary registry-action-btn"
                              onClick={() => markBiteDoseDone(b.id, b.next_due_dose.id)}
                            >
                              Mark Dose {b.next_due_dose.dose_number} Done
                            </button>
                            <button
                              className="secondary registry-action-btn action-btn-danger"
                              onClick={() => {
                                openConfirmDialog({
                                  title: "Cancel dose?",
                                  message: "This will permanently cancel and remove this scheduled dose.",
                                  confirmText: "Cancel Dose",
                                  onConfirm: async () => {
                                    await deleteImmunization(b.next_due_dose.id);
                                    loadAllData();
                                  }
                                });
                              }}
                            >
                              Cancel dose
                            </button>
                          </>
                        ) : (
                          b.treatment_status !== 'completed' && (
                            <button
                              className="primary registry-action-btn"
                              onClick={async () => {
                                await updateAnimalBite(b.id, { treatment_status: 'completed' });
                                loadAllData();
                              }}
                            >
                              Complete Case
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                  {registryAnimalBiteActive.length === 0 && (
                    <p className="registry-empty">No active animal bite patients.</p>
                  )}
                </div>
                <div className="registry-group-header">
                  <h3>Hx (Recent History)</h3>
                  <span>Latest 12 records</span>
                </div>
                <div className="data-list">
                  {registryAnimalBiteHistory.map(b => (
                    <div key={`hx-bite-${b.id}`} className="data-item">
                      <div className="data-main">
                        <button
                          type="button"
                          className="registry-link-btn"
                          onClick={() => {
                            setHistoryTab('treatment');
                            setSelectedRegistryBiteHistoryPatientId(b.patient_id);
                          }}
                        >
                          {b.patients?.full_name || "Unknown Patient"}
                        </button>
                        <span className="data-sub">
                          {b.animal_type} • Incident: {b.incident_date}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className={`badge badge-${b.treatment_status}`}>{b.treatment_status}</span>
                        <button
                          className="secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderColor: '#ef4444', color: '#ef4444' }}
                          onClick={() => {
                            openConfirmDialog({
                              title: "Delete animal bite record?",
                              message: "This will permanently remove this animal bite history record.",
                              confirmText: "Delete",
                              onConfirm: async () => {
                                await deleteAnimalBite(b.id);
                                loadAllData();
                              }
                            });
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {registryAnimalBiteHistory.length === 0 && (
                    <p className="registry-empty">No animal bite history yet.</p>
                  )}
                </div>
              </div>

              <div className="card registry-card registry-card-epi">
                <h2>💉 EPI</h2>
                <div className="registry-group-header">
                  <h3>Status (Active Patients)</h3>
                  <span>{registryEpiActive.length} active</span>
                </div>
                <div className="data-list">
                  {registryEpiActive.map(entry => {
                    const imm = entry.next_due;
                    const isDue = (imm.scheduled_date || "2999-12-31") <= todayISO;
                    return (
                      <div key={`epi-active-${entry.patient_id || imm.id}`} className={`data-item ${isDue ? 'due-alert' : ''}`} style={isDue ? { borderLeft: '4px solid #ef4444', background: '#fef2f2' } : {}}>
                        <div className="data-main">
                          <button type="button" className="registry-link-btn" onClick={() => {
                            setHistoryTab('treatment');
                            setSelectedRegistryEpiHistoryPatientId(imm.patient_id);
                          }}>
                            {isDue && <span title="Due today or overdue" style={{ fontWeight: 800, color: "#ef4444" }}>DUE </span>}
                            {entry.patient_name}
                          </button>
                          <span className="data-sub" style={{ fontSize: '0.75rem', fontWeight: isDue ? 700 : 400, color: isDue ? '#ef4444' : 'inherit' }}>
                            {entry.pending_count} pending dose(s)
                          </span>
                        </div>
                        <div className="registry-row-actions">
                          <span className={`badge badge-${imm.status}`}>pending</span>
                          <button className="primary registry-action-btn" onClick={() => markImmunizationDone(imm.id, imm.notes)}>Mark Done</button>
                          {/* <button
                          className="secondary registry-action-btn"
                          onClick={() => {
                            setHistoryTab('treatment');
                            setSelectedRegistryEpiHistoryPatientId(imm.patient_id);
                          }}
                        >
                          Details
                        </button> */}
                          <button
                            className="secondary registry-action-btn action-btn-danger"
                            onClick={() => {
                              openConfirmDialog({
                                title: "Cancel dose?",
                                message: "This will permanently cancel and remove this scheduled dose.",
                                confirmText: "Cancel Dose",
                                onConfirm: async () => {
                                  await deleteImmunization(imm.id);
                                  loadAllData();
                                }
                              });
                            }}
                          >
                            Cancel dose
                          </button>
                        </div>
                      </div>
                    );
                  })}                {registryEpiActive.length === 0 && (
                    <p className="registry-empty">No active EPI patients.</p>
                  )}
                </div>
                <div className="registry-group-header">
                  <h3>Hx (Recent History)</h3>
                  <span>Latest 12 accomplished records</span>
                </div>
                <div className="data-list">
                  {registryEpiHistory.map(imm => (
                    <div key={`hx-epi-${imm.id}`} className="data-item">
                      <div className="data-main">
                        <button type="button" className="registry-link-btn" onClick={() => {
                          setHistoryTab('treatment');
                          setSelectedRegistryEpiHistoryPatientId(imm.patient_id);
                        }}>
                          {imm.patients?.full_name || "Unknown Patient"}
                        </button>
                        <span className="data-sub">
                          {imm.vaccine_name} (# {imm.dose_number}) • Accomplished: {imm.administered_date || imm.scheduled_date}{imm.notes?.includes("[Done at ") ? ` at ${imm.notes.match(/\[Done at (.*?)\]/)[1]}` : ""}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className="badge badge-completed">accomplished</span>
                        <button
                          className="secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderColor: '#ef4444', color: '#ef4444' }}
                          onClick={() => {
                            openConfirmDialog({
                              title: "Delete immunization history?",
                              message: "This will permanently remove this completed immunization history record.",
                              confirmText: "Delete",
                              onConfirm: async () => {
                                await deleteImmunization(imm.id);
                                loadAllData();
                              }
                            });
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {registryEpiHistory.length === 0 && (
                    <p className="registry-empty">No EPI history yet.</p>
                  )}
                </div>
              </div>
            </div>
            {selectedRegistryEpiHistoryPatient && (
              <div className="registry-modal-backdrop" onClick={() => setSelectedRegistryEpiHistoryPatientId(null)}>
                <div className="registry-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '980px' }}>
                  <div className="registry-modal-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3>{selectedRegistryEpiHistoryPatient.full_name}</h3>
                        <span className="data-sub">
                          {selectedRegistryEpiHistoryPatient.sex || "N/A"} • DOB: {selectedRegistryEpiHistoryPatient.date_of_birth || "N/A"}
                        </span>
                      </div>
                      <div className="modal-tabs">
                        <button 
                          className={`modal-tab ${historyTab === 'treatment' ? 'active' : ''}`}
                          onClick={() => setHistoryTab('treatment')}
                        >
                          Immunization Record
                        </button>
                        <button 
                          className={`modal-tab ${historyTab === 'profile' ? 'active' : ''}`}
                          onClick={() => setHistoryTab('profile')}
                        >
                          Patient Information
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="registry-modal-body">
                    {historyTab === 'treatment' ? (
                      <>
                        <h4 style={{ margin: '0 0 0.75rem' }}>📋 Immunization Record (Bakuna)</h4>
                        <div className="vc-scroll">
                          <table className="vc-table">
                            <thead>
                              <tr>
                                <th className="vc-th-name">Bakuna (Vaccine)</th>
                                <th className="vc-th-doses">Doses</th>
                                {[1, 2, 3, 4, 5].map(n => (
                                  <th key={n} className="vc-th-date">Dose {n}</th>
                                ))}
                                <th className="vc-th-remarks">Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedRegistryVaccineCard.map(vaccine => (
                                <tr key={vaccine.key} className={vaccine.allCompleted ? 'vc-row-done' : ''}>
                                  <td className="vc-name">{vaccine.label}</td>
                                  <td className="vc-doses-cell"><span className="vc-dose-badge">{vaccine.requiredDoses}</span></td>
                                  {[1, 2, 3, 4, 5].map(doseNum => {
                                    const dose = vaccine.doses.find(d => d.doseNumber === doseNum);
                                    const isNA = doseNum > vaccine.requiredDoses;
                                    return (
                                      <td key={doseNum} className={`vc-date-cell ${isNA ? 'vc-date-na' : ''} ${dose?.status === 'completed' ? 'vc-date-done' : dose?.status ? 'vc-date-pending' : ''}`}>
                                        {isNA ? '' : (
                                          <>
                                            <div>{dose?.date || '—'}</div>
                                            {dose?.status === 'completed' && (
                                              <div style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '2px', color: '#059669' }}>
                                                ✅ Done {dose?.record?.notes?.match(/\[Done at (.*?)\]/)?.[1] ? `at ${dose.record.notes.match(/\[Done at (.*?)\]/)[1]}` : ''}
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="vc-remarks-cell">
                                    {vaccine.remarks !== '—' ? (
                                      <span className={`vc-remark-badge ${vaccine.remarks === 'Accomplished' ? 'vc-remark-done' : 'vc-remark-pending'}`}>
                                        {vaccine.remarks}
                                      </span>
                                    ) : (
                                      <span className="vc-remark-none">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <PatientProfileSummary patient={selectedRegistryEpiHistoryPatient} biteRecords={animalBites.filter(b => b.patient_id === selectedRegistryEpiHistoryPatientId)} epiRecords={immunizations.filter(imm => imm.patient_id === selectedRegistryEpiHistoryPatientId && imm.vaccine_name !== "Anti-Rabies")} />
                    )}
                  </div>
                  <div className="registry-modal-actions">
                    <button className="primary" onClick={() => setSelectedRegistryEpiHistoryPatientId(null)}>Close</button>
                  </div>
                </div>
              </div>
            )}

            {selectedRegistryBiteHistoryPatient && (
              <div className="registry-modal-backdrop" onClick={() => setSelectedRegistryBiteHistoryPatientId(null)}>
                <div className="registry-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '980px' }}>
                  <div className="registry-modal-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3>{selectedRegistryBiteHistoryPatient.full_name}</h3>
                        <span className="data-sub">
                          {selectedRegistryBiteHistoryPatient.sex || "N/A"} • DOB: {selectedRegistryBiteHistoryPatient.date_of_birth || "N/A"}
                        </span>
                      </div>
                      <div className="modal-tabs">
                        <button 
                          className={`modal-tab ${historyTab === 'treatment' ? 'active' : ''}`}
                          onClick={() => setHistoryTab('treatment')}
                        >
                          Treatment Record
                        </button>
                        <button 
                          className={`modal-tab ${historyTab === 'profile' ? 'active' : ''}`}
                          onClick={() => setHistoryTab('profile')}
                        >
                          Patient Information
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="registry-modal-body">
                    {historyTab === 'treatment' ? (
                      <>
                        <h4 style={{ margin: '0 0 0.75rem' }}>🐕 Animal Bite Treatment Record</h4>
                        <div className="data-list">
                          {selectedRegistryBiteRecords.map((bite) => {
                            const schedule = [
                              ["D0", bite.schedule_d0],
                              ["D3", bite.schedule_d3],
                              ["D7", bite.schedule_d7],
                              ["D14", bite.schedule_d14],
                              ["D21", bite.schedule_d21],
                              ["D28", bite.schedule_d28]
                            ].filter(([, dt]) => Boolean(dt));

                            return (
                              <div key={`reg-bite-${bite.id}`} className="data-item" style={{ alignItems: "stretch" }}>
                                <div className="data-main">
                                  <span className="data-title">
                                    {bite.animal_type} • Incident: {bite.incident_date || "N/A"}
                                  </span>
                                  <span className="data-sub">
                                    Vaccine: {bite.vaccine_brand_name || "N/A"}{bite.vaccine_generic_name ? ` (${bite.vaccine_generic_name})` : ""} • Route: {bite.vaccine_route || "N/A"}
                                  </span>
                                  <span className="data-sub">
                                    RIG: {bite.rig_given ? "Yes" : "No"} • ARV: {bite.anti_rabies_vaccine_given ? "Yes" : "No"}
                                  </span>
                                  <span className="data-sub" style={{ fontSize: "0.75rem" }}>
                                    Protocol: {bite.treatment_protocol || "N/A"} • Doses: {bite.doses_administered ?? 0}/{bite.total_required_doses ?? "N/A"} • Status: {bite.treatment_status || "N/A"}
                                  </span>
                                  {bite.notes && (
                                    <span className="data-sub" style={{ fontSize: "0.75rem", color: '#2563eb', fontWeight: 600, marginTop: '0.2rem' }}>
                                      {bite.notes}
                                    </span>
                                  )}

                                  {schedule.length > 0 && (
                                    <div style={{ marginTop: "0.5rem" }}>
                                      <div className="vc-scroll">
                                        <table className="vc-table" style={{ margin: 0 }}>
                                          <thead>
                                            <tr>
                                              {schedule.map(([label]) => (
                                                <th key={`sch-h-${bite.id}-${label}`} className="vc-th-date">{label}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr>
                                              {schedule.map(([label, dt]) => {
                                                const imm = bite.relatedImms?.find(i => i.scheduled_date === dt);
                                                const isDone = imm?.status === 'completed';
                                                const doneTime = imm?.notes?.match(/\[Done at (.*?)\]/)?.[1];
                                                return (
                                                  <td key={`sch-${bite.id}-${label}`} className={`vc-date-cell ${isDone ? 'vc-date-done' : 'vc-date-pending'}`}>
                                                    <div>{dt || "—"}</div>
                                                    {isDone && (
                                                      <div style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '2px', color: '#059669' }}>
                                                        ✅ Done {doneTime ? `at ${doneTime}` : ''}
                                                      </div>
                                                    )}
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: "flex", alignItems: "flex-start" }}>
                                  <span className={`badge badge-${bite.treatment_status}`}>{bite.treatment_status}</span>
                                </div>
                              </div>
                            );
                          })}

                          {selectedRegistryBiteRecords.length === 0 && (
                            <p className="registry-empty">No animal bite treatment records.</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <PatientProfileSummary patient={selectedRegistryBiteHistoryPatient} biteRecords={selectedRegistryBiteRecords} epiRecords={immunizations.filter(imm => imm.patient_id === selectedRegistryBiteHistoryPatientId && imm.vaccine_name !== "Anti-Rabies")} />
                    )}
                  </div>
                  <div className="registry-modal-actions">
                    <button className="primary" onClick={() => setSelectedRegistryBiteHistoryPatientId(null)}>Close</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {confirmDialog && (
        <div
          className="registry-modal-backdrop"
          onClick={() => (confirmWorking ? null : setConfirmDialog(null))}
        >
          <div className="registry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="registry-modal-header">
              <h3 style={{ marginBottom: "0.25rem" }}>{confirmDialog.title}</h3>
              <span className="data-sub">{confirmDialog.message}</span>
            </div>
            <div
              className="registry-modal-actions"
              style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}
            >
              <button
                className="secondary"
                disabled={confirmWorking}
                onClick={() => setConfirmDialog(null)}
              >
                {confirmDialog.cancelText || "Cancel"}
              </button>
              <button
                className="primary"
                style={{ background: "#ef4444", borderColor: "#ef4444" }}
                disabled={confirmWorking}
                onClick={async () => {
                  setConfirmWorking(true);
                  try {
                    await confirmDialog.onConfirm?.();
                    setConfirmDialog(null);
                  } catch (err) {
                    setError(err?.message || "Delete failed.");
                  } finally {
                    setConfirmWorking(false);
                  }
                }}
              >
                {confirmWorking ? "Deleting..." : (confirmDialog.confirmText || "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendReminders && (
        <div className="registry-modal-backdrop" onClick={() => (sendingReminders ? null : setShowSendReminders(false))}>
          <div className="registry-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px" }}>
            <div className="registry-modal-header">
              <h3 style={{ marginBottom: "0.25rem" }}>Send Reminders (Due Today)</h3>
              <span className="data-sub">
                {dueTodayPatients.length} patient(s) have at least one dose due today ({todayISO}).
              </span>
              {alreadySentRemindersToday && (
                <div style={{ marginTop: "0.6rem", fontSize: "0.85rem", color: "#1e40af", background: "#dbeafe", padding: "0.6rem 0.75rem", borderRadius: "10px" }}>
                  Reminders were already sent today. This action is limited to once per day.
                </div>
              )}
              <div style={{ marginTop: "0.6rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Note: This UI records “sent” status. Actual SMS sending requires an SMS API/provider.
              </div>
            </div>

            <div className="registry-modal-body">
              <div className="data-list" style={{ marginTop: "0.75rem" }}>
                {dueTodayPatients.map((p) => (
                  <div key={`due-today-${p.patient_id || p.name}`} className="data-item">
                    <div className="data-main">
                      <span className="data-title">{p.name}</span>
                      <span className="data-sub">
                        Phone: {p.contact_number ? p.contact_number : "No phone number saved"}
                      </span>
                      <span className="data-sub" style={{ fontSize: "0.75rem" }}>
                        {p.items.map(i => i.subtitle).join(" • ")}
                      </span>
                    </div>
                    <span className="badge badge-pending">due today</span>
                  </div>
                ))}
                {dueTodayPatients.length === 0 && (
                  <p className="registry-empty">No patients due today.</p>
                )}
              </div>
            </div>

            <div className="registry-modal-actions" style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button className="secondary" disabled={sendingReminders} onClick={() => setShowSendReminders(false)}>
                Close
              </button>
              <button
                className="primary"
                disabled={sendingReminders || alreadySentRemindersToday || dueTodayPatients.length === 0}
                onClick={() => {
                  openConfirmDialog({
                    title: "Confirm and send?",
                    message: `Send reminders to ${dueTodayPatients.length} patient(s) due today?`,
                    confirmText: "Confirm & Send",
                    onConfirm: handleSendReminders
                  });
                }}
              >
                {sendingReminders ? "Sending..." : (alreadySentRemindersToday ? "Already sent today" : "Send reminders")}
              </button>
            </div>
          </div>
        </div>
      )}
      {isEditingProfile && (
        <div className="modal-overlay">
          <div className="modal-card profile-edit-modal">
            <div className="modal-header profile-edit-header">
              <div className="profile-edit-title-wrap">
                <div className="profile-edit-avatar">
                  {editProfileForm.first_name?.[0] || adminUser.full_name?.[0] || "N"}
                </div>
                <div>
                  <h3>Edit Nurse Profile</h3>
                  <span>{adminUser.email}</span>
                </div>
              </div>
              <button type="button" className="close-btn" onClick={() => setIsEditingProfile(false)} aria-label="Close profile editor">✕</button>
            </div>

            <form className="profile-edit-form" onSubmit={handleUpdateProfile}>
              <div className="profile-edit-summary">
                <div>
                  <span className="profile-edit-kicker">Current Duty</span>
                  <strong>{adminUser.shift || "AM"} Shift</strong>
                </div>
                <span className={`profile-edit-shift shift-${adminUser.shift?.toLowerCase() || "am"}`}>
                  {adminUser.shift || "AM"}
                </span>
              </div>

              <div className="profile-edit-grid">
                <div className="input-group">
                  <label>First Name</label>
                  <input 
                    value={editProfileForm.first_name} 
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, first_name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="input-group">
                  <label>Last Name</label>
                  <input 
                    value={editProfileForm.last_name} 
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, last_name: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="input-group profile-edit-wide">
                <label>Username</label>
                <input 
                  value={editProfileForm.username} 
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, username: e.target.value })} 
                />
              </div>

              <div className="input-group profile-edit-wide">
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={editProfileForm.email} 
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })} 
                  required 
                />
              </div>

              <div className="input-group profile-edit-wide">
                <label>New Password (leave blank to keep current)</label>
                <input 
                  type="password" 
                  value={editProfileForm.password} 
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, password: e.target.value })} 
                  placeholder="••••••••" 
                />
              </div>

              <div className="modal-actions profile-edit-actions">
                <button type="button" className="secondary" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                <button type="submit" className="primary" disabled={loading}>
                  {loading ? "Saving..." : "Update Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

