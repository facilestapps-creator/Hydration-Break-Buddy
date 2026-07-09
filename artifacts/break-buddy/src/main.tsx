import { createRoot } from 'react-dom/client';
import './i18n';
import { applyDocumentDir } from './i18n';
import i18n from 'i18next';

import App from './App';
import './index.css';

// Apply dir/lang on initial load
applyDocumentDir(i18n.language);

// Keep dir/lang in sync when language changes
i18n.on('languageChanged', applyDocumentDir);

createRoot(document.getElementById('root')!).render(<App />);
