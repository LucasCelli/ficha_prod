import { Badge } from "./badge";
import { Card } from "./card";

type ModuleOverviewItem = {
  title: string;
};

type ModuleOverviewProps = {
  badge: string;
  items: ModuleOverviewItem[];
  title: string;
};

export function ModuleOverview({ badge, items, title }: ModuleOverviewProps) {
  return (
    <section className="module-overview" aria-labelledby="module-title">
      <header className="module-overview__header">
        <Badge tone="info">{badge}</Badge>
        <h1 id="module-title" className="app-title">
          {title}
        </h1>
      </header>

      <div className="module-overview__grid">
        {items.map((item) => (
          <Card key={item.title}>
            <h2>{item.title}</h2>
          </Card>
        ))}
      </div>
    </section>
  );
}
