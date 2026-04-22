export function QuestionSkeleton() {
  return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: "#1F1F1F" }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl" style={{ background: "#2a2a2a" }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded w-24" style={{ background: "#2a2a2a" }} />
          <div className="h-4 rounded w-3/4" style={{ background: "#2a2a2a" }} />
          <div className="h-4 rounded w-1/2" style={{ background: "#2a2a2a" }} />
        </div>
      </div>
    </div>
  );
}

export function QuestionsSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <QuestionSkeleton key={i} />
      ))}
    </div>
  );
}
