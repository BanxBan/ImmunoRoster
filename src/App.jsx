import { useEffect, useState } from "react";
import {
  adminLogin,
  adminLogout,
  createPatient,
  updatePatient,
  deletePatient,
  getAdminSession,
  searchPatients
} from "./api";

const initialPatientForm = {
  full_name: "",
  date_of_birth: "",
  sex: "",
  contact_number: "",
  barangay: "",
  municipality: "",
  address: ""
};

const initialFilterForm = {
  search: "",
  barangay: "",
  municipality: ""
};

export default function App() {
  const [adminUser, setAdminUser] = useState(() => getAdminSession());
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [loggingIn, setLoggingIn] = useState(false);
  const [patients, setPatients] = useState([]);
  const [patientForm, setPatientForm] = useState(initialPatientForm);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [filterForm, setFilterForm] = useState(initialFilterForm);
  const [savingPatient, setSavingPatient] = useState(false);
  const [error, setError] = useState("");

  async function loadData(filters = filterForm) {
    setError("");
    try {
      const patientsData = await searchPatients(filters);
      setPatients(patientsData || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!adminUser) return;
    loadData();
  }, [adminUser]);

  async function onLogin(event) {
    event.preventDefault();
    setLoggingIn(true);
    setError("");

    try {
      const user = await adminLogin(loginForm);
      setAdminUser(user);
      setLoginForm({ identifier: "", password: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoggingIn(false);
    }
  }

  async function onSavePatient(event) {
    event.preventDefault();
    setSavingPatient(true);
    setError("");

    try {
      if (editingPatientId) {
        await updatePatient(editingPatientId, patientForm);
      } else {
        await createPatient(patientForm);
      }
      setPatientForm(initialPatientForm);
      setEditingPatientId(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPatient(false);
    }
  }

  function onEditPatient(patient) {
    setEditingPatientId(patient.id);
    setPatientForm({
      full_name: patient.full_name || "",
      date_of_birth: patient.date_of_birth || "",
      sex: patient.sex || "",
      contact_number: patient.contact_number || "",
      barangay: patient.barangay || "",
      municipality: patient.municipality || "",
      address: patient.address || ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onDeletePatient(id) {
    if (!window.confirm("Are you sure you want to delete this patient record?")) return;
    try {
      await deletePatient(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSearchPatients(event) {
    event.preventDefault();
    await loadData(filterForm);
  }

  function onClearFilters() {
    setFilterForm(initialFilterForm);
    loadData(initialFilterForm);
  }

  function onLogout() {
    adminLogout();
    setAdminUser(null);
    setPatients([]);
    setError("");
  }

  function onExportToCSV() {
    if (patients.length === 0) return alert("No data to export");
    
    const headers = ["Patient Code", "Full Name", "Date of Birth", "Sex", "Contact", "Barangay", "Municipality", "Address"];
    const rows = patients.map(p => [
      p.patient_code || p.id.slice(0, 8),
      p.full_name,
      p.date_of_birth,
      p.sex || "N/A",
      p.contact_number || "N/A",
      p.barangay || "N/A",
      p.municipality || "N/A",
      p.address || "N/A"
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `patients_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const stats = {
    total: patients.length,
    male: patients.filter(p => p.sex?.toLowerCase() === 'male' || p.sex?.toLowerCase() === 'm').length,
    female: patients.filter(p => p.sex?.toLowerCase() === 'female' || p.sex?.toLowerCase() === 'f').length,
    barangays: new Set(patients.map(p => p.barangay).filter(Boolean)).size
  };

  if (!adminUser) {
    return (
      <main className="layout">
        <header>
          <h1>ImmunoRoster</h1>
          <p>Registry Access Portal</p>
        </header>

        {error ? <div className="error">{error}</div> : null}

        <section className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <h2>Admin Login</h2>
          <form onSubmit={onLogin} className="form-grid">
            <div className="input-group">
              <label>Identifier</label>
              <input
                type="text"
                value={loginForm.identifier}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, identifier: e.target.value })
                }
                placeholder="Username or email"
                required
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" disabled={loggingIn}>
              {loggingIn ? "Authenticating..." : "Sign In to Registry"}
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
          <p>Patient Registry & Demographic Insights</p>
        </div>
        <button className="btn-secondary" onClick={onLogout}>Sign Out</button>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Patients</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.male}</span>
          <span className="stat-label">Male</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.female}</span>
          <span className="stat-label">Female</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.barangays}</span>
          <span className="stat-label">Barangays</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="left-col">
          <section className="card">
            <h2>{editingPatientId ? "✏️ Edit Patient Profile" : "👤 Create Patient Profile"}</h2>
            <form onSubmit={onSavePatient} className="form-grid">
              <div className="input-group">
                <label>Full Name</label>
                <input
                  value={patientForm.full_name}
                  onChange={(e) => setPatientForm({ ...patientForm, full_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="input-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={patientForm.date_of_birth}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, date_of_birth: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Sex</label>
                  <select
                    value={patientForm.sex}
                    onChange={(e) => setPatientForm({ ...patientForm, sex: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label>Contact Number</label>
                <input
                  value={patientForm.contact_number}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, contact_number: e.target.value })
                  }
                  placeholder="0912 345 6789"
                />
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="input-group">
                  <label>Barangay</label>
                  <input
                    value={patientForm.barangay}
                    onChange={(e) => setPatientForm({ ...patientForm, barangay: e.target.value })}
                    placeholder="Barangay Name"
                  />
                </div>
                <div className="input-group">
                  <label>Municipality</label>
                  <input
                    value={patientForm.municipality}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, municipality: e.target.value })
                    }
                    placeholder="City/Town"
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Full Address</label>
                <textarea
                  value={patientForm.address}
                  onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                  placeholder="Street, House Number, etc."
                  rows="2"
                />
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: editingPatientId ? '1fr 1fr' : '1fr' }}>
                <button type="submit" disabled={savingPatient}>
                  {savingPatient ? "Saving..." : (editingPatientId ? "Update Profile" : "Add to Registry")}
                </button>
                {editingPatientId && (
                  <button type="button" className="btn-secondary" onClick={() => {
                    setEditingPatientId(null);
                    setPatientForm(initialPatientForm);
                  }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>

        <div className="right-col">
          <section className="card">
            <h2>🔍 Search & Filter</h2>
            <form onSubmit={onSearchPatients} className="form-grid">
              <div className="input-group">
                <label>Name Search</label>
                <input
                  value={filterForm.search}
                  onChange={(e) => setFilterForm({ ...filterForm, search: e.target.value })}
                  placeholder="Search by patient name"
                />
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="input-group">
                  <label>Barangay</label>
                  <input
                    value={filterForm.barangay}
                    onChange={(e) => setFilterForm({ ...filterForm, barangay: e.target.value })}
                    placeholder="Filter by area"
                  />
                </div>
                <div className="input-group">
                  <label>Municipality</label>
                  <input
                    value={filterForm.municipality}
                    onChange={(e) =>
                      setFilterForm({ ...filterForm, municipality: e.target.value })
                    }
                    placeholder="Filter by town"
                  />
                </div>
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <button type="submit">Apply Filters</button>
                <button type="button" className="btn-secondary" onClick={onClearFilters}>
                  Clear All
                </button>
              </div>
            </form>
          </section>

          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>📋 Registered Patients</h2>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={onExportToCSV}>
                Export CSV
              </button>
            </div>
            {patients.length > 0 ? (
              <ul className="patient-list">
                {patients.map((patient) => (
                  <li key={patient.id} className="patient-item">
                    <div className="patient-info">
                      <strong>{patient.full_name}</strong>
                      <span className="patient-meta">
                        {patient.patient_code || patient.id.slice(0, 8)} • {patient.sex || 'N/A'} • {new Date(patient.date_of_birth).toLocaleDateString()}
                      </span>
                      <div className="patient-meta" style={{ marginTop: '8px', color: 'var(--primary)', fontWeight: 'bold' }}>
                        {patient.barangay || 'N/A'}, {patient.municipality || 'N/A'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => onEditPatient(patient)}
                      >
                        Edit
                      </button>
                      <button 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#c53030' }}
                        onClick={() => onDeletePatient(patient.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '3rem', margin: 0 }}>📭</p>
                <p>No patients found in the registry.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
