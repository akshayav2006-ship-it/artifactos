export class OperationPending {
  private readonly active = new Set<string>();
  has(key: string) { return this.active.has(key); }
  async run<T>(key: string, action: () => Promise<T>): Promise<T> {
    if (this.active.has(key)) throw new Error("This operation is already in progress.");
    this.active.add(key);
    try { return await action(); }
    finally { this.active.delete(key); }
  }
}
