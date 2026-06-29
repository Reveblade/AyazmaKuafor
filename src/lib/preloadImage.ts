export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload ${src}`));
    img.src = src;
  });
}

export function preloadCriticalAssets(sources: string[], timeoutMs = 4000): Promise<void> {
  const loads = sources.map((src) =>
    preloadImage(src).catch(() => undefined),
  );

  return Promise.race([
    Promise.all(loads).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
