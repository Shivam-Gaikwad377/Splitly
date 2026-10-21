import { ArrowLeftRight } from "lucide-react";

export function AppLogo() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <ArrowLeftRight aria-hidden="true" className="size-5" />
      </span>

      <span className="text-xl font-semibold tracking-tight">
        Splitly
      </span>
    </div>
  );
}