import { Skeleton, SkeletonText } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 pt-24">
      <div className="text-center mb-8">
        <div className="mx-auto w-64 h-8">
          <Skeleton className="h-8" />
        </div>
        <div className="mx-auto w-80 mt-2">
          <Skeleton className="h-4" />
        </div>
      </div>

      <div className="flex flex-col items-center">
        <Skeleton className="w-72 h-72 rounded-full" />
        <div className="mt-6 w-64">
          <Skeleton className="h-4" />
          <div className="mt-2"><Skeleton className="h-6" /></div>
        </div>
        <div className="mt-6 w-64">
          <Skeleton className="h-3" />
          <div className="mt-2"><Skeleton className="h-5" /></div>
        </div>
      </div>
    </div>
  );
}


