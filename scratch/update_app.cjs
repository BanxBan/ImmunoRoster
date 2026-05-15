const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacementFuncs = `  async function markImmunizationDone(id, currentNotes = "") {
    try {
      setLoading(true);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      
      let newNotes = currentNotes || "";
      if (!newNotes.includes("[Done at")) {
        newNotes = newNotes ? \`\${newNotes} [Done at \${timeStr}]\` : \`[Done at \${timeStr}]\`;
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
        newNotes = currentNotes ? \`\${currentNotes} [Done at \${timeStr}]\` : \`[Done at \${timeStr}]\`;
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
  }`;

const lines = content.split(/\r?\n/);
const startIdx = lines.findIndex(l => l.includes('async function markBiteDoseDone(biteId, doseImmId) {'));
if (startIdx !== -1) {
    let braceCount = 0;
    let endIdx = -1;
    for (let i = startIdx; i < lines.length; i++) {
        if (lines[i].includes('{')) braceCount++;
        if (lines[i].includes('}')) braceCount--;
        if (braceCount === 0) {
            endIdx = i;
            break;
        }
    }
    if (endIdx !== -1) {
        lines.splice(startIdx, endIdx - startIdx + 1, replacementFuncs);
    }
}

const biteRecordsIdx = lines.findIndex(l => l.includes('const selectedRegistryBiteRecords = useMemo(() => {'));
if (biteRecordsIdx !== -1) {
    let braceCount = 0;
    let endIdx = -1;
    for (let i = biteRecordsIdx; i < lines.length; i++) {
        if (lines[i].includes('{')) braceCount++;
        if (lines[i].includes('}')) braceCount--;
        if (braceCount === 0) {
            endIdx = i;
            break;
        }
    }
    if (endIdx !== -1) {
        const replacementBiteMemo = `  const selectedRegistryBiteRecords = useMemo(() => {
    if (!selectedRegistryBiteHistoryPatientId) return [];
    const patientBites = animalBites.filter((b) => b.patient_id === selectedRegistryBiteHistoryPatientId);
    const patientImms = immunizations.filter((imm) => imm.patient_id === selectedRegistryBiteHistoryPatientId);

    return patientBites.map(bite => {
      // Link immunizations that were created for this bite case
      const relatedImms = patientImms.filter(imm => 
        imm.notes?.includes(\`Bite Case #\${bite.id.slice(0, 5)}\`)
      );
      return { ...bite, relatedImms };
    }).sort((a, b) => new Date(b.incident_date || "1900-01-01") - new Date(a.incident_date || "1900-01-01"))
      .slice(0, 12);
  }, [animalBites, immunizations, selectedRegistryBiteHistoryPatientId]);`;
        lines.splice(biteRecordsIdx, endIdx - biteRecordsIdx + 1, replacementBiteMemo);
    }
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log('File updated.');
