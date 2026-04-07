import React from 'react';
import { useGameStore } from '../stores/gameStore';
import { useFormatNumber, useFormatHashRate } from '../hooks/useGame';
import { 
  Coins, 
  Zap, 
  TrendingUp, 
  Activity,
  Server,
  Globe
} from 'lucide-react';

export const ResourcePanel: React.FC = () => {
  const resources = useGameStore((state) => state.resources);
  const stats = useGameStore((state) => state.getMiningStats());
  const miners = useGameStore((state) => state.miners);
  const regions = useGameStore((state) => state.regions);
  const formatNumber = useFormatNumber();
  const formatHashRate = useFormatHashRate();

  const activeMiners = miners.filter(m => m.isActive).length;
  const unlockedRegions = regions.filter(r => r.isUnlocked).length;

  return (
    <div className="resource-panel">
      <div className="resource-grid">
        <div className="resource-card credits">
          <div className="resource-icon">
            <Coins size={24} />
          </div>
          <div className="resource-info">
            <span className="resource-label">Créditos</span>
            <span className="resource-value">{formatNumber(resources.credits)}</span>
          </div>
        </div>

        <div className="resource-card hashrate">
          <div className="resource-icon">
            <Activity size={24} />
          </div>
          <div className="resource-info">
            <span className="resource-label">Hash Rate</span>
            <span className="resource-value">{formatHashRate(stats.totalHashRate)}</span>
          </div>
        </div>

        <div className="resource-card earnings">
          <div className="resource-icon">
            <TrendingUp size={24} />
          </div>
          <div className="resource-info">
            <span className="resource-label">Ganancia/min</span>
            <span className="resource-value">+{formatNumber(stats.estimatedEarnings)}</span>
          </div>
        </div>

        <div className="resource-card energy">
          <div className="resource-icon">
            <Zap size={24} />
          </div>
          <div className="resource-info">
            <span className="resource-label">Energía</span>
            <span className="resource-value">
              {formatNumber(stats.totalPowerConsumption)} / {formatNumber(resources.maxEnergy)} kW
            </span>
          </div>
          <div className="resource-bar">
            <div 
              className="resource-bar-fill"
              style={{ 
                width: `${Math.min(100, (stats.totalPowerConsumption / resources.maxEnergy) * 100)}%`,
                backgroundColor: stats.totalPowerConsumption > resources.maxEnergy * 0.9 ? '#ef4444' : '#22c55e'
              }}
            />
          </div>
        </div>

        <div className="resource-card miners">
          <div className="resource-icon">
            <Server size={24} />
          </div>
          <div className="resource-info">
            <span className="resource-label">Mineros</span>
            <span className="resource-value">
              {activeMiners} / {miners.length}
            </span>
          </div>
        </div>

        <div className="resource-card regions">
          <div className="resource-icon">
            <Globe size={24} />
          </div>
          <div className="resource-info">
            <span className="resource-label">Regiones</span>
            <span className="resource-value">
              {unlockedRegions} / {regions.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
