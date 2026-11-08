export interface PublicMetadata {
  id: string;
  title: string;
  description: string;
  author: string;
  publishedAt: string;
  image: string;
  canonicalUrl: string;
}

export interface ContentGateOptions<User extends object, Content> {
  /** Validate credentials here. Never accept a caller-supplied user ID as proof. */
  authenticate(request: Request): Promise<User | null>;
  /** Only the literal boolean true grants access. Exceptions fail closed. */
  authorize(input: { user: User; contentId: string }): Promise<boolean>;
  /** Called only after authorization. Return null for a missing resource. */
  getContent(contentId: string): Promise<Content | null>;
  /** Public fields only; never fetch a protected body to generate a synopsis. */
  getMetadata?(contentId: string): Promise<PublicMetadata | null>;
  /** Return 404 instead of 403 for denied authenticated requests. */
  hideDenied?: boolean;
}

export type ErrorCode = 'invalid_request' | 'unauthenticated' | 'forbidden'
  | 'not_found' | 'method_not_allowed' | 'unavailable';

export type GateResponse<T> = { data: T } | { error: { code: ErrorCode } };
