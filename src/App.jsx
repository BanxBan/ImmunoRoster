import { useEffect, useState, useMemo } from "react";
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
  deleteAnimalBite
} from "./api";

const VACCINE_TYPES = [
  "BCG", "Hepatitis B", "Pentavalent (DPT-HepB-HiB)", "Oral Polio (OPV)", 
  "Inactivated Polio (IPV)", "PCV", "MMR (Measles, Mumps, Rubella)", 
  "Anti-Rabies (Post-Exposure)", "Anti-Rabies (Pre-Exposure)", "Tetanus Toxoid"
];

const BITE_PROTOCOLS = {
  "Standard IM (0, 3, 7, 14, 28)": [0, 3, 7, 14, 28],
  "Thai Red Cross ID (0, 3, 7, 28)": [0, 3, 7, 28],
  "Booster (0, 3)": [0, 3]
};

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

  // Load Initial Data
  async function loadAllData() {
    if (!adminUser) return;
    setLoading(true);
    try {
      const [pData, iData, bData] = await Promise.all([
        searchPatients(),
        getImmunizations(),
        getAnimalBites()
      ]);
      setPatients(pData || []);
      setImmunizations(iData || []);
      setAnimalBites(bData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, [adminUser]);

  // Auth Handlers
  async function handleLogin(e) {
    e.preventDefault();
    setLoggingIn(true);
    setError("");
    try {
      const user = await adminLogin(loginForm);
      setAdminUser(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    adminLogout();
    setAdminUser(null);
    setActiveTab("census");
  }

  // Patient Handlers
  async function savePatient(e) {
    e.preventDefault();
    try {
      if (editingId) await updatePatient(editingId, patientForm);
      else await createPatient(patientForm);
      setPatientForm(initialPatientForm);
      setEditingId(null);
      loadAllData();
    } catch (err) { setError(err.message); }
  }

  // Animal Bite Protocol Logic
  async function generateBiteSchedule(patientId, animalType, incidentDate, protocolName) {
    const days = BITE_PROTOCOLS[protocolName];
    const incident = new Date(incidentDate);
    
    // Create the Bite Record
    const biteRecord = await createAnimalBite({
      patient_id: patientId,
      animal_type: animalType,
      incident_date: incidentDate,
      treatment_protocol: protocolName,
      total_required_doses: days.length,
      doses_administered: 0,
      treatment_status: 'pending'
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
    return {
      totalPatients: patients.length,
      totalVaccinations: immunizations.length,
      completedVaccines: immunizations.filter(i => i.status === 'completed').length,
      dueToday: immunizations.filter(i => i.scheduled_date === today && i.status !== 'completed').length,
      activeBiteCases: animalBites.filter(b => b.treatment_status !== 'completed').length
    };
  }, [patients, immunizations, animalBites]);

  if (!adminUser) {
    return (
      <main className="layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <section className="card" style={{ width: '100%', maxWidth: '400px' }}>
          <header style={{ flexDirection: 'column', textAlign: 'center', marginBottom: '2rem' }}>
            <h1>ImmunoRoster</h1>
            <p>Admin Secure Access</p>
          </header>
          {error && <div className="error-toast">{error}</div>}
          <form onSubmit={handleLogin} className="form-grid">
            <div className="input-group">
              <label>User ID</label>
              <input 
                value={loginForm.identifier} 
                onChange={e => setLoginForm({...loginForm, identifier: e.target.value})}
                placeholder="Username or Email" required
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input 
                type="password" 
                value={loginForm.password} 
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                placeholder="••••••••" required
              />
            </div>
            <button className="primary" disabled={loggingIn}>
              {loggingIn ? "Verifying..." : "Sign In"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="layout">
      <header>
        <div>
          <h1>ImmunoRoster</h1>
          <p>Health Unit Tracker & Census System</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{adminUser.full_name}</span>
          <button className="secondary" onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>Logout</button>
        </div>
      </header>

      <nav className="nav-tabs">
        <button className={`nav-tab ${activeTab === 'census' ? 'active' : ''}`} onClick={() => setActiveTab('census')}>📊 Census</button>
        <button className={`nav-tab ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>👤 Patients</button>
        <button className={`nav-tab ${activeTab === 'animal_bites' ? 'active' : ''}`} onClick={() => setActiveTab('animal_bites')}>🐕 Animal Bite</button>
        <button className={`nav-tab ${activeTab === 'immunizations' ? 'active' : ''}`} onClick={() => setActiveTab('immunizations')}>💉 Immunizations</button>
      </nav>

      {error && <div className="error-toast" onClick={() => setError("")}>{error}</div>}

      {activeTab === 'census' && (
        <section>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{stats.totalPatients}</span>
              <span className="stat-label">Registered Patients</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.totalVaccinations}</span>
              <span className="stat-label">Doses Logged</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.activeBiteCases}</span>
              <span className="stat-label">Active Bite Cases</span>
            </div>
            <div className="stat-card" style={{ borderRight: '4px solid var(--accent)' }}>
              <span className="stat-value" style={{ color: 'var(--accent)' }}>{stats.dueToday}</span>
              <span className="stat-label">Due Today</span>
            </div>
          </div>

          <div className="card">
            <h2>📅 Upcoming Reminders</h2>
            <ul className="data-list">
              {immunizations
                .filter(i => i.status !== 'completed' && new Date(i.scheduled_date) >= new Date())
                .slice(0, 5)
                .map(imm => (
                  <li key={imm.id} className="data-item">
                    <div className="data-main">
                      <span className="data-title">{imm.patients?.full_name}</span>
                      <span className="data-sub">{imm.vaccine_name} - Dose #{imm.dose_number}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-pending">{imm.scheduled_date}</span>
                    </div>
                  </li>
                ))
              }
              {immunizations.filter(i => i.status !== 'completed').length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No upcoming vaccinations.</p>}
            </ul>
          </div>
        </section>
      )}

      {activeTab === 'patients' && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
          <section className="card">
            <h2>{editingId ? "Edit Profile" : "Register Patient"}</h2>
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
                <input value={patientForm.barangay} onChange={e => setPatientForm({...patientForm, barangay: e.target.value})} />
              </div>
              <button className="primary">{editingId ? "Update" : "Register"}</button>
              {editingId && <button type="button" className="secondary" onClick={() => {setEditingId(null); setPatientForm(initialPatientForm)}}>Cancel</button>}
            </form>
          </section>

          <section className="card">
            <h2>Registry List</h2>
            <div className="data-list">
              {patients.map(p => (
                <div key={p.id} className="data-item">
                  <div className="data-main">
                    <span className="data-title">{p.full_name}</span>
                    <span className="data-sub">{p.barangay} • {p.date_of_birth}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => {setEditingId(p.id); setPatientForm(p)}}>Edit</button>
                    <button className="secondary" style={{ padding: '0.4rem 0.8rem', borderColor: '#ef4444', color: '#ef4444' }} onClick={async () => { if(confirm("Delete patient?")) { await deletePatient(p.id); loadAllData(); } }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'animal_bites' && (
        <section className="card">
          <h2>🐕 Log New Animal Bite Incident</h2>
          <form className="form-grid" onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await generateBiteSchedule(
              formData.get("patientId"),
              formData.get("animalType"),
              formData.get("incidentDate"),
              formData.get("protocol")
            );
            e.target.reset();
          }}>
            <div className="input-row">
              <div className="input-group">
                <label>Patient</label>
                <select name="patientId" required>
                  <option value="">Select Patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Animal Type</label>
                <input name="animalType" placeholder="e.g. Dog, Cat" required />
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Incident Date</label>
                <input type="date" name="incidentDate" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="input-group">
                <label>Protocol</label>
                <select name="protocol" required>
                  {Object.keys(BITE_PROTOCOLS).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <button className="primary">Generate Vaccination Schedule</button>
          </form>

          <h2 style={{ marginTop: '3rem' }}>Recent Bite Cases</h2>
          <div className="data-list">
            {animalBites.map(b => (
              <div key={b.id} className="data-item">
                <div className="data-main">
                  <span className="data-title">{b.patients?.full_name}</span>
                  <span className="data-sub">{b.animal_type} bite on {b.incident_date} • Protocol: {b.treatment_protocol}</span>
                </div>
                <span className={`badge badge-${b.treatment_status}`}>{b.treatment_status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'immunizations' && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
          <section className="card">
            <h2>💉 Log Vaccination</h2>
            <form className="form-grid" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              await createImmunization({
                patient_id: fd.get("patient_id"),
                vaccine_name: fd.get("vaccine"),
                dose_number: parseInt(fd.get("dose")),
                scheduled_date: fd.get("date"),
                status: 'pending'
              });
              loadAllData();
              e.target.reset();
            }}>
              <div className="input-group">
                <label>Patient</label>
                <select name="patient_id" required>
                  <option value="">Select...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Vaccine</label>
                <select name="vaccine" required>
                  {VACCINE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>Dose #</label>
                  <input type="number" name="dose" defaultValue="1" min="1" required />
                </div>
                <div className="input-group">
                  <label>Date</label>
                  <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <button className="primary">Add Record</button>
            </form>
          </section>

          <section className="card">
            <h2>Vaccination History & Schedule</h2>
            <div className="data-list">
              {immunizations.map(imm => (
                <div key={imm.id} className="data-item">
                  <div className="data-main">
                    <span className="data-title">{imm.patients?.full_name}</span>
                    <span className="data-sub">{imm.vaccine_name} (Dose #{imm.dose_number}) • Scheduled: {imm.scheduled_date}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span className={`badge badge-${imm.status}`}>{imm.status}</span>
                    {imm.status !== 'completed' && (
                      <button className="primary" style={{ padding: '0.4rem 1rem' }} onClick={async () => {
                        await updateImmunization(imm.id, { status: 'completed', administered_date: new Date().toISOString().split('T')[0] });
                        loadAllData();
                      }}>Mark Done</button>
                    )}
                    <button className="secondary" style={{ padding: '0.4rem 0.8rem', color: '#ef4444', borderColor: '#ef4444' }} onClick={async () => { if(confirm("Remove dose?")) { await deleteImmunization(imm.id); loadAllData(); } }}>Delete</button>
                  </div>
                </div>
              ))}
              {immunizations.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No records found.</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
