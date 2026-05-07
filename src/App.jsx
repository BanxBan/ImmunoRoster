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
  getCensus
} from "./api";

const VACCINE_TYPES = [
  "Hep B", "BCG (Bacillus Calmette-Guerin)", "OPV (Oral Polio Vaccine)",
  "IPV (Inactivated Polio Vaccine)", "Pentavalent Vacc (DPT-HepB-Hib)",
  "Rotavirus Vacc", "Measles", "MMR Vacc (Measles, Mumps, Rubella)",
  "TT1 (Tetanus Toxoid)", "TT2 (Tetanus Toxoid)", "TT3 (Tetanus Toxoid)",
  "TT4 (Tetanus Toxoid)", "TT5 (Tetanus Toxoid)",
  "PCV", "Anti-Rabies (Post-Exposure)", "Anti-Rabies (Pre-Exposure)"
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
    label: "MMR Vacc (Measles, Mumps, Rubella)",
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
    label: "Pentavalent Vacc (DPT-HepB-Hib)",
    group: "multi",
    minimumAge: "6 weeks",
    requiredDoses: 3,
    minimumInterval: "4 weeks",
    description: "Three-dose series against diphtheria, pertussis, tetanus, hepatitis B, and Hib."
  },
  {
    key: "rotavirus",
    label: "Rotavirus Vacc",
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
  if (name.includes("pcv")) return "pcv";
  return null;
}

const BITE_PROTOCOLS = {
  "Standard IM (0, 3, 7, 14, 28)": [0, 3, 7, 14, 28],
  "Thai Red Cross ID (0, 3, 7, 28)": [0, 3, 7, 28],
  "Booster (0, 3)": [0, 3]
};
const EXPOSURE_CATEGORIES = ["1", "2", "3"];
const EPI_ROUTE_BY_VACCINE_KEY = {
  "hep-b": "IM",
  "bcg": "ID",
  "opv": "Oral",
  "ipv": "IM",
  "pentavalent": "IM",
  "rotavirus": "Oral",
  "measles": "SC",
  "mmr": "SC",
  "tt": "IM",
  "pcv": "IM"
};
const EPI_INTERVAL_DAYS_BY_VACCINE_KEY = {
  "hep-b": 28,
  "bcg": 28,
  "opv": 28,
  "ipv": 28,
  "pentavalent": 28,
  "rotavirus": 28,
  "measles": 30,
  "mmr": 30,
  "tt": 28,
  "pcv": 28
};

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

const initialPatientForm = {
  full_name: "",
  date_of_birth: "",
  sex: "",
  contact_number: "",
  barangay: "",
  municipality: "",
  address: ""
};

