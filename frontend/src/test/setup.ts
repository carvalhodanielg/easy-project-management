import '@testing-library/jest-dom';

// jsdom's localStorage can be non-functional for zustand's persist middleware
// (which captures the storage reference at import time). Provide a working
// in-memory implementation before any store module is imported.
if (
  typeof localStorage === 'undefined' ||
  typeof localStorage.setItem !== 'function'
) {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return store.size;
    },
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (i) => Array.from(store.keys())[i] ?? null,
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    configurable: true,
  });
}
