import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { MINER_TEMPLATES } from '../data/gameData';
import type { MinerType, Region } from '../types';
import { 
  Cpu, 
  Monitor, 
  Box, 
  Atom, 
  Brain,
  Plus,
  Power,
  ArrowUp,
  Trash2
} from 'lucide-react';

const MINER_ICONS: Record<MinerType, React.ReactNode> = {
  'cpu-miner': <Cpu size={20} />,
  'gpu-miner': <Monitor size={20} />,
  'asic-miner': <Box size={20} />,
  'quantum-miner': <Atom size={20} />,
  'neural-miner': <Brain size={20} />,
};

export const MinerShop: React.FC = () => {
  const regions = useGameStore((state) => state.regions);
  const buyMiner = useGameStore((state) => state.buyMiner);
  const credits = useGameStore((state) => state.resources.credits);
  const [selectedRegion, setSelectedRegion] = useState<Region>('us-east');

  const unlockedRegions = regions.filter(r => r.isUnlocked);

  return (
    <div className="miner-shop">
      <h2>Tienda de Mineros</h2>
      
      <div className="region-selector">
        <label>Región:</label>
        <select 
          value={selectedRegion} 
          onChange={(e) => setSelectedRegion(e.target.value as Region)}
        >
          {unlockedRegions.map(region => (
            <option key={region.id} value={region.id}>
              {region.name} (Ef: {(region.coolingEfficiency * 100).toFixed(0)}%)
            </option>
          ))}
        </select>
      </div>

      <div className="miner-grid">
        {(Object.keys(MINER_TEMPLATES) as MinerType[]).map((type) => {
          const template = MINER_TEMPLATES[type];
          const canAfford = credits >= template.cost;

          return (
            <div key={type} className={`miner-card ${!canAfford ? 'disabled' : ''}`}>
              <div className="miner-icon">{MINER_ICONS[type]}</div>
              <h3>{template.name}</h3>
              <div className="miner-stats">
                <span>Hash: {template.miningPower.hashRate} H/s</span>
                <span>Energía: {template.miningPower.powerConsumption} kW</span>
                <span>Eficiencia: {template.miningPower.efficiency}</span>
              </div>
              <div className="miner-cost">
                <span className={canAfford ? 'affordable' : 'expensive'}>
                  ${template.cost.toLocaleString()}
                </span>
              </div>
              <button 
                onClick={() => buyMiner(type, selectedRegion)}
                disabled={!canAfford}
                className="buy-btn"
              >
                <Plus size={16} /> Comprar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MinerList: React.FC = () => {
  const miners = useGameStore((state) => state.miners);
  const toggleMiner = useGameStore((state) => state.toggleMiner);
  const sellMiner = useGameStore((state) => state.sellMiner);
  const upgradeMiner = useGameStore((state) => state.upgradeMiner);
  const formatNumber = (num: number) => num.toLocaleString();

  if (miners.length === 0) {
    return (
      <div className="miner-list empty">
        <p>No tienes mineros aún. ¡Compra tu primer minero en la tienda!</p>
      </div>
    );
  }

  return (
    <div className="miner-list">
      <h2>Tus Mineros ({miners.length})</h2>
      <div className="miners-grid">
        {miners.map((miner) => (
          <div key={miner.id} className={`miner-item ${!miner.isActive ? 'inactive' : ''}`}>
            <div className="miner-header">
              <span className="miner-name">{miner.name}</span>
              <span className="miner-level">Lv.{miner.level}</span>
            </div>
            
            <div className="miner-details">
              <div className="detail">
                <span className="label">Hash Rate:</span>
                <span className="value">{formatNumber(miner.miningPower.hashRate)} H/s</span>
              </div>
              <div className="detail">
                <span className="label">Energía:</span>
                <span className="value">{miner.miningPower.powerConsumption} kW</span>
              </div>
              <div className="detail">
                <span className="label">Ubicación:</span>
                <span className="value">{miner.location}</span>
              </div>
              <div className="detail">
                <span className="label">Uptime:</span>
                <span className="value">{miner.uptime}%</span>
              </div>
            </div>

            <div className="miner-actions">
              <button 
                onClick={() => toggleMiner(miner.id)}
                className={`action-btn ${miner.isActive ? 'active' : ''}`}
                title={miner.isActive ? 'Apagar' : 'Encender'}
              >
                <Power size={16} />
              </button>
              
              <button 
                onClick={() => upgradeMiner(miner.id)}
                className="action-btn upgrade"
                title="Mejorar"
              >
                <ArrowUp size={16} />
              </button>
              
              <button 
                onClick={() => sellMiner(miner.id)}
                className="action-btn sell"
                title="Vender"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