export default function App() {
  const [adminUser, setAdminUser] = useState(() => getAdminSession());
  const [activeTab, setActiveTab] = useState("census");
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [loggingIn, setLoggingIn] = useState(false);
  
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
  const [biteAnimalType, setBiteAnimalType] = useState("Dog");
  const [selectedBarangayFilter, setSelectedBarangayFilter] = useState("all");
  const [selectedHistoryPatientId, setSelectedHistoryPatientId] = useState(null);
  const [selectedRegistryHistoryPatientId, setSelectedRegistryHistoryPatientId] = useState(null);
  const [epiForm, setEpiForm] = useState({
    vaccine_name: "",
    route: "",
    dose_number: 1,
    scheduled_date: new Date().toISOString().split('T')[0]
  });
  const [biteDateOfExposure, setBiteDateOfExposure] = useState(new Date().toISOString().split('T')[0]);
  const [biteProtocol, setBiteProtocol] = useState(Object.keys(BITE_PROTOCOLS)[0]);
  const [biteSchedulePreview, setBiteSchedulePreview] = useState({ d0: "", d3: "", d7: "", d28: "" });
  const formRef = useRef(null);

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
    setShowBiteDetails(false);
    setShowEpiDetails(false);
    setShowActiveBiteAlert(false);
  }, [activeTab]);

  useEffect(() => {
    if (logType !== "bite") return;
    const incident = new Date(biteDateOfExposure);
    if (Number.isNaN(incident.getTime())) return;
    const days = BITE_PROTOCOLS[biteProtocol] || [];
    const nextPreview = { d0: "", d3: "", d7: "", d28: "" };
    days.forEach((day) => {
      const dt = new Date(incident);
      dt.setDate(incident.getDate() + day);
      const value = dt.toISOString().split("T")[0];
      if (day === 0) nextPreview.d0 = value;
      if (day === 3) nextPreview.d3 = value;
      if (day === 7) nextPreview.d7 = value;
      if (day === 28) nextPreview.d28 = value;
    });
    setBiteSchedulePreview(nextPreview);
  }, [biteDateOfExposure, biteProtocol, logType]);

  useEffect(() => {
    if (logType !== "epi") return;
    if (!epiForm.vaccine_name) return;
    const key = getEpiVaccineKey({ vaccine_name: epiForm.vaccine_name });
    const route = EPI_ROUTE_BY_VACCINE_KEY[key] || "IM";
    const intervalDays = EPI_INTERVAL_DAYS_BY_VACCINE_KEY[key] || 28;
    const targetPatientId = editingId || null;
    let nextDoseNumber = 1;
    let nextDate = new Date().toISOString().split("T")[0];

    if (targetPatientId) {
      const sameVaccineRecords = immunizations
        .filter((imm) => imm.patient_id === targetPatientId && imm.vaccine_name === epiForm.vaccine_name)
        .sort((a, b) => Number(a.dose_number || 1) - Number(b.dose_number || 1));
      if (sameVaccineRecords.length > 0) {
        const last = sameVaccineRecords[sameVaccineRecords.length - 1];
        nextDoseNumber = Number(last.dose_number || 0) + 1;
        const base = new Date(last.administered_date || last.scheduled_date || new Date());
        if (!Number.isNaN(base.getTime())) {
          base.setDate(base.getDate() + intervalDays);
          nextDate = base.toISOString().split("T")[0];
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
          full_name: fd.get("fullname"),
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

  // Patient Handlers
  async function savePatient(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const payload = {
        full_name: patientForm.full_name,
        date_of_birth: patientForm.date_of_birth,
        sex: patientForm.sex,
        barangay: patientForm.barangay,
        municipality: patientForm.municipality,
        province: patientForm.province,
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
        const guardianConsent = fd.get("guardianConsent") === "on";
        const adultConsent = fd.get("adultConsent") === "on";

        if (isMinor) {
          if (!guardianName) throw new Error("Guardian name is required for minors.");
          if (!guardianEmail) throw new Error("Guardian email is required for minors.");
          if (!guardianConsent) throw new Error("Guardian consent is required for minors.");
        } else if (!adultConsent) {
          throw new Error("Patient consent is required for adults.");
        }

        const selectedAnimal = fd.get("animal");
        const customAnimal = String(fd.get("otherAnimal") || "").trim();
        const finalAnimal = selectedAnimal === "Other" ? customAnimal : selectedAnimal;
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
            source_of_exposure: selectedAnimal,
            source_other_details: selectedAnimal === "Other" ? customAnimal : null,
            source_vaccination_status: String(fd.get("sourceVaccinationStatus") || "").trim() || null,
            status_of_animal_after_14_days: String(fd.get("animalStatus14Days") || "").trim() || null,
            remarks: String(fd.get("remarks") || "").trim() || null,
            severity_category: String(fd.get("categoryOfExposure") || "").trim() || null,
            wound_washing_done: fd.get("woundWashingDone") === "on",
            rig_given: fd.get("rigGiven") === "on",
            anti_rabies_vaccine_given: fd.get("arvGiven") === "on",
            vaccine_generic_name: String(fd.get("vaccineGenericName") || "").trim() || null,
            vaccine_brand_name: String(fd.get("vaccineBrandName") || "").trim() || null,
            vaccine_route: String(fd.get("vaccineRoute") || "").trim() || null,
            post_exposure_schedule: protocolNameToLabel(fd.get("protocol")),
            schedule_d0: String(fd.get("scheduleD0") || "").trim() || null,
            schedule_d3: String(fd.get("scheduleD3") || "").trim() || null,
            schedule_d7: String(fd.get("scheduleD7") || "").trim() || null,
            schedule_d28: String(fd.get("scheduleD28") || "").trim() || null,
            is_minor_patient: isMinor,
            guardian_name: isMinor ? guardianName : null,
            guardian_email: isMinor ? guardianEmail : null,
            consent_given: isMinor ? guardianConsent : adultConsent,
            consent_given_by: isMinor ? "guardian" : "patient",
            consent_statement: isMinor
              ? "I am the parent/guardian and I consent to the patient receiving treatment."
              : "I consent to receiving treatment."
          }
        );
      } else if (logType === 'epi') {
        const routeNote = epiForm.route ? `Route: ${epiForm.route}` : null;
        await createImmunization({
          patient_id: savedPatient.id,
          vaccine_name: epiForm.vaccine_name,
          dose_number: Number(epiForm.dose_number || 1),
          scheduled_date: epiForm.scheduled_date,
          status: 'pending',
          notes: routeNote
        });
      }

      setPatientForm(initialPatientForm);
      setEditingId(null);
      setLogType('none');
      setBiteAnimalType('Dog');
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

    // Generate individual immunization doses
    for (let i = 0; i < days.length; i++) {
      const scheduledDate = new Date(incident);
      scheduledDate.setDate(incident.getDate() + days[i]);
      
      await createImmunization({
        patient_id: patientId,
        vaccine_name: "Anti-Rabies",
        dose_number: i + 1,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        status: 'pending',
        notes: `Bite Case #${biteRecord.id.slice(0,5)} - Day ${days[i]}`
      });
    }
    loadAllData();
    setActiveTab("immunizations");
  }

  // Census Calculations
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const { patients: gPatients = [], immunizations: gImms = [], animalBites: gBites = [], community: gComm = [] } = globalStats;
    const scopedPatients = selectedBarangayFilter === "all"
      ? gPatients
      : gPatients.filter(p => (p.barangay || "Unknown") === selectedBarangayFilter);
    const scopedPopulation = selectedBarangayFilter === "all"
      ? gComm.reduce((sum, entry) => sum + Number(entry.total_population || 0), 0)
      : (gComm.find(entry => entry.barangay === selectedBarangayFilter)?.total_population || 0);
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
      const b = p.barangay || "Unknown";
      if (!acc[b]) {
        const communityData = gComm.find(c => c.barangay === b);
        acc[b] = { 
          count: 0, 
          fullyImmunized: 0, 
          totalDoses: 0,
          completedDoses: 0,
          population: communityData?.total_population || 0 
        };
      }
      acc[b].count++;
      
      const pImms = scopedImms.filter(i => i.patient_id === p.id && getEpiVaccineKey(i));
      acc[b].totalDoses += pImms.length;
      acc[b].completedDoses += pImms.filter(i => i.status === 'completed').length;
      
      const isFull = pImms.length > 0 && pImms.every(i => i.status === 'completed');
      if (isFull) acc[b].fullyImmunized++;
      
      return acc;
    }, {});

    return {
      filterLabel: selectedBarangayFilter === "all" ? "Overall" : selectedBarangayFilter,
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
  }, [globalStats, selectedBarangayFilter]);

  const censusBarangays = useMemo(() => {
    const names = [
      ...(globalStats.community || []).map(c => c.barangay),
      ...(globalStats.patients || []).map(p => p.barangay)
    ].filter(Boolean);
    return [...new Set(names)];
  }, [globalStats]);
  const censusBarangayScope = censusBarangays.length === 1 ? `Barangay ${censusBarangays[0]}` : "all barangays";
  const overallEpiRate = Math.round((stats.completedEpiRecordedDoses / (stats.totalEpiRecordedDoses || 1)) * 100);
  const barangayFilterOptions = ["all", ...censusBarangays.sort()];
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
        return (patientById[bite.patient_id]?.barangay || "Unknown") === selectedBarangayFilter;
      })
      .slice(0, 5);
  }, [globalStats.animalBites, patientById, selectedBarangayFilter]);
  const registryAnimalBiteActive = useMemo(() => {
    return [...animalBites]
      .filter(b => b.treatment_status !== 'completed')
      .sort((a, b) => new Date(b.incident_date) - new Date(a.incident_date));
  }, [animalBites]);
  const registryAnimalBiteHistory = useMemo(() => {
    return [...animalBites]
      .sort((a, b) => new Date(b.incident_date) - new Date(a.incident_date))
      .slice(0, 12);
  }, [animalBites]);
  const registryEpiActive = useMemo(() => {
    return [...immunizations]
      .filter(i => i.status !== 'completed')
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
  }, [immunizations]);
  const registryEpiHistory = useMemo(() => {
    return [...immunizations]
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
      .filter(i => i.patient_id === selectedHistoryPatientId)
      .sort((a, b) => new Date(b.administered_date || b.scheduled_date) - new Date(a.administered_date || a.scheduled_date));
  }, [immunizations, selectedHistoryPatientId]);
  const selectedPatientBiteHistory = useMemo(() => {
    if (!selectedHistoryPatientId) return [];
    return [...animalBites]
      .filter(b => b.patient_id === selectedHistoryPatientId)
      .sort((a, b) => new Date(b.incident_date) - new Date(a.incident_date));
  }, [animalBites, selectedHistoryPatientId]);
  const selectedRegistryHistoryPatient = useMemo(
    () => patients.find(p => p.id === selectedRegistryHistoryPatientId) || null,
    [patients, selectedRegistryHistoryPatientId]
  );
  const selectedRegistryRecentDoses = useMemo(() => {
    if (!selectedRegistryHistoryPatientId) return [];
    return [...immunizations]
      .filter(i => i.patient_id === selectedRegistryHistoryPatientId)
      .sort((a, b) => new Date(b.administered_date || b.scheduled_date) - new Date(a.administered_date || a.scheduled_date))
      .slice(0, 8);
  }, [immunizations, selectedRegistryHistoryPatientId]);
  const patientAge = getAgeFromDateOfBirth(patientForm.date_of_birth);
  const isMinorPatient = patientAge !== null && patientAge < 18;

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
              <div className="input-group">
                <label>Full Name</label>
                <input name="fullname" placeholder="Nurse Name" required />
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
          <div className="user-badge" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span className="user-name" style={{ fontWeight: 700 }}>Hi, Nurse {adminUser.full_name}! Welcome</span>
            <span className="badge badge-pending" style={{ padding: '0.2rem 0.6rem' }}>{adminUser.shift} Shift</span>
          </div>
        </div>
        <button className="secondary" style={{ padding: '0.4rem 1rem' }} onClick={handleLogout}>Sign Out</button>
      </header>

      <nav className="nav-tabs">
        <button className={`nav-tab ${activeTab === 'census' ? 'active' : ''}`} onClick={() => setActiveTab('census')}>📊 Census Summary</button>
        <button className={`nav-tab ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>👤 Patient Registration</button>
        <button className={`nav-tab ${activeTab === 'registry' ? 'active' : ''}`} onClick={() => setActiveTab('registry')}>📋 Registries</button>
      </nav>

      {error && <div className="error-toast" onClick={() => setError("")}>{error}</div>}

      {activeTab === 'census' && (
        <section>
          <div className="census-intro">
            This section presents the barangay trends and cumulative reported cases of selected vaccine-preventable diseases (VPDs) and animal bite incidents in {censusBarangayScope} up to the year {new Date().getFullYear()}.
          </div>

          <div className="active-alert">
            <button
              type="button"
              className="active-alert-trigger"
              onClick={() => setShowActiveBiteAlert(!showActiveBiteAlert)}
            >
              <div className="active-alert-main">
                <span className="active-alert-icon">AB</span>
                <div>
                  <strong>Active Bite Cases</strong>
                  <span>{stats.filterLabel} • {stats.activeBiteCases} pending treatment{stats.activeBiteCases === 1 ? "" : "s"}</span>
                </div>
              </div>
              <span className="active-alert-count">{stats.activeBiteCaseRate}%</span>
            </button>

            {showActiveBiteAlert && (
              <ul className="active-alert-list">
                {activeBiteAlerts.map(bite => (
                  <li key={bite.id} className="active-alert-item">
                    <div className="data-main">
                      <span className="data-title">{patientById[bite.patient_id]?.full_name || 'Loading...'}</span>
                      <span className="data-sub">{bite.animal_type} bite • Status: {bite.treatment_status}</span>
                    </div>
                    <span className={`badge badge-${bite.treatment_status}`}>{bite.treatment_status}</span>
                  </li>
                ))}
                {activeBiteAlerts.length === 0 && (
                  <li className="active-alert-empty">No active bite cases for this filter.</li>
                )}
              </ul>
            )}
          </div>

          <div className="barangay-filter-bar">
            {barangayFilterOptions.map(barangay => (
              <button
                type="button"
                key={barangay}
                className={`filter-chip ${selectedBarangayFilter === barangay ? 'active' : ''}`}
                onClick={() => setSelectedBarangayFilter(barangay)}
              >
                {barangay === "all" ? "Overall" : barangay}
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
                <span className="stat-value">{stats.totalAnimalBiteCases}</span>
                <span className="stat-label">Overall Animal Bite Cases</span>
                <span className="metric-subvalue">{stats.filterLabel}</span>
                <span className="metric-subvalue">
                  {stats.animalBiteIncidencePer1000} per 1,000 population
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
                <div className="active-bite-summary">
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

          <div className="dashboard-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card" style={{ textAlign: 'center', margin: 0 }}>
                <h2>💉 Overall EPI Rate</h2>
                <div style={{ position: 'relative', height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '2rem 0' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '180px', height: '180px', transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <circle 
                      cx="18" cy="18" r="16" fill="none" stroke="var(--primary)" strokeWidth="3" 
                      strokeDasharray={`${overallEpiRate} 100`}
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{overallEpiRate}%</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>COMPLETED</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '2px' }}></div> Completed
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '12px', height: '12px', background: '#e2e8f0', borderRadius: '2px' }}></div> Pending
                  </div>
                </div>
              </div>

              <div className="card" style={{ textAlign: 'center', margin: 0 }}>
                <h2>🐕 Bite Treatment Rate</h2>
                <div style={{ position: 'relative', height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '2rem 0' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '180px', height: '180px', transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#fee2e2" strokeWidth="3" />
                    <circle 
                      cx="18" cy="18" r="16" fill="none" stroke="#dc2626" strokeWidth="3" 
                      strokeDasharray={`${stats.animalBiteTreatmentRate} 100`}
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.animalBiteTreatmentRate}%</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TREATED</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '12px', height: '12px', background: '#dc2626', borderRadius: '2px' }}></div> Treated
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '12px', height: '12px', background: '#fee2e2', borderRadius: '2px' }}></div> Pending
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
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
              <div className="input-group">
                <label>Full Name</label>
                <input value={patientForm.full_name} onChange={e => setPatientForm({...patientForm, full_name: e.target.value})} required />
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>DOB</label>
                  <input type="date" value={patientForm.date_of_birth} onChange={e => setPatientForm({...patientForm, date_of_birth: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Sex</label>
                  <select value={patientForm.sex} onChange={e => setPatientForm({...patientForm, sex: e.target.value})}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label>Barangay</label>
                <input 
                  list="barangay-list"
                  value={patientForm.barangay} 
                  onChange={e => setPatientForm({...patientForm, barangay: e.target.value})} 
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
              <hr style={{ margin: '1.5rem 0', borderTop: '1px solid var(--border)' }} />
              <div className="input-group activity-selector">
                <label>Add Clinical Activity (Optional)</label>
                <div className="activity-options">
                  <label className="radio-label">
                    <input type="radio" checked={logType === 'none'} onChange={() => setLogType('none')} /> None
                  </label>
                  <label className="radio-label">
                    <input type="radio" checked={logType === 'epi'} onChange={() => setLogType('epi')} /> EPI (Immunization)
                  </label>
                  <label className="radio-label">
                    <input type="radio" checked={logType === 'bite'} onChange={() => setLogType('bite')} /> Animal Bite Incident
                  </label>
                </div>
              </div>

              {logType === 'bite' && (
                <div className="clinical-panel clinical-panel-bite">
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
                      <label>Incident Date</label>
                      <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                    </div>
                  </div>
                  {biteAnimalType === "Other" && (
                    <div className="input-group">
                      <label>Specify Animal</label>
                      <input name="otherAnimal" placeholder="Type animal name" required />
                    </div>
                  )}
                  <div className="input-group">
                    <label>Type of Exposure</label>
                    <select name="typeOfExposure" required>
                      <option value="Bitten">Bitten</option>
                      <option value="Scratched">Scratched</option>
                      <option value="Licked on broken skin">Licked on broken skin</option>
                    </select>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Source Vaccination Status</label>
                      <select name="sourceVaccinationStatus" defaultValue="">
                        <option value="">Select</option>
                        <option value="N">N (No)</option>
                        <option value="S">S (Yes/Seen Vaccinated)</option>
                      </select>
                    </div>
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
                    <label>Remarks</label>
                    <input name="remarks" />
                  </div>
                  <div className="input-group">
                    <label>Post-Exposure Prophylaxis</label>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <label className="radio-label"><input type="checkbox" name="woundWashingDone" defaultChecked /> Wound Washing</label>
                      <label className="radio-label"><input type="checkbox" name="rigGiven" /> RIG</label>
                      <label className="radio-label"><input type="checkbox" name="arvGiven" defaultChecked /> Anti-Rabies Vaccine</label>
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Vaccine Generic Name</label>
                      <input name="vaccineGenericName" defaultValue="PVRV" />
                    </div>
                    <div className="input-group">
                      <label>Brand Name</label>
                      <input name="vaccineBrandName" defaultValue="SPEEDA" />
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
                    <div className="input-group"><label>D0</label><input type="date" name="scheduleD0" value={biteSchedulePreview.d0} readOnly /></div>
                    <div className="input-group"><label>D3</label><input type="date" name="scheduleD3" value={biteSchedulePreview.d3} readOnly /></div>
                  </div>
                  <div className="input-row">
                    <div className="input-group"><label>D7</label><input type="date" name="scheduleD7" value={biteSchedulePreview.d7} readOnly /></div>
                    <div className="input-group"><label>D28</label><input type="date" name="scheduleD28" value={biteSchedulePreview.d28} readOnly /></div>
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
                        <label className="radio-label">
                          <input type="checkbox" name="guardianConsent" required={isMinorPatient} />
                          I am the parent/guardian and I allow this patient to receive treatment.
                        </label>
                      </>
                    ) : (
                      <label className="radio-label">
                        <input type="checkbox" name="adultConsent" />
                        I allow and consent to receive treatment.
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
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="primary">{editingId ? "Save Changes" : "Register Patient"}</button>
                {editingId && <button type="button" className="secondary" onClick={() => {setEditingId(null); setPatientForm(initialPatientForm); setLogType('none');}}>Cancel</button>}
              </div>
            </form>
          </section>

          <section className="card" style={{ margin: 0 }}>
            <h2>General Patient Registry</h2>
            <div className="data-list">
              {patients.map(p => (
                <div key={p.id} className="data-item">
                  <div className="data-main">
                    <span className="data-title">{p.full_name}</span>
                    <span className="data-sub">{p.barangay} • {p.date_of_birth}</span>
                  </div>
                  <div className="patient-actions">
                    <button className="primary action-btn" onClick={() => { setEditingId(p.id); setPatientForm(p); setLogType('epi'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>+ Generate Sched</button>
                    <button
                      className="secondary action-btn"
                      onClick={() => {
                        setSelectedHistoryPatientId(prev => prev === p.id ? null : p.id);
                      }}
                    >
                      {selectedHistoryPatientId === p.id ? "Hide History" : "History"}
                    </button>
                    <button className="secondary action-btn action-btn-danger" onClick={async () => { if(confirm("Delete patient?")) { await deletePatient(p.id); loadAllData(); } }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            {selectedHistoryPatient && (
              <div className="patient-history-panel">
                <h3>History: {selectedHistoryPatient.full_name}</h3>
                <div className="patient-history-grid">
                  <div>
                    <h4 className="patient-history-title">Vaccine History</h4>
                    <div className="data-list">
                      {selectedPatientImmunizationHistory.map(imm => (
                        <div key={`patient-history-imm-${imm.id}`} className="data-item">
                          <div className="data-main">
                            <span className="data-title">{imm.vaccine_name} (Dose {imm.dose_number})</span>
                            <span className="data-sub">Scheduled: {imm.scheduled_date || "N/A"}</span>
                            <span className="data-sub">Given: {imm.administered_date || "Not yet"}</span>
                          </div>
                          <span className={`badge badge-${imm.status}`}>{imm.status}</span>
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
          {selectedRegistryHistoryPatient && (
            <div className="patient-history-panel" style={{ marginBottom: '1rem' }}>
              <h3>Recent Doses: {selectedRegistryHistoryPatient.full_name}</h3>
              <div className="data-list">
                {selectedRegistryRecentDoses.map(dose => (
                  <div key={`registry-dose-${dose.id}`} className="data-item">
                    <div className="data-main">
                      <span className="data-title">{dose.vaccine_name} (Dose {dose.dose_number})</span>
                      <span className="data-sub">Scheduled: {dose.scheduled_date || "N/A"}</span>
                      <span className="data-sub">Administered: {dose.administered_date || "Not yet"}</span>
                    </div>
                    <span className={`badge badge-${dose.status}`}>{dose.status}</span>
                  </div>
                ))}
                {selectedRegistryRecentDoses.length === 0 && (
                  <p className="registry-empty">No dose records for this patient yet.</p>
                )}
              </div>
            </div>
          )}
          <div className="dashboard-grid">
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
                      <span className="data-title">{b.patients?.full_name}</span>
                      <span className="data-sub">Status: {b.doses_administered}/{b.total_required_doses} doses</span>
                      <span className="data-sub" style={{ fontSize: '0.75rem' }}>Hx: {b.animal_type} bite ({b.incident_date})</span>
                    </div>
                    <div className="registry-row-actions">
                      <span className={`badge badge-${b.treatment_status}`}>{b.treatment_status}</span>
                      {b.treatment_status !== 'completed' && (
                        <button
                          className="primary registry-action-btn"
                          onClick={async () => {
                            await updateAnimalBite(b.id, { treatment_status: 'completed' });
                            loadAllData();
                          }}
                        >
                          Mark Completed
                        </button>
                      )}
                      <button
                        className="secondary registry-action-btn"
                        onClick={() => {
                          setSelectedRegistryHistoryPatientId(prev => prev === b.patient_id ? null : b.patient_id);
                        }}
                      >
                        {selectedRegistryHistoryPatientId === b.patient_id ? "Hide History" : "History"}
                      </button>
                      <button 
                        className="secondary registry-action-btn action-btn-danger"
                        onClick={async () => { if(confirm("Delete this record?")) { await deleteAnimalBite(b.id); loadAllData(); } }}
                      >
                        Delete
                      </button>
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
                      <span className="data-title">{b.patients?.full_name || "Unknown Patient"}</span>
                      <span className="data-sub">
                        {b.animal_type} • Incident: {b.incident_date}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span className={`badge badge-${b.treatment_status}`}>{b.treatment_status}</span>
                      <button 
                        className="secondary" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderColor: '#ef4444', color: '#ef4444' }}
                        onClick={async () => { if(confirm("Delete this history record?")) { await deleteAnimalBite(b.id); loadAllData(); } }}
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
                {registryEpiActive.map(imm => {
                  const today = new Date().toISOString().split('T')[0];
                  const isDue = imm.scheduled_date <= today;
                  return (
                    <div key={imm.id} className={`data-item ${isDue ? 'due-alert' : ''}`} style={isDue ? { borderLeft: '4px solid #ef4444', background: '#fef2f2' } : {}}>
                      <div className="data-main">
                        <span className="data-title">
                          {isDue && <span title="Due Today or Overdue">⚠️ </span>}
                          {imm.patients?.full_name}
                        </span>
                        <span className="data-sub">Next: {imm.vaccine_name} (# {imm.dose_number})</span>
                        <span className="data-sub" style={{ fontSize: '0.75rem', fontWeight: isDue ? 700 : 400, color: isDue ? '#ef4444' : 'inherit' }}>
                          Status: Scheduled for {imm.scheduled_date}
                        </span>
                      </div>
                      <div className="registry-row-actions">
                        <span className={`badge badge-${imm.status}`}>{imm.status}</span>
                        <button className="primary registry-action-btn" onClick={async () => {
                          await updateImmunization(imm.id, { status: 'completed', administered_date: new Date().toISOString().split('T')[0] });
                          loadAllData();
                        }}>Mark Done</button>
                        <button 
                          className="secondary registry-action-btn action-btn-danger"
                          onClick={async () => { if(confirm("Delete this record?")) { await deleteImmunization(imm.id); loadAllData(); } }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
                {registryEpiActive.length === 0 && (
                  <p className="registry-empty">No active EPI patients.</p>
                )}
              </div>
              <div className="registry-group-header">
                <h3>Hx (Recent History)</h3>
                <span>Latest 12 completed records</span>
              </div>
              <div className="data-list">
                {registryEpiHistory.map(imm => (
                  <div key={`hx-epi-${imm.id}`} className="data-item">
                    <div className="data-main">
                      <span className="data-title">{imm.patients?.full_name || "Unknown Patient"}</span>
                      <span className="data-sub">
                        {imm.vaccine_name} (# {imm.dose_number}) • Completed: {imm.administered_date || imm.scheduled_date}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span className="badge badge-completed">completed</span>
                      <button 
                        className="secondary" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderColor: '#ef4444', color: '#ef4444' }}
                        onClick={async () => { if(confirm("Delete this history record?")) { await deleteImmunization(imm.id); loadAllData(); } }}
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
          </div>
        </section>
      )}
    </main>
  );
}
