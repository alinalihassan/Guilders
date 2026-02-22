export async function register() {
  if (typeof globalThis.localStorage !== "undefined") {
    try {
      globalThis.localStorage.getItem("__probe__");
    } catch {
      // Node v22+ exposes a broken localStorage when --localstorage-file has no valid path.
      // Replace it with a no-op implementation so SSR code that guards with
      // `typeof localStorage !== 'undefined'` doesn't crash.
      const store = new Map<string, string>();
      globalThis.localStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        key: (index: number) => [...store.keys()][index] ?? null,
        get length() {
          return store.size;
        },
      } as Storage;
    }
  }
}
