/**
 * Componente Skeleton para tarjetas de reclamos
 */
export function ClaimCardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-800 rounded-full" />
          <div>
            <div className="h-4 w-24 bg-zinc-800 rounded mb-1" />
            <div className="h-3 w-16 bg-zinc-800 rounded" />
          </div>
        </div>
        <div className="h-6 w-20 bg-zinc-800 rounded-full" />
      </div>

      {/* Content */}
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full bg-zinc-800 rounded" />
        <div className="h-4 w-3/4 bg-zinc-800 rounded" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <div className="h-3 w-24 bg-zinc-800 rounded" />
        <div className="h-3 w-16 bg-zinc-800 rounded" />
      </div>
    </div>
  );
}

/**
 * Componente Skeleton para lista de reclamos
 */
export function ClaimsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ClaimCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Componente Skeleton para detalle de reclamo
 */
export function ClaimDetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-800 rounded-full" />
            <div>
              <div className="h-5 w-32 bg-zinc-800 rounded mb-2" />
              <div className="h-3 w-24 bg-zinc-800 rounded" />
            </div>
          </div>
          <div className="h-6 w-24 bg-zinc-800 rounded-full" />
        </div>

        <div className="space-y-2">
          <div className="h-4 w-full bg-zinc-800 rounded" />
          <div className="h-4 w-2/3 bg-zinc-800 rounded" />
        </div>
      </div>

      {/* Messages */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="h-5 w-32 bg-zinc-800 rounded mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 bg-zinc-800 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-zinc-800 rounded" />
                <div className="h-4 w-full bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="h-5 w-40 bg-zinc-800 rounded mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Componente Skeleton para estadísticas de reclamos
 */
export function ClaimsStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="h-3 w-20 bg-zinc-800 rounded mb-2" />
          <div className="h-8 w-16 bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Componente Skeleton para tabla de reclamos
 */
export function ClaimsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden animate-pulse">
      {/* Header */}
      <div className="grid grid-cols-5 gap-4 p-4 border-b border-zinc-800 bg-zinc-950">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 w-full bg-zinc-800 rounded" />
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-zinc-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 p-4">
            <div className="h-4 w-full bg-zinc-800 rounded" />
            <div className="h-4 w-3/4 bg-zinc-800 rounded" />
            <div className="h-4 w-1/2 bg-zinc-800 rounded" />
            <div className="h-6 w-20 bg-zinc-800 rounded-full" />
            <div className="h-4 w-24 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
