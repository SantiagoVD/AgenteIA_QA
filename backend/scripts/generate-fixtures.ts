import sharp from "sharp";
import { join } from "node:path";

const output = join(process.cwd(), "tests", "fixtures", "images");
const style = `<style>text{font-family:Arial,sans-serif;fill:#17324d}.title{font-size:30px;font-weight:700}.subtitle{font-size:18px;fill:#52677a}.label{font-size:18px;font-weight:700}.small{font-size:15px}.box{stroke:#4b6f8c;stroke-width:2;rx:12}.arrow{stroke:#46657d;stroke-width:3;marker-end:url(#arrow)}.zone{fill:#f7fafc;stroke:#9bb2c5;stroke-width:2;stroke-dasharray:8 6}</style><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#46657d"/></marker></defs>`;
const box = (x: number, y: number, width: number, height: number, fill: string, title: string, subtitle = "") => `<rect class="box" x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/><text class="label" x="${x + width / 2}" y="${y + height / 2 - (subtitle ? 5 : -6)}" text-anchor="middle">${title}</text>${subtitle ? `<text class="small" x="${x + width / 2}" y="${y + height / 2 + 21}" text-anchor="middle">${subtitle}</text>` : ""}`;
const arrow = (x1: number, y1: number, x2: number, y2: number, label = "") => `<line class="arrow" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>${label ? `<text class="small" x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" text-anchor="middle">${label}</text>` : ""}`;
const svg = (title: string, subtitle: string, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#eef4f8"/>${style}<text class="title" x="50" y="55">${title}</text><text class="subtitle" x="50" y="87">${subtitle}</text>${body}</svg>`;

const reference = svg("Fixture A — Arquitectura de referencia", "Region: us-east-1 · Availability Zone: 1 only · Public Zone + Private Network", `
  ${box(45, 125, 145, 70, "#dff2ff", "Web App", "HTTPS")}${box(215, 125, 145, 70, "#dff2ff", "Mobile App", "HTTPS")}${box(430, 120, 190, 80, "#d9f7ef", "API Gateway", "HTTPS")}${box(690, 120, 190, 80, "#d9f7ef", "Load Balancer")}
  ${arrow(190, 160, 430, 160, "HTTPS")}${arrow(360, 175, 430, 175, "HTTPS")}${arrow(620, 160, 690, 160)}
  <rect class="zone" x="35" y="235" width="1130" height="510"/><text class="label" x="60" y="270">Private Network · Kubernetes Cluster</text>
  ${box(55, 310, 190, 75, "#fff0c9", "Order Service", "1 replica")}${box(270, 310, 190, 75, "#fff0c9", "Payment Service", "1 replica")}${box(485, 310, 190, 75, "#fff0c9", "Catalog Service", "2 replicas")}${box(700, 310, 190, 75, "#fff0c9", "Inventory Service", "1 replica")}${box(915, 310, 210, 75, "#fff0c9", "Notification Service", "1 replica")}
  ${box(90, 485, 180, 75, "#e8e0ff", "Kafka", "OrderCreated")}${box(330, 485, 260, 75, "#ffe3ef", "Shared PostgreSQL Database")}${box(650, 485, 210, 75, "#e3f6ee", "Redis Session Cache")}${box(920, 485, 185, 75, "#e3f6ee", "Secret Manager")}
  ${arrow(150, 385, 150, 485, "OrderCreated")}${arrow(365, 385, 400, 485)}${arrow(150, 385, 460, 485)}${arrow(365, 385, 500, 485)}
  ${box(340, 640, 400, 70, "#daf4dc", "Monitoring &amp; Centralized Logging")}
  ${arrow(580, 385, 540, 640)}
`);

const fragile = svg("Fixture B — Arquitectura frágil", "Single region · Availability Zone: 1 only · No gateway · No monitoring", `
  <rect class="zone" x="40" y="120" width="1120" height="620"/><text class="label" x="65" y="155">Public Network · us-east-1 · Availability Zone: 1 only</text>
  ${box(80, 250, 210, 90, "#dff2ff", "Web Client", "Direct HTTP")}
  ${box(470, 240, 260, 110, "#ffe6cf", "Order Service", "1 replica")}
  ${box(860, 240, 250, 110, "#f1dcff", "PostgreSQL Database", "single instance")}
  ${arrow(290, 295, 470, 295, "HTTP direct")}${arrow(730, 295, 860, 295, "direct DB access")}
`);

const resilient = svg("Fixture C — Arquitectura resiliente", "Region: us-east-1 · Two Availability Zones · Private Network · Observability", `
  <rect class="zone" x="35" y="115" width="1130" height="625"/><text class="label" x="60" y="150">Public Zone</text>
  ${box(65, 185, 170, 80, "#dff2ff", "Web App", "HTTPS")}${box(295, 180, 205, 90, "#d9f7ef", "API Gateway", "v1 · HTTPS")}${box(565, 180, 205, 90, "#d9f7ef", "Load Balancer", "health checks")}
  ${arrow(235, 225, 295, 225, "HTTPS")}${arrow(500, 225, 565, 225)}
  <rect class="zone" x="60" y="320" width="510" height="245"/><text class="label" x="80" y="352">Private Network · AZ-a</text>
  <rect class="zone" x="610" y="320" width="510" height="245"/><text class="label" x="630" y="352">Private Network · AZ-b</text>
  ${box(90, 390, 210, 80, "#fff0c9", "Order Service", "3 replicas")}${box(335, 390, 200, 80, "#fff0c9", "Payment Service", "3 replicas")}
  ${box(640, 390, 210, 80, "#fff0c9", "Order Service", "3 replicas")}${box(885, 390, 200, 80, "#fff0c9", "Payment Service", "3 replicas")}
  ${box(80, 620, 190, 75, "#ffe3ef", "Order Database", "primary + replica")}${box(300, 620, 190, 75, "#ffe3ef", "Payment Database", "primary + replica")}
  ${box(525, 620, 175, 75, "#e8e0ff", "Kafka", "3 brokers")}${box(730, 620, 155, 75, "#e8e0ff", "DLQ", "OrderFailed")}${box(915, 620, 205, 75, "#daf4dc", "Observability", "metrics · logs · traces")}
  ${arrow(770, 270, 745, 390)}${arrow(700, 657, 730, 657)}
  <text class="small" x="700" y="300" text-anchor="middle">Readiness · Liveness · CI/CD · Backups · Disaster Recovery</text>
`);

await Promise.all([
  sharp(Buffer.from(reference)).png().toFile(join(output, "architecture-a-reference.png")),
  sharp(Buffer.from(fragile)).png().toFile(join(output, "architecture-b-fragile.png")),
  sharp(Buffer.from(resilient)).png().toFile(join(output, "architecture-c-resilient.png")),
]);
console.log("Fixtures A, B y C generados en", output);
