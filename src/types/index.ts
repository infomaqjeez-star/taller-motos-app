// Tipos principales del juego MiningJeez

export interface Resources {
  credits: number;
  cpu: number;
  maxCpu: number;
  energy: number;
  maxEnergy: number;
  bandwidth: number;
  maxBandwidth: number;
}

export interface MiningPower {
  hashRate: number; // H/s
  efficiency: number; // Créditos por hash
  powerConsumption: number; // Energía consumida
}

export interface CloudMiner {
  id: string;
  name: string;
  type: MinerType;
  tier: number;
  level: number;
  miningPower: MiningPower;
  cost: number;
  maintenanceCost: number; // Costo por segundo
  location: Region;
  isActive: boolean;
  uptime: number; // Porcentaje de tiempo activo
  installedAt: number;
}

export type MinerType = 
  | 'cpu-miner' 
  | 'gpu-miner' 
  | 'asic-miner' 
  | 'quantum-miner' 
  | 'neural-miner';

export type Region = 
  | 'us-east' 
  | 'us-west' 
  | 'eu-west' 
  | 'eu-north' 
  | 'asia-east' 
  | 'asia-south' 
  | 'south-america';

export interface RegionData {
  id: Region;
  name: string;
  electricityCost: number; // Costo por kWh
  coolingEfficiency: number; // 0-1
  latency: number; // ms
  unlockCost: number;
  isUnlocked: boolean;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  type: UpgradeType;
  target: string;
  multiplier: number;
  cost: number;
  maxLevel: number;
  currentLevel: number;
  icon: string;
}

export type UpgradeType = 
  | 'hashRate' 
  | 'efficiency' 
  | 'cooling' 
  | 'overclock' 
  | 'automation';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: AchievementCondition;
  reward: number;
  isUnlocked: boolean;
  unlockedAt?: number;
}

export interface AchievementCondition {
  type: 'credits' | 'miners' | 'hashRate' | 'upgrades' | 'regions';
  value: number;
}

export interface MarketItem {
  id: string;
  name: string;
  type: 'miner' | 'upgrade' | 'resource';
  basePrice: number;
  currentPrice: number;
  volatility: number;
  trend: 'up' | 'down' | 'stable';
  quantity: number;
}

export interface GameState {
  resources: Resources;
  miners: CloudMiner[];
  regions: RegionData[];
  upgrades: Upgrade[];
  achievements: Achievement[];
  market: MarketItem[];
  gameTime: number;
  totalMined: number;
  startTime: number;
  lastSave: number;
}

export interface MiningStats {
  totalHashRate: number;
  totalPowerConsumption: number;
  estimatedEarnings: number; // por minuto
  efficiency: number;
  uptime: number;
}
