export interface AgentResponse {
  agent: string;
  response: string;
  context: string[];
  relevant: boolean;
  findings: string[];
  recommendations: string[];
  risks: string[];
  ruleIds: string[];
}
