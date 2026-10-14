import type { BufferChannel } from "../../shared/types.js";

// Client for Buffer's GraphQL API (https://developers.buffer.com).
// Auth: personal API key as a Bearer token. Every query lives in this file, so
// if Buffer changes a field name only this module needs touching.

export class BufferError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "BufferError";
  }
}

/** Marks a value to be written as a bare GraphQL enum instead of a string. */
export class GqlEnum {
  constructor(readonly value: string) {}
}
export const gqlEnum = (v: string) => new GqlEnum(v);

/**
 * Serialize a JS value as a GraphQL input literal. Writing input inline keeps us
 * from depending on Buffer's input type names in variable declarations.
 */
export function toGqlLiteral(value: unknown): string {
  if (value instanceof GqlEnum) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value.value)) throw new Error(`Invalid enum ${value.value}`);
    return value.value;
  }
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(toGqlLiteral).join(", ")}]`;
  if (typeof value === "object") {
    const fields = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) throw new Error(`Invalid field ${k}`);
        return `${k}: ${toGqlLiteral(v)}`;
      });
    return `{ ${fields.join(", ")} }`;
  }
  throw new Error(`Cannot serialize ${typeof value}`);
}

export interface CreatePostInput {
  channelId: string;
  text: string;
  mode: "addToQueue" | "shareNow" | "shareNext" | "customScheduled";
  dueAt?: string;
  images?: string[];
  video?: string;
  service: string;
  title?: string;
}

type FetchLike = typeof fetch;

export class BufferClient {
  constructor(
    private apiKey: string,
    private endpoint = "https://api.buffer.com",
    private fetchImpl: FetchLike = fetch,
  ) {}

  async query<T>(query: string): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ query }),
      });
    } catch (e) {
      throw new BufferError(`Could not reach Buffer: ${(e as Error).message}`);
    }
    const body = (await res.json().catch(() => null)) as { data?: T; errors?: { message: string }[] } | null;
    if (res.status === 401 || res.status === 403) throw new BufferError("Buffer rejected the API key", res.status);
    if (!res.ok && !body?.errors) throw new BufferError(`Buffer HTTP ${res.status}`, res.status);
    if (body?.errors?.length) throw new BufferError(body.errors.map((e) => e.message).join("; "), res.status);
    if (!body?.data) throw new BufferError("Empty response from Buffer", res.status);
    return body.data;
  }

  async organizations(): Promise<{ id: string; name: string }[]> {
    const data = await this.query<{ account: { organizations: { id: string; name: string }[] } }>(
      `query { account { organizations { id name } } }`,
    );
    return data.account.organizations;
  }

  async channels(organizationId: string): Promise<BufferChannel[]> {
    const data = await this.query<{ channels: BufferChannel[] }>(
      `query { channels(input: ${toGqlLiteral({ organizationId })}) { id name displayName service avatar isQueuePaused } }`,
    );
    return data.channels;
  }

  async createPost(input: CreatePostInput): Promise<{ id: string }> {
    const assets: Record<string, unknown> = {};
    if (input.images?.length) assets.images = input.images.map((url) => ({ url }));
    if (input.video) assets.videos = [{ url: input.video }];

    const gqlInput: Record<string, unknown> = {
      channelId: input.channelId,
      text: input.text,
      schedulingType: gqlEnum("automatic"),
      mode: gqlEnum(input.mode),
      dueAt: input.mode === "customScheduled" ? input.dueAt : undefined,
      assets,
      metadata: platformMetadata(input),
    };

    const data = await this.query<{
      createPost: { post?: { id: string }; message?: string };
    }>(
      `mutation { createPost(input: ${toGqlLiteral(gqlInput)}) {
        ... on PostActionSuccess { post { id } }
        ... on MutationError { message }
      } }`,
    );
    if (!data.createPost.post) throw new BufferError(data.createPost.message ?? "Buffer did not create the post");
    return data.createPost.post;
  }
}

function platformMetadata(input: CreatePostInput): Record<string, unknown> | undefined {
  switch (input.service) {
    case "instagram":
      return { instagram: { type: gqlEnum(input.video ? "reel" : "post"), shouldShareToFeed: true } };
    case "youtube":
      return { youtube: { title: (input.title ?? input.text).slice(0, 100), categoryId: "22" } };
    default:
      return undefined;
  }
}
