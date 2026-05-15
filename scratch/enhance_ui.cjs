const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split(/\r?\n/);

// 1. Update Registry Header & Search Bar
const searchIdx = lines.findIndex(l => l.includes('<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", gap: "1rem" }}>'));
if (searchIdx !== -1) {
    const newSearchBar = [
        '            <div className="registry-search-container">',
        '              <h2 style={{ margin: 0 }}>General Patient Registry</h2>',
        '              <div className="search-wrapper">',
        '                <span className="search-icon">🔍</span>',
        '                <input ',
        '                  type="text" ',
        '                  className="search-input"',
        '                  placeholder="Search by name, barangay, or contact..." ',
        '                  value={registrySearch}',
        '                  onChange={e => setRegistrySearch(e.target.value)}',
        '                />',
        '                {registrySearch && (',
        '                  <button ',
        '                    onClick={() => setRegistrySearch("")} ',
        '                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", fontSize: "1.1rem", opacity: 0.4 }}',
        '                  >✕</button>',
        '                )}',
        '              </div>',
        '            </div>'
    ].join('\n');
    
    let depth = 1;
    let end = searchIdx;
    for (let i = searchIdx + 1; i < lines.length; i++) {
        if (lines[i].includes('<div')) depth++;
        if (lines[i].includes('</div>')) depth--;
        if (depth === 0) {
            end = i;
            break;
        }
    }
    lines.splice(searchIdx, end - searchIdx + 1, newSearchBar);
}

// 2. Update Pagination Controls
const paginationIdx = lines.findIndex(l => l.includes('<div className="pagination">'));
if (paginationIdx !== -1) {
    const newPagination = [
        '              {totalRegistryPages > 1 && (',
        '                <div className="pagination-container">',
        '                  <div className="pagination-stats">',
        '                    Showing <strong>{((registryPage - 1) * registryItemsPerPage) + 1}</strong> to <strong>{Math.min(registryPage * registryItemsPerPage, filteredPatients.length)}</strong> of <strong>{filteredPatients.length}</strong> patients',
        '                  </div>',
        '                  <div className="pagination-nav">',
        '                    <button ',
        '                      className="pg-btn" ',
        '                      disabled={registryPage === 1} ',
        '                      onClick={() => setRegistryPage(p => Math.max(1, p - 1))}',
        '                      title="Previous Page"',
        '                    >',
        '                      <span className="pg-arrow">‹</span>',
        '                    </button>',
        '                    ',
        '                    <div style={{ display: "flex", gap: "0.4rem" }}>',
        '                      {Array.from({ length: totalRegistryPages }, (_, i) => i + 1).map(page => {',
        '                        if (totalRegistryPages > 7) {',
        '                          if (page !== 1 && page !== totalRegistryPages && (page < registryPage - 1 || page > registryPage + 1)) {',
        '                            if (page === registryPage - 2 || page === registryPage + 2) return <span key={page} style={{ padding: "0 0.5rem", opacity: 0.4 }}>...</span>;',
        '                            return null;',
        '                          }',
        '                        }',
        '                        return (',
        '                          <button ',
        '                            key={page} ',
        '                            className={`pg-btn ${registryPage === page ? "active" : ""}`} ',
        '                            onClick={() => setRegistryPage(page)}',
        '                          >',
        '                            {page}',
        '                          </button>',
        '                        );',
        '                      })}',
        '                    </div>',
        '                    ',
        '                    <button ',
        '                      className="pg-btn" ',
        '                      disabled={registryPage === totalRegistryPages} ',
        '                      onClick={() => setRegistryPage(p => Math.min(totalRegistryPages, p + 1))}',
        '                      title="Next Page"',
        '                    >',
        '                      <span className="pg-arrow">›</span>',
        '                    </button>',
        '                  </div>',
        '                </div>',
        '              )}'
    ].join('\n');
    
    let depth = 1;
    let end = paginationIdx;
    for (let i = paginationIdx + 1; i < lines.length; i++) {
        if (lines[i].includes('<div')) depth++;
        if (lines[i].includes('</div>')) depth--;
        if (depth === 0) {
            end = i;
            break;
        }
    }
    
    let wrapStart = paginationIdx;
    while (wrapStart > 0 && !lines[wrapStart].includes('{totalRegistryPages > 1 && (')) wrapStart--;
    let wrapEnd = end;
    while (wrapEnd < lines.length && !lines[wrapEnd].includes(')}')) wrapEnd++;
    
    lines.splice(wrapStart, wrapEnd - wrapStart + 1, newPagination);
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Nicer Pagination and Search UI updated.');
