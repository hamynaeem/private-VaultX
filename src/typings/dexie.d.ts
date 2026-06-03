declare module 'dexie' {
  export default class Dexie {
    constructor(name?: string);
    version(v: number): { stores: (schema: Record<string, string>) => void };
  }
  export type Table<T, K> = any;
}
