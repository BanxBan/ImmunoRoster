import { useEffect, useState } from "react";
import {
  adminLogin,
  adminLogout,
  createPatient,
  getAdminSession,
  getDueImmunizations,
  getDueMedications,
  getPatients
} from "./api";

const initialForm = {
  full_name: "",
  date_of_birth: "",
  sex: "",
  contact_number: "",
  address: ""
};

export default function App() {
  const [adminUser, setAdminUser] = useState(() => getAdminSession());
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [loggingIn, setLoggingIn] = useState(false);
  const [patients, setPatients] = useState([]);
  const [boosterDue, setBoosterDue] = useState([]);
  const [refillDue, setRefillDue] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    setError("");
    try {
      const [patientsData, boosters, refills] = await Promise.all([
        getPatients(),
        getDueImmunizations(),
        getDueMedications()
      ]);

      setPatients(patientsData || []);
      setBoosterDue(boosters || []);
      setRefillDue(refills || []);
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

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createPatient(form);
      setForm(initialForm);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function onLogout() {
    adminLogout();
    setAdminUser(null);
    setPatients([]);
    setBoosterDue([]);
    setRefillDue([]);
    setError("");
  }

  if (!adminUser) {
    return (
      <main className="layout">
        <header>
          <h1>ImmunoRoster Admin</h1>
          <p>Sign in with your admin credentials to access the dashboard.</p>
        </header>

        {error ? <div className="error">{error}</div> : null}

        <section className="card">
          <h2>Admin Login</h2>
          <form onSubmit={onLogin} className="form-grid">
            <input
              type="text"
              value={loginForm.identifier}
              onChange={(e) =>
                setLoginForm({ ...loginForm, identifier: e.target.value })
              }
              placeholder="Username or email"
              required
            />
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              placeholder="Password"
              required
            />
            <button type="submit" disabled={loggingIn}>
              {loggingIn ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="layout">
      <header>
        <h1>ImmunoRoster</h1>
        <p>Vaccination and medication tracking dashboard.</p>
        <button onClick={onLogout}>Sign Out</button>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <section className="card">
        <h2>Add Patient</h2>
        <form onSubmit={onSubmit} className="form-grid">
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Full name"
            required
          />
          <input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
            required
          />
          <input
            value={form.sex}
            onChange={(e) => setForm({ ...form, sex: e.target.value })}
            placeholder="Sex"
          />
          <input
            value={form.contact_number}
            onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
            placeholder="Contact number"
          />
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Address"
          />
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Add Patient"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Patients ({patients.length})</h2>
        <ul>
          {patients.map((patient) => (
            <li key={patient.id}>
              {patient.full_name} ({patient.date_of_birth})
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Booster Due ({boosterDue.length})</h2>
        <ul>
          {boosterDue.map((item) => (
            <li key={item.id}>
              {item.vaccine_name} - {item.scheduled_date || item.next_due_date}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Medication Refill Due ({refillDue.length})</h2>
        <ul>
          {refillDue.map((item) => (
            <li key={item.id}>
              {item.medication_name} - {item.next_refill_date}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
