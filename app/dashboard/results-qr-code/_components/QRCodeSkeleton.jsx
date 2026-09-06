// app/dashboard/results-qr-code/_components/QRCodeSkeleton.jsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function QRCodeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Column 1: QR Code Skeleton */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-between space-y-6">
            <div className="flex items-center justify-center p-2 w-full">
              <Skeleton className="h-[300px] w-[300px] rounded-2xl" />
            </div>
            <div className="w-full space-y-2.5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Sharable Image Preview Skeleton */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-between space-y-4">
            <div className="flex items-center justify-center p-2 w-full">
              <Skeleton className="h-[300px] w-[300px] rounded-2xl" />
            </div>
            <div className="w-full space-y-2.5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
