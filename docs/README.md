# MiningJeez - Documentación

## Descripción

MiningJeez es un juego de estrategia de minado en la nube desarrollado con React, TypeScript y Vite. Los jugadores gestionan su propia granja de minado cloud, optimizando recursos, expandiendo infraestructura y maximizando ganancias.

## Características Principales

- **Gestión de Recursos**: Administra créditos, CPU, energía y ancho de banda
- **Mineros Cloud**: 5 tipos de mineros (CPU, GPU, ASIC, Quantum, Neural)
- **Regiones**: 7 regiones globales con diferentes eficiencias y costos
- **Mejoras**: Sistema de upgrades para optimizar rendimiento
- **Logros**: Sistema de achievements con recompensas
- **Persistencia**: Guardado automático del progreso

## Tecnologías

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **State Management**: Zustand con persistencia
- **UI Icons**: Lucide React
- **Estilos**: CSS puro con variables CSS

## Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── AchievementsPanel.tsx
│   ├── MinerManager.tsx
│   ├── RegionMap.tsx
│   ├── ResourcePanel.tsx
│   └── UpgradesPanel.tsx
├── data/               # Datos del juego
│   └── gameData.ts
├── hooks/              # Custom hooks
│   └── useGame.ts
├── stores/             # Estado global (Zustand)
│   └── gameStore.ts
├── types/              # Tipos TypeScript
│   └── index.ts
├── App.tsx             # Componente principal
├── App.css             # Estilos principales
└── index.css           # Estilos base
```

## Tipos de Mineros

| Tipo | Hash Rate | Costo | Consumo | Tier |
|------|-----------|-------|---------|------|
| CPU Miner | 100 H/s | 100 | 50 kW | 1 |
| GPU Miner | 500 H/s | 500 | 200 kW | 2 |
| ASIC Miner | 2,500 H/s | 2,500 | 800 kW | 3 |
| Quantum Miner | 15,000 H/s | 15,000 | 3,000 kW | 4 |
| Neural Miner | 100,000 H/s | 100,000 | 10,000 kW | 5 |

## Regiones Disponibles

| Región | Costo Electricidad | Eficiencia Enfriamiento | Latencia |
|--------|-------------------|------------------------|----------|
| US East (Virginia) | $0.12/kWh | 85% | 20ms |
| US West (Oregon) | $0.10/kWh | 80% | 35ms |
| EU West (Ireland) | $0.15/kWh | 90% | 45ms |
| EU North (Sweden) | $0.08/kWh | 95% | 50ms |
| Asia East (Tokyo) | $0.18/kWh | 75% | 60ms |
| Asia South (Singapore) | $0.14/kWh | 82% | 55ms |
| South America (São Paulo) | $0.11/kWh | 70% | 70ms |

## Cómo Jugar

1. **Inicio**: Comienzas con 1,000 créditos
2. **Comprar Mineros**: Ve a la pestaña "Mineros" y compra tu primer CPU Miner
3. **Ganar Créditos**: Los mineros generan créditos automáticamente según su hash rate
4. **Expandir**: Compra más mineros y desbloquea nuevas regiones
5. **Mejorar**: Invierte en upgrades para aumentar eficiencia
6. **Logros**: Completa achievements para ganar recompensas extras

## Fórmulas del Juego

- **Ganancia por minuto**: `hashRate * 0.001 * 60`
- **Costo de mantenimiento**: Suma de `maintenanceCost` de mineros activos
- **Multiplicador de región**: `1 + (coolingEfficiency * coolingMultiplier - 0.5) * 0.2`
- **Costo de mejora**: `upgradeCost * (1.5 ^ currentLevel)`

## Variables de Entorno

El proyecto está configurado para desplegarse en Railway con las siguientes variables:

- `VITE_SUPABASE_URL`: URL de Supabase
- `VITE_SUPABASE_ANON_KEY`: Clave anónima de Supabase

## Comandos

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview
```

## Despliegue

El proyecto está configurado para desplegarse automáticamente en Railway desde el repositorio de GitHub.

## Licencia

© 2024 MiningJeez - Todos los derechos reservados
