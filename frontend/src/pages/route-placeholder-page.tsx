import { PageHeader } from "@/components/shared/page-header";

interface RoutePlaceholderPageProps {
  title: string;
  description: string;
}

export function RoutePlaceholderPage({
  title,
  description,
}: RoutePlaceholderPageProps) {
  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="FOUNDATION IN PROGRESS"
        title={title}
        description={description}
      />

      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        This route is configured. Its functional screen will be
        implemented in a subsequent development task.
      </div>
    </section>
  );
}