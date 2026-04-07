import { useState } from 'react';
import { useGameLoop } from './hooks/useGame';
import { ResourcePanel } from './components/ResourcePanel';
import { MinerShop, MinerList } from './components/MinerManager';
import { RegionMap } from './components/RegionMap';
import { UpgradesPanel } from './components/UpgradesPanel';
import { AchievementsPanel } from './components/AchievementsPanel';
import { useGameStore } from './stores/gameStore';
import { 
  Server, 
  MapPin, 
  Zap, 
  Trophy, 
  RotateCcw,
  Cpu
} from 'lucide-react';
import './App.css';

type Tab = 'miners' | 'regions' | 'upgrades' | 'achievements';

function App() {
  useGameLoop();
  const [activeTab, setActiveTab] = useState<Tab>('miners');
  const resetGame = useGameStore((state) => state.resetGame);
  const totalMined = useGameStore((state) => state.totalMined);

  const handleReset = () => {
    if (confirm('¿Estás seguro de reiniciar el juego? Perderás todo tu progreso.')) {
      resetGame();
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <Cpu size={32} />
          <h1>MiningJeez</h1>
        </div>
        <div className="header-stats">
          <span>Total minado: ${totalMined.toLocaleString()}</span>
          <button onClick={handleReset} className="reset-btn" title="Reiniciar juego">
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <ResourcePanel />

      <nav className="app-nav">
        <button 
          className={activeTab === 'miners' ? 'active' : ''}
          onClick={() => setActiveTab('miners')}
        >
          <Server size={18} /> Mineros
        </button>
        <button 
          className={activeTab === 'regions' ? 'active' : ''}
          onClick={() => setActiveTab('regions')}
        >
          <MapPin size={18} /> Regiones
        </button>
        <button 
          className={activeTab === 'upgrades' ? 'active' : ''}
          onClick={() => setActiveTab('upgrades')}
        >
          <Zap size={18} /> Mejoras
        </button>
        <button 
          className={activeTab === 'achievements' ? 'active' : ''}
          onClick={() => setActiveTab('achievements')}
        >
          <Trophy size={18} /> Logros
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'miners' && (
          <>
            <MinerShop />
            <MinerList />
          </>
        )}
        {activeTab === 'regions' && <RegionMap />}
        {activeTab === 'upgrades' && <UpgradesPanel />}
        {activeTab === 'achievements' && <AchievementsPanel />}
      </main>

      <footer className="app-footer">
        <p>MiningJeez © 2024 - Estrategia de Minado en la Nube</p>
      </footer>
    </div>
  );
}

export default App;
