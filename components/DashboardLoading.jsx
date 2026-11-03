import { Loader2 } from "lucide-react";

export default function DashboardLoading({ text = "Loading page..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[45vh] space-y-3 animate-in fade-in-50 duration-100">
      <div className="p-3 rounded-2xl bg-primary/10 text-primary">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
      <p className="text-xs text-muted-foreground font-medium tracking-wide animate-pulse">
        {text}
      </p>
    </div>
  );
}

