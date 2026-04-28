export interface Cache<T> {
  get(key: string): Promise<T | null>;
  set(key: string, data: T): Promise<void>;
  delete(key: string): Promise<void>;
  getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T>;
  getOrFetchValidated(
    key: string,
    fetcher: () => Promise<T>,
    validator: (value: T) => boolean,
  ): Promise<T>;
}
