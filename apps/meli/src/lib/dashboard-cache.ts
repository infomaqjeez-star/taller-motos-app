// Caché compartido para el dashboard
interface CacheEntry {
  data: any[];
  timestamp: number;
}

const dashboardCache = new Map<string, CacheEntry>();
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function getCachedData(userId: string): any[] | null {
  const cached = dashboardCache.get(userId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

export function setCachedData(userId: string, data: any[]) {
  dashboardCache.set(userId, { data, timestamp: Date.now() });
}

export function invalidateDashboardCache(userId: string) {
  console.log(`[dashboard-cache] Invalidando caché para usuario ${userId}`);
  dashboardCache.delete(userId);
}
