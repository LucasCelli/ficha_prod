export async function mapWithConcurrency<T, TResult>(
  items: readonly T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<TResult>,
) {
  const workerCount = Math.max(1, Math.min(Math.floor(concurrency), items.length));
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
