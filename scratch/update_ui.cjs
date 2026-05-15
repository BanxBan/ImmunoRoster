const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update EPI Mark Done button
const newEpiButton = '<button className="primary registry-action-btn" onClick={() => markImmunizationDone(imm.id, imm.notes)}>Mark Done</button>';

const lines = content.split(/\r?\n/);
const idx = lines.findIndex(l => l.includes('await updateImmunization(imm.id, { status: \'completed\', administered_date: new Date().toISOString().split(\'T\')[0] });'));
if (idx !== -1) {
    let start = idx;
    while (start > 0 && !lines[start].includes('<button')) start--;
    let end = idx;
    while (end < lines.length && !lines[end].includes('Mark Done</button>')) end++;
    lines.splice(start, end - start + 1, '                          ' + newEpiButton);
    content = lines.join('\n');
}

// 2. Update EPI Table (Bakuna Card)
const epiTableLines = content.split(/\r?\n/);
const doseMapIdx = epiTableLines.findIndex(l => l.includes('{[1, 2, 3, 4, 5].map(doseNum => {'));
if (doseMapIdx !== -1) {
    let start = -1;
    let end = -1;
    for (let i = doseMapIdx; i < epiTableLines.length; i++) {
        if (epiTableLines[i].includes('return (') && start === -1) start = i;
        if (epiTableLines[i].includes(');') && start !== -1) {
            end = i;
            break;
        }
    }
    if (start !== -1 && end !== -1) {
        const replacement = [
            '                                    return (',
            '                                      <td key={doseNum} className={`vc-date-cell ${isNA ? \'vc-date-na\' : \'\'} ${dose?.status === \'completed\' ? \'vc-date-done\' : dose?.status ? \'vc-date-pending\' : \'\'}`}>',
            '                                        {isNA ? \'\' : (',
            '                                          <>',
            '                                            <div>{dose?.date || \'—\'}</div>',
            '                                            {dose?.status === \'completed\' && (',
            '                                              <div style={{ fontSize: \'0.65rem\', fontWeight: 700, marginTop: \'2px\', color: \'#059669\' }}>',
            '                                                ✅ Done {dose?.record?.notes?.match(/\\[Done at (.*?)\\]/)?.[1] ? `at ${dose.record.notes.match(/\\[Done at (.*?)\\]/)[1]}` : \'\'}',
            '                                              </div>',
            '                                            )}',
            '                                          </>',
            '                                        )}',
            '                                      </td>',
            '                                    );'
        ].join('\n');
        epiTableLines.splice(start, end - start + 1, replacement);
        content = epiTableLines.join('\n');
    }
}

// 3. Update Animal Bite Table
const biteTableLines = content.split(/\r?\n/);
const biteScheduleIdx = biteTableLines.findIndex(l => l.includes('{schedule.map(([label, dt]) => ('));
if (biteScheduleIdx !== -1) {
    const replacement = [
        '                                              {schedule.map(([label, dt]) => {',
        '                                                const imm = bite.relatedImms?.find(i => i.scheduled_date === dt);',
        '                                                const isDone = imm?.status === \'completed\';',
        '                                                const doneTime = imm?.notes?.match(/\\[Done at (.*?)\\]/)?.[1];',
        '                                                return (',
        '                                                  <td key={`sch-${bite.id}-${label}`} className={`vc-date-cell ${isDone ? \'vc-date-done\' : \'\'}`}>',
        '                                                    <div>{dt || "—"}</div>',
        '                                                    {isDone && (',
        '                                                      <div style={{ fontSize: \'0.65rem\', fontWeight: 700, marginTop: \'2px\', color: \'#059669\' }}>',
        '                                                        ✅ Done {doneTime ? `at ${doneTime}` : \'\'}',
        '                                                      </div>',
        '                                                    )}',
        '                                                  </td>',
        '                                                );',
        '                                              })}'
    ].join('\n');
    
    let end = -1;
    for (let i = biteScheduleIdx; i < biteTableLines.length; i++) {
        if (biteTableLines[i].includes('))')) {
             end = i;
             break;
        }
    }
    if (end !== -1) {
        biteTableLines.splice(biteScheduleIdx, end - biteScheduleIdx + 1, replacement);
        content = biteTableLines.join('\n');
    }
}

fs.writeFileSync(filePath, content);
console.log('UI updated.');
