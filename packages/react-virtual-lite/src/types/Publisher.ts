export interface Publisher {
  calculate(): void;
  subscribe(callback: () => void): void;
  unsubscribe(callback: () => void): void;
}
