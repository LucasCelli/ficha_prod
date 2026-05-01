import { Badge } from "./badge";
import { Card } from "./card";

type ModuleOverviewItem = {
  title: string;
  description: string;
};

type ModuleOverviewProps = {
  badge: string;
  description: string;
  items: ModuleOverviewItem[];
  title: string;
};

export function ModuleOverview({ badge, description, items, title }: ModuleOverviewProps) {
  return (
    <section className="module-overview" aria-labelledby="module-title">
      <header className="module-overview__header">
        <Badge tone="info">{badge}</Badge>
        <h1 id="module-title" className="app-title">
          {title}
        </h1>
        <p className="app-summary">{description}</p>
      </header>

      <div className="module-overview__grid">
        {items.map((item) => (
          <Card key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
