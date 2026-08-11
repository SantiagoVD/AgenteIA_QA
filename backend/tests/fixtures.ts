import type { ArchitectureVisualAnalysis } from "../src/models/ArchitectureVisualAnalysis.ts";

export function architectureFixture(): ArchitectureVisualAnalysis {
  const definitions = [
    ["web", "Web App", "client", []], ["mobile", "Mobile App", "client", []], ["gateway", "API Gateway", "gateway", []],
    ["lb", "Load Balancer", "load-balancer", []], ["order", "Order Service", "service", ["1 replica"]],
    ["payment", "Payment Service", "service", ["1 replica"]], ["catalog", "Catalog Service", "service", ["2 replicas"]],
    ["inventory", "Inventory Service", "service", ["1 replica"]], ["notification", "Notification Service", "service", ["1 replica"]],
    ["kafka", "Kafka", "broker", []], ["db", "Shared PostgreSQL Database", "database", []], ["redis", "Redis Session Cache", "cache", []],
    ["secrets", "Secret Manager", "security", []], ["monitoring", "Monitoring & Centralized Logging", "observability", []],
  ] as const;
  return {
    summary: "Web App and Mobile App use HTTPS through API Gateway and Load Balancer into a Kubernetes Cluster in Region: us-east-1, Availability Zone: 1 only and Private Network.",
    components: definitions.map(([id, name, type, labels]) => ({ id, name, type, labels: [...labels], confidence: 0.98 })),
    connections: [
      { from: "web", to: "gateway", direction: "directed", protocol: "HTTPS", communicationType: "synchronous", labels: [], confidence: 0.98 },
      { from: "mobile", to: "gateway", direction: "directed", protocol: "HTTPS", communicationType: "synchronous", labels: [], confidence: 0.98 },
      { from: "order", to: "db", direction: "directed", protocol: null, communicationType: "synchronous", labels: [], confidence: 0.95 },
      { from: "payment", to: "db", direction: "directed", protocol: null, communicationType: "synchronous", labels: [], confidence: 0.95 },
    ],
    deployment: { environments: [], regions: ["us-east-1"], availabilityZones: ["Availability Zone: 1 only"], clusters: ["Kubernetes Cluster"], replicasObserved: [{ componentId: "order", quantity: 1 }, { componentId: "payment", quantity: 1 }, { componentId: "catalog", quantity: 2 }, { componentId: "inventory", quantity: 1 }, { componentId: "notification", quantity: 1 }] },
    cloud: { loadBalancers: ["Load Balancer"], gateways: ["API Gateway"], autoscalingObserved: null, managedServices: [], statelessEvidence: [], statefulEvidence: ["Redis Session Cache"] },
    integration: { apis: ["API Gateway"], apiVersions: [], brokers: ["Kafka"], queues: [], topics: [], events: ["OrderCreated"], sharedDatabases: ["Shared PostgreSQL Database"], pointToPointConnections: [] },
    infrastructure: { publicNetworks: ["Public Zone"], privateNetworks: ["Private Network"], firewalls: [], containers: [], kubernetesResources: ["Kubernetes Cluster"], monitoringComponents: ["Monitoring & Centralized Logging"], loggingComponents: ["Monitoring & Centralized Logging"], backupComponents: [], disasterRecoveryComponents: [] },
    security: { authenticationMechanisms: [], encryptionEvidence: ["HTTPS"], secretManagers: ["Secret Manager"], exposedComponents: ["API Gateway"] },
    observations: [], uncertainties: [{ topic: "DLQ", reason: "No visible" }, { topic: "backups", reason: "No visible" }],
    visibleText: ["HTTPS", "Region: us-east-1", "Availability Zone: 1 only", "Private Network", "Public Zone", "OrderCreated", "Kafka", "Shared PostgreSQL Database", "Redis Session Cache", "Secret Manager", "Monitoring & Centralized Logging"],
  };
}
