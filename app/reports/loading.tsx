import { Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 pt-24">
      <div className="w-80 h-8 mb-6"><Skeleton className="h-8" /></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {[0,1,2].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {[0,1].map(i => (
          <div key={i} className="rounded-2xl p-6 bg-white/80 border border-white/30">
            <Skeleton className="h-5 w-48 mb-4" />
            <div className="space-y-3">
              {[0,1,2,3].map(j => <Skeleton key={j} className="h-3" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


