export interface ExplanationStep {
  step: number;
  action: string;
  reason: string;
  state?: any; // To hold specific data like { queue: [...], distance: N }
}
