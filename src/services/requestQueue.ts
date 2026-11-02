export class RequestQueue {
  private lastRequestTime = 0;
  private minIntervalMs = 1100; // Polite 1.1s spacing to stay safely below 1 req/sec limit
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  async enqueue<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const now = Date.now();
          const elapsed = now - this.lastRequestTime;
          if (elapsed < this.minIntervalMs) {
            await new Promise(r => setTimeout(r, this.minIntervalMs - elapsed));
          }
          this.lastRequestTime = Date.now();
          const result = await this.executeWithRetry(requestFn);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        await nextTask();
      }
    }

    this.isProcessing = false;
  }

  private async executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
    let attempt = 0;
    let delay = 2000;

    while (true) {
      try {
        return await fn();
      } catch (err: unknown) {
        attempt++;
        const isRateLimit = err instanceof Error && (err.message.includes('429') || err.message.includes('rate'));
        if (attempt >= maxRetries) {
          throw err;
        }
        const waitTime = isRateLimit ? delay * 2 : delay;
        await new Promise(r => setTimeout(r, waitTime));
        delay *= 2;
      }
    }
  }
}

export const globalInatQueue = new RequestQueue();

