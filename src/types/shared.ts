export type ID = string;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export interface Timestamp {
  createdAt: Date;
  updatedAt?: Date;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
