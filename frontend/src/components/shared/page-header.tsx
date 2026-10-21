import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="space-y-2">
        {eyebrow && (
          <p className="text-sm font-medium text-primary">
            {eyebrow}
          </p>
        )}

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>

        <p className="max-w-2xl text-muted-foreground">
          {description}
        </p>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}