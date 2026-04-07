import React from 'react';
import { useGameStore } from '../stores/gameStore';
import { Zap, Battery, Thermometer, Wrench, Atom, Check } from 'lucide-react';

const ICONS: Record<string, React.ReactNode> = {
  'Zap': <Zap size={20} />,
  'Battery': <Battery size={20} />,
  'Thermometer': <Thermometer size={20} />,
  'Wrench': <Wrench size={20} />,
  'Atom': <Atom size={20} />,
};

export const UpgradesPanel: React.FC = () => {
  const upgrades = useGameStore((state) => state.upgrades);
  const buyUpgrade = useGameStore((state) => state.buyUpgrade);
  const credits = useGameStore((state) => state.resources.credits);

  return (
    <div className="upgrades-panel">
      <h2>Mejoras</h2>
      <div className="upgrades-grid">
        {upgrades.map((upgrade) => {
          const cost = Math.floor(upgrade.cost * Math.pow(1.5, upgrade.currentLevel));
          const canAfford = credits >= cost;
          const isMaxed = upgrade.currentLevel >= upgrade.maxLevel;

          return (
            <div key={upgrade.id} className={`upgrade-card ${isMaxed ? 'maxed' : ''}`}>
              <div className="upgrade-icon">{ICONS[upgrade.icon] || <Zap size={20} />}</div>
              
              <h3>{upgrade.name}</h3>
              <p className="upgrade-description">{upgrade.description}</p>
              
              <div className="upgrade-progress">
                <span>Nivel: {upgrade.currentLevel} / {upgrade.maxLevel}</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${(upgrade.currentLevel / upgrade.maxLevel) * 100}%` }}
                  />
                </div>
              </div>

              {!isMaxed ? (
                <button
                  onClick={() => buyUpgrade(upgrade.id)}
                  disabled={!canAfford}
                  className="upgrade-btn"
                >
                  {canAfford ? (
                    <>Mejorar (${cost.toLocaleString()})</>
                  ) : (
                    <>Necesitas ${cost.toLocaleString()}</>
                  )}
                </button>
              ) : (
                <div className="maxed-badge">
                  <Check size={16} /> Máximo
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
