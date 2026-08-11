export type ArchitectureRequestMode = "DESIGN" | "VALIDATION";

export function detectArchitectureRequestMode(hasImage: boolean, question: string): ArchitectureRequestMode {
  if (hasImage) return "VALIDATION";
  return /\b(validar|valida|validacion|revisar|revisa|auditar|audita|evaluar|evalua|cumple|incumplimiento)\b/i.test(normalize(question))
    ? "VALIDATION"
    : "DESIGN";
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
