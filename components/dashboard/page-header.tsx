import { Badge } from "@/components/ui/badge";

type PageHeaderProps = {
  title: string;
  description: string;
  badge?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, badge, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        {badge ? <Badge variant="secondary">{badge}</Badge> : null}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
