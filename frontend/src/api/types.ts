export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  login_url?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly loginUrl: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
