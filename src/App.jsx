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
  deleteAnimalBite,
  getCommunityData,
  registerNurse,
  getCensus
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
  const [community, setCommunity] = useState([]);
  const [globalStats, setGlobalStats] = useState({ patients: [], immunizations: [], animalBites: [], community: [] });
  const [isSignup, setIsSignup] = useState(false);
  const [selectedPatientForLog, setSelectedPatientForLog] = useState(null);
  const [logType, setLogType] = useState(null); // 'epi' or 'bite'

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
    const { patients: gPatients = [], immunizations: gImms = [], animalBites: gBites = [], community: gComm = [] } = globalStats;
    
    // Group stats by Barangay
    const barangayStats = gPatients.reduce((acc, p) => {
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
      
      const pImms = gImms.filter(i => i.patient_id === p.id);
      acc[b].totalDoses += pImms.length;
      acc[b].completedDoses += pImms.filter(i => i.status === 'completed').length;
      
      const isFull = pImms.length > 0 && pImms.every(i => i.status === 'completed');
      if (isFull) acc[b].fullyImmunized++;
      
      return acc;
    }, {});

    return {
      totalPatients: gPatients.length,
      totalVaccinations: gImms.length,
      completedVaccines: gImms.filter(i => i.status === 'completed').length,
      dueToday: gImms.filter(i => i.scheduled_date === today && i.status !== 'completed').length,
      activeBiteCases: gBites.filter(b => b.treatment_status !== 'completed').length,
      barangayStats
    };
  }, [globalStats]);

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
            <span className="user-name" style={{ fontWeight: 700 }}>{adminUser.full_name}</span>
            <span className="badge badge-pending" style={{ padding: '0.2rem 0.6rem' }}>{adminUser.shift} Shift</span>
          </div>
        </div>
        <button className="secondary" style={{ padding: '0.4rem 1rem' }} onClick={handleLogout}>Sign Out</button>
      </header>

      <nav className="nav-tabs">
        <button className={`nav-tab ${activeTab === 'census' ? 'active' : ''}`} onClick={() => setActiveTab('census')}>📊 Census Summary</button>
        <button className={`nav-tab ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>👤 Pt Reg / Profile</button>
        <button className={`nav-tab ${activeTab === 'registry' ? 'active' : ''}`} onClick={() => setActiveTab('registry')}>📋 Registry List</button>
      </nav>

      {error && <div className="error-toast" onClick={() => setError("")}>{error}</div>}

      {activeTab === 'census' && (
        <section>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{stats.totalPatients}</span>
              <span className="stat-label">Total Registered</span>
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

          <div className="dashboard-grid">
            <div className="card" style={{ textAlign: 'center' }}>
              <h2>💉 Overall EPI Rate</h2>
              <div style={{ position: 'relative', height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '2rem 0' }}>
                <svg viewBox="0 0 36 36" style={{ width: '180px', height: '180px', transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <circle 
                    cx="18" cy="18" r="16" fill="none" stroke="var(--primary)" strokeWidth="3" 
                    strokeDasharray={`${(stats.completedVaccines / (stats.totalVaccinations || 1)) * 100} 100`}
                  />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{Math.round((stats.completedVaccines / (stats.totalVaccinations || 1)) * 100)}%</div>
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

            <div className="card">
              <h2>🏘️ Barangay Statistics</h2>
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

            <div className="card">
              <h2>📅 Upcoming EPI Reminders</h2>
              <ul className="data-list">
                {globalStats.immunizations
                  .filter(i => i.status !== 'completed' && new Date(i.scheduled_date) >= new Date())
                  .slice(0, 5)
                  .map(imm => (
                    <li key={imm.id} className="data-item">
                      <div className="data-main">
                        <span className="data-title">{globalStats.patients.find(p => p.id === imm.patient_id)?.full_name || 'Loading...'}</span>
                        <span className="data-sub">{imm.vaccine_name} - Dose #{imm.dose_number}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge badge-pending">{imm.scheduled_date}</span>
                      </div>
                    </li>
                  ))
                }
              </ul>
            </div>

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
          </div>
        </section>
      )}

      {activeTab === 'patients' && (
        <div className="dashboard-grid">
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
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button className="primary" style={{ flex: 1, padding: '0.6rem' }} onClick={() => { setSelectedPatientForLog(p); setLogType('epi'); }}>+ Log Clinical Activity</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => {setEditingId(p.id); setPatientForm(p)}}>Edit</button>
                    <button className="secondary" style={{ padding: '0.4rem 0.8rem', borderColor: '#ef4444', color: '#ef4444' }} onClick={async () => { if(confirm("Delete patient?")) { await deletePatient(p.id); loadAllData(); } }}>Delete</button>
                  </div>
                </div>
              ))}

              {selectedPatientForLog && (
                <div className="card" style={{ marginTop: '2rem', border: '2px solid var(--primary)', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>📋 Clinical Log for {selectedPatientForLog.full_name}</h2>
                    <button className="secondary" onClick={() => setSelectedPatientForLog(null)}>Close</button>
                  </div>
                  
                  <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                    <label>Activity Type</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <label className="radio-label">
                        <input type="radio" checked={logType === 'epi'} onChange={() => setLogType('epi')} /> EPI (Immunization)
                      </label>
                      <label className="radio-label">
                        <input type="radio" checked={logType === 'bite'} onChange={() => setLogType('bite')} /> Animal Bite Incident
                      </label>
                    </div>
                  </div>

                  {logType === 'bite' && (
                    <form className="form-grid" onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData(e.target);
                      await generateBiteSchedule(selectedPatientForLog.id, fd.get("animal"), fd.get("date"), fd.get("protocol"));
                      setSelectedPatientForLog(null);
                      loadAllData();
                    }}>
                      <div className="input-row">
                        <div className="input-group">
                          <label>Animal Type</label>
                          <input name="animal" placeholder="e.g. Dog, Cat" required />
                        </div>
                        <div className="input-group">
                          <label>Incident Date</label>
                          <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                        </div>
                      </div>
                      <div className="input-group">
                        <label>Treatment Protocol</label>
                        <select name="protocol" required>
                          {Object.keys(BITE_PROTOCOLS).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <button className="primary">Generate Treatment Schedule</button>
                    </form>
                  )}

                  {logType === 'epi' && (
                    <form className="form-grid" onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData(e.target);
                      await createImmunization({
                        patient_id: selectedPatientForLog.id,
                        vaccine_name: fd.get("vaccine"),
                        dose_number: parseInt(fd.get("dose")),
                        scheduled_date: fd.get("date"),
                        status: 'pending'
                      });
                      loadAllData();
                      setSelectedPatientForLog(null);
                    }}>
                      <div className="input-row">
                        <div className="input-group">
                          <label>Vaccine Name</label>
                          <select name="vaccine" required>
                            <option value="">Select Vaccine...</option>
                            {VACCINE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div className="input-group">
                          <label>Dose Number</label>
                          <input type="number" name="dose" defaultValue="1" min="1" required />
                        </div>
                      </div>
                      <div className="input-group">
                        <label>Scheduled Date</label>
                        <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                      </div>
                      <button className="primary">Add to Immunization Schedule</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'registry' && (
        <section>
          <div className="dashboard-grid">
            <div className="card">
              <h2>🐕 Animal Bite Registry</h2>
              <div className="data-list">
                {animalBites.map(b => (
                  <div key={b.id} className="data-item">
                    <div className="data-main">
                      <span className="data-title">{b.patients?.full_name}</span>
                      <span className="data-sub">Status: {b.doses_administered}/{b.total_required_doses} doses</span>
                      <span className="data-sub" style={{ fontSize: '0.75rem' }}>Hx: {b.animal_type} bite ({b.incident_date})</span>
                    </div>
                    <span className={`badge badge-${b.treatment_status}`}>{b.treatment_status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2>💉 EPI Registry (Active)</h2>
              <div className="data-list">
                {immunizations.filter(i => i.status !== 'completed').sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date)).map(imm => {
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
                      <button className="primary" style={{ padding: '0.4rem 0.8rem' }} onClick={async () => {
                        await updateImmunization(imm.id, { status: 'completed', administered_date: new Date().toISOString().split('T')[0] });
                        loadAllData();
                      }}>Mark Done</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
