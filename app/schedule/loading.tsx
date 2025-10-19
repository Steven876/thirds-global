import { Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 pt-24">
      <div className="text-center mb-8">
        <div className="mx-auto w-72 h-8"><Skeleton className="h-8" /></div>
      </div>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0,1,2].map(i => (
          <div key={i} className="rounded-2xl p-4 border border-white/30 bg-white/60 backdrop-blur-sm">
            <div className="w-32 h-5 mb-3"><Skeleton className="h-5" /></div>
            <div className="space-y-3">
              {[0,1,2].map(j => (
                <div key={j} className="rounded-lg border border-white/30 bg-white/80 p-3">
                  <Skeleton className="h-4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


