import React from 'react';
import { useGameStore } from '../stores/gameStore';
import { Trophy, Check } from 'lucide-react';

export const AchievementsPanel: React.FC = () => {
  const achievements = useGameStore((state) => state.achievements);

  return (
    <div className="achievements-panel">
      <h2>Logros</h2>
      <div className="achievements-grid">
        {achievements.map((achievement) => (
          <div 
            key={achievement.id} 
            className={`achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'}`}
          >
            <div className="achievement-icon">
              {achievement.isUnlocked ? <Check size={24} /> : <Trophy size={24} />}
            </div>
            
            <div className="achievement-info">
              <h3>{achievement.name}</h3>
              <p>{achievement.description}</p>
              <span className="reward">Recompensa: ${achievement.reward.toLocaleString()}</span>
            </div>
            
            {achievement.isUnlocked && achievement.unlockedAt && (
              <div className="unlocked-date">
                Desbloqueado: {new Date(achievement.unlockedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
