const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update Patient History Modal (EPI)
const epiHistoryRegex = /<span className="data-sub">Given: {imm\.administered_date \|\| "Not yet"}<\/span>/g;
content = content.replace(epiHistoryRegex, '<span className="data-sub">Given: {imm.administered_date || "Not yet"}{imm.status === "completed" && imm.notes?.includes("[Done at ") ? ` at ${imm.notes.match(/\\[Done at (.*?)\\]/)[1]}` : ""}</span>');

// Update Recent History (EPI) - Registry
const epiRegistryHistoryRegex = /{imm\.vaccine_name} \(# {imm\.dose_number}\) • Accomplished: {imm\.administered_date \|\| imm\.scheduled_date}/g;
content = content.replace(epiRegistryHistoryRegex, '{imm.vaccine_name} (# {imm.dose_number}) • Accomplished: {imm.administered_date || imm.scheduled_date}{imm.notes?.includes("[Done at ") ? ` at ${imm.notes.match(/\\[Done at (.*?)\\]/)[1]}` : ""}');

fs.writeFileSync(filePath, content);
console.log('History views updated.');
