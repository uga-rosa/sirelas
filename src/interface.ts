export type Promisify<T> = T | Promise<T>;

export type RequestHandler = (params: unknown) => Promisify<unknown>;
export type NotifyHandler = (params: unknown) => Promisify<void>;
