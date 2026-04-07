import React from 'react';
import { useGameStore } from '../stores/gameStore';
import { MapPin, Lock, Unlock } from 'lucide-react';

export const RegionMap: React.FC = () => {
  const regions = useGameStore((state) => state.regions);
  const unlockRegion = useGameStore((state) => state.unlockRegion);
  const credits = useGameStore((state) => state.resources.credits);

  return (
    <div className="region-map">
      <h2>Mapa de Regiones</h2>
      <div className="regions-grid">
        {regions.map((region) => {
          const canUnlock = !region.isUnlocked && credits >= region.unlockCost;

          return (
            <div 
              key={region.id} 
              className={`region-card ${region.isUnlocked ? 'unlocked' : 'locked'}`}
            >
              <div className="region-icon">
                <MapPin size={24} />
              </div>
              
              <h3>{region.name}</h3>
              
              <div className="region-stats">
                <div className="stat">
                  <span className="label">Costo electricidad:</span>
                  <span className="value">${region.electricityCost}/kWh</span>
                </div>
                <div className="stat">
                  <span className="label">Enfriamiento:</span>
                  <span className="value">{(region.coolingEfficiency * 100).toFixed(0)}%</span>
                </div>
                <div className="stat">
                  <span className="label">Latencia:</span>
                  <span className="value">{region.latency}ms</span>
                </div>
              </div>

              {region.isUnlocked ? (
                <div className="region-status unlocked">
                  <Unlock size={16} />
                  <span>Desbloqueada</span>
                </div>
              ) : (
                <button
                  onClick={() => unlockRegion(region.id)}
                  disabled={!canUnlock}
                  className="unlock-btn"
                >
                  <Lock size={16} />
                  Desbloquear (${region.unlockCost.toLocaleString()})
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
