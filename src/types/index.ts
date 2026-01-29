export type Result<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      code?: string;
      validationErrors?: Record<string, string[]>;
    };
