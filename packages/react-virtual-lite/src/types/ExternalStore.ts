export interface ExternalStore {
  getVersion(): number;
  subscribe(listener: () => void): () => boolean;
  nextVersion(): void;
  unsubscribe(listener: () => void): boolean;
}
