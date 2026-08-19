export interface CalculationNode {
  calculate(): void;
  subscribe(callback: () => void): void;
  unsubscribe(callback: () => void): void;
}
