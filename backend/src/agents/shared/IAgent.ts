import type { AgentResponse } from "./AgentResponse.ts";
import type { AgentValidationInput, AgentValidationResponse } from "./AgentValidationResponse.ts";
export interface IAgent { answer(question: string): Promise<AgentResponse>; validate(input: AgentValidationInput): Promise<AgentValidationResponse>; }
