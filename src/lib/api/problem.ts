/**
 * RFC 7807 Problem Details type — matches the MIP backend's GlobalExceptionHandler.
 */

export type ProblemDetails = {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  errors?: Record<string, string[]>;
  /** Optional extension fields (e.g. correlationId). */
  [key: string]: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = "ApiError";
    this.status = problem.status;
    this.problem = problem;
  }

  /** Field-level validation errors, keyed by field name. */
  get fieldErrors(): Record<string, string[]> {
    return this.problem.errors ?? {};
  }
}

export const isProblemDetails = (value: unknown): value is ProblemDetails =>
  !!value &&
  typeof value === "object" &&
  "title" in value &&
  "status" in value;
