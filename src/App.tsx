import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import MathSetsPage from './pages/MathSetsPage';

function App() {
  const [activeTab, setActiveTab] = useState<'inclusion' | 'variations' | 'pascal'>('inclusion');

  return (
    <ThemeProvider>
      <MathSetsPage initialMode={activeTab} onNavigate={(p) => setActiveTab(p as any)} />
    </ThemeProvider>
  );
}

export default App;

