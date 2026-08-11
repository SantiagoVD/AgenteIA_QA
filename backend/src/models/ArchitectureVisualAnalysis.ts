export interface ArchitectureVisualAnalysis {
  summary: string;
  components: Array<{ id: string; name: string; type: string; labels: string[]; confidence: number }>;
  connections: Array<{ from: string; to: string; direction: "directed" | "bidirectional" | "unknown"; protocol: string | null; communicationType: "synchronous" | "asynchronous" | "unknown"; labels: string[]; confidence: number }>;
  deployment: { environments: string[]; regions: string[]; availabilityZones: string[]; clusters: string[]; replicasObserved: Array<{ componentId: string; quantity: number | null }> };
  cloud: { loadBalancers: string[]; gateways: string[]; autoscalingObserved: boolean | null; managedServices: string[]; statelessEvidence: string[]; statefulEvidence: string[] };
  integration: { apis: string[]; apiVersions: string[]; brokers: string[]; queues: string[]; topics: string[]; events: string[]; sharedDatabases: string[]; pointToPointConnections: string[] };
  infrastructure: { publicNetworks: string[]; privateNetworks: string[]; firewalls: string[]; containers: string[]; kubernetesResources: string[]; monitoringComponents: string[]; loggingComponents: string[]; backupComponents: string[]; disasterRecoveryComponents: string[] };
  security: { authenticationMechanisms: string[]; encryptionEvidence: string[]; secretManagers: string[]; exposedComponents: string[] };
  observations: Array<{ text: string; relatedComponentIds: string[]; confidence: number }>;
  uncertainties: Array<{ topic: string; reason: string }>;
  visibleText: string[];
}
