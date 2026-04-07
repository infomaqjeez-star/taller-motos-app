import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  GameState, 
  CloudMiner, 
  Region, 
  MinerType, 
  MiningStats
} from '../types';
import { MINER_TEMPLATES, REGIONS, UPGRADES, ACHIEVEMENTS } from '../data/gameData';

interface GameStore extends GameState {
  // Acciones de recursos
  addCredits: (amount: number) => void;
  spendCredits: (amount: number) => boolean;
  
  // Acciones de mineros
  buyMiner: (type: MinerType, region: Region) => boolean;
  sellMiner: (minerId: string) => void;
  toggleMiner: (minerId: string) => void;
  upgradeMiner: (minerId: string) => boolean;
  
  // Acciones de regiones
  unlockRegion: (regionId: Region) => boolean;
  
  // Acciones de mejoras
  buyUpgrade: (upgradeId: string) => boolean;
  
  // Cálculos
  getMiningStats: () => MiningStats;
  getRegionMultiplier: (region: Region) => number;
  getUpgradeMultiplier: (minerType: MinerType) => number;
  
  // Game loop
  tick: (deltaTime: number) => void;
  
  // Utilidades
  resetGame: () => void;
  checkAchievements: () => void;
}

const initialState: GameState = {
  resources: {
    credits: 1000,
    cpu: 100,
    maxCpu: 100,
    energy: 500,
    maxEnergy: 500,
    bandwidth: 1000,
    maxBandwidth: 1000,
  },
  miners: [],
  regions: REGIONS,
  upgrades: UPGRADES,
  achievements: ACHIEVEMENTS,
  market: [],
  gameTime: 0,
  totalMined: 0,
  startTime: Date.now(),
  lastSave: Date.now(),
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addCredits: (amount) => {
        set((state) => ({
          resources: {
            ...state.resources,
            credits: state.resources.credits + amount,
          },
          totalMined: state.totalMined + amount,
        }));
        get().checkAchievements();
      },

      spendCredits: (amount) => {
        const { credits } = get().resources;
        if (credits >= amount) {
          set((state) => ({
            resources: {
              ...state.resources,
              credits: credits - amount,
            },
          }));
          return true;
        }
        return false;
      },

      buyMiner: (type, region) => {
        const template = MINER_TEMPLATES[type];
        const regionData = get().regions.find(r => r.id === region);
        
        if (!regionData?.isUnlocked) return false;
        if (!get().spendCredits(template.cost)) return false;

        const newMiner: CloudMiner = {
          ...template,
          id: `miner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          location: region,
          installedAt: Date.now(),
        };

        set((state) => ({
          miners: [...state.miners, newMiner],
          resources: {
            ...state.resources,
            maxCpu: state.resources.maxCpu + 10,
            maxEnergy: state.resources.maxEnergy + template.miningPower.powerConsumption * 2,
          },
        }));

        get().checkAchievements();
        return true;
      },

      sellMiner: (minerId) => {
        const miner = get().miners.find(m => m.id === minerId);
        if (!miner) return;

        const sellPrice = Math.floor(miner.cost * 0.7);
        
        set((state) => ({
          miners: state.miners.filter(m => m.id !== minerId),
          resources: {
            ...state.resources,
            credits: state.resources.credits + sellPrice,
            maxCpu: Math.max(100, state.resources.maxCpu - 10),
            maxEnergy: Math.max(500, state.resources.maxEnergy - miner.miningPower.powerConsumption * 2),
          },
        }));
      },

      toggleMiner: (minerId) => {
        set((state) => ({
          miners: state.miners.map(miner =>
            miner.id === minerId ? { ...miner, isActive: !miner.isActive } : miner
          ),
        }));
      },

      upgradeMiner: (minerId) => {
        const miner = get().miners.find(m => m.id === minerId);
        if (!miner) return false;

        const upgradeCost = Math.floor(miner.cost * 0.5 * miner.level);
        if (!get().spendCredits(upgradeCost)) return false;

        set((state) => ({
          miners: state.miners.map(m =>
            m.id === minerId
              ? {
                  ...m,
                  level: m.level + 1,
                  miningPower: {
                    ...m.miningPower,
                    hashRate: m.miningPower.hashRate * 1.2,
                    efficiency: m.miningPower.efficiency * 1.1,
                  },
                }
              : m
          ),
        }));
        return true;
      },

      unlockRegion: (regionId) => {
        const region = get().regions.find(r => r.id === regionId);
        if (!region || region.isUnlocked) return false;
        
        if (!get().spendCredits(region.unlockCost)) return false;

        set((state) => ({
          regions: state.regions.map(r =>
            r.id === regionId ? { ...r, isUnlocked: true } : r
          ),
        }));

        get().checkAchievements();
        return true;
      },

      buyUpgrade: (upgradeId) => {
        const upgrade = get().upgrades.find(u => u.id === upgradeId);
        if (!upgrade || upgrade.currentLevel >= upgrade.maxLevel) return false;
        
        const cost = Math.floor(upgrade.cost * Math.pow(1.5, upgrade.currentLevel));
        if (!get().spendCredits(cost)) return false;

        set((state) => ({
          upgrades: state.upgrades.map(u =>
            u.id === upgradeId ? { ...u, currentLevel: u.currentLevel + 1 } : u
          ),
        }));
        return true;
      },

      getMiningStats: () => {
        const { miners } = get();
        const activeMiners = miners.filter(m => m.isActive);
        
        let totalHashRate = 0;
        let totalPowerConsumption = 0;
        let totalUptime = 0;

        activeMiners.forEach(miner => {
          const regionMultiplier = get().getRegionMultiplier(miner.location);
          const upgradeMultiplier = get().getUpgradeMultiplier(miner.type);
          
          totalHashRate += miner.miningPower.hashRate * regionMultiplier * upgradeMultiplier;
          totalPowerConsumption += miner.miningPower.powerConsumption;
          totalUptime += miner.uptime;
        });

        const avgUptime = activeMiners.length > 0 ? totalUptime / activeMiners.length : 0;
        const estimatedEarnings = totalHashRate * 0.001 * 60; // créditos por minuto
        const efficiency = totalPowerConsumption > 0 ? totalHashRate / totalPowerConsumption : 0;

        return {
          totalHashRate,
          totalPowerConsumption,
          estimatedEarnings,
          efficiency,
          uptime: avgUptime,
        };
      },

      getRegionMultiplier: (region) => {
        const regionData = get().regions.find(r => r.id === region);
        if (!regionData) return 1;
        
        const coolingUpgrade = get().upgrades.find(u => u.type === 'cooling');
        const coolingMultiplier = coolingUpgrade ? Math.pow(coolingUpgrade.multiplier, coolingUpgrade.currentLevel) : 1;
        
        return 1 + (regionData.coolingEfficiency * coolingMultiplier - 0.5) * 0.2;
      },

      getUpgradeMultiplier: (minerType) => {
        const hashUpgrade = get().upgrades.find(u => u.type === 'hashRate' && (u.target === 'all' || u.target === minerType));
        return hashUpgrade ? Math.pow(hashUpgrade.multiplier, hashUpgrade.currentLevel) : 1;
      },

      tick: (deltaTime) => {
        const stats = get().getMiningStats();
        const earnings = (stats.estimatedEarnings / 60) * deltaTime; // por segundo
        
        // Aplicar costos de mantenimiento
        const maintenanceCost = get().miners
          .filter(m => m.isActive)
          .reduce((sum, m) => sum + m.maintenanceCost, 0) * deltaTime;
        
        const netEarnings = earnings - maintenanceCost;
        
        if (netEarnings > 0) {
          get().addCredits(netEarnings);
        } else {
          set((state) => ({
            resources: {
              ...state.resources,
              credits: Math.max(0, state.resources.credits + netEarnings),
            },
          }));
        }

        set((state) => ({
          gameTime: state.gameTime + deltaTime,
        }));
      },

      checkAchievements: () => {
        const state = get();
        const { miners, resources, regions } = state;
        const stats = state.getMiningStats();
        const newAchievements: typeof state.achievements = [];
        let totalRewards = 0;
        
        state.achievements.forEach(achievement => {
          if (achievement.isUnlocked) {
            newAchievements.push(achievement);
            return;
          }
          
          let achieved = false;
          switch (achievement.condition.type) {
            case 'miners':
              achieved = miners.length >= achievement.condition.value;
              break;
            case 'credits':
              achieved = resources.credits >= achievement.condition.value;
              break;
            case 'hashRate':
              achieved = stats.totalHashRate >= achievement.condition.value;
              break;
            case 'regions':
              achieved = regions.filter(r => r.isUnlocked).length >= achievement.condition.value;
              break;
          }
          
          if (achieved) {
            totalRewards += achievement.reward;
            newAchievements.push({ 
              ...achievement, 
              isUnlocked: true, 
              unlockedAt: Date.now() 
            });
          } else {
            newAchievements.push(achievement);
          }
        });
        
        if (totalRewards > 0) {
          set((state) => ({
            achievements: newAchievements,
            resources: {
              ...state.resources,
              credits: state.resources.credits + totalRewards,
            },
            totalMined: state.totalMined + totalRewards,
          }));
        }
      },

      resetGame: () => {
        set(initialState);
      },
    }),
    {
      name: 'miningjeez-storage',
    }
  )
);
