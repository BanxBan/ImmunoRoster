const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'styles.css');
const newStyles = `
/* Registry Enhanced UI */
.registry-search-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 2rem;
}

@media (max-width: 768px) {
  .registry-search-container {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
}

.search-wrapper {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 0.8rem 1rem 0.8rem 2.8rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: white;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.1rem;
  opacity: 0.5;
  pointer-events: none;
}

.pagination-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
}

.pagination-stats {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 600;
}

.pagination-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem;
  border-radius: 16px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
}

.pg-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.pg-btn:hover:not(:disabled) {
  background: var(--primary-light);
  color: var(--primary);
  transform: translateY(-1px);
}

.pg-btn.active {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 15px hsla(230, 85%, 60%, 0.3);
}

.pg-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
  transform: none !important;
}

.pg-arrow {
  font-size: 1.4rem;
  line-height: 1;
}
`;

fs.appendFileSync(filePath, newStyles);
console.log('Enhanced UI Styles appended.');
