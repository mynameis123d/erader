import { describe, expect, it, vi } from "vitest";
import { BufferClient, BufferError, gqlEnum, toGqlLiteral } from "../server/services/buffer";

function mockFetch(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

describe("toGqlLiteral", () => {
  it("writes enums bare and escapes strings", () => {
    expect(toGqlLiteral({ mode: gqlEnum("addToQueue"), text: 'say "hi"\nnow', n: 2, skip: undefined })).toBe(
      '{ mode: addToQueue, text: "say \\"hi\\"\\nnow", n: 2 }',
    );
  });
  it("rejects unsafe enum values and field names", () => {
    expect(() => toGqlLiteral(gqlEnum("a b"))).toThrow();
    expect(() => toGqlLiteral({ "a}": 1 })).toThrow();
  });
});

describe("BufferClient", () => {
  it("sends the API key as a bearer token and lists channels", async () => {
    const f = mockFetch({ data: { channels: [{ id: "c1", name: "shop", displayName: null, service: "tiktok", avatar: null, isQueuePaused: false }] } });
    const client = new BufferClient("secret", "https://api.buffer.test", f as unknown as typeof fetch);
    const channels = await client.channels("org1");
    expect(channels[0].service).toBe("tiktok");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.buffer.test");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret");
    expect(JSON.parse(init.body as string).query).toContain('channels(input: { organizationId: "org1" })');
  });

  it("creates an Instagram carousel post with image assets", async () => {
    const f = mockFetch({ data: { createPost: { post: { id: "p1" } } } });
    const client = new BufferClient("k", "https://x", f as unknown as typeof fetch);
    const post = await client.createPost({
      channelId: "ig",
      service: "instagram",
      text: "caption",
      mode: "addToQueue",
      images: ["https://cdn/a.png", "https://cdn/b.png"],
    });
    expect(post.id).toBe("p1");
    const query = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).query as string;
    expect(query).toContain("mode: addToQueue");
    expect(query).toContain("schedulingType: automatic");
    expect(query).toContain('images: [{ url: "https://cdn/a.png" }, { url: "https://cdn/b.png" }]');
    expect(query).toContain("instagram: { type: post");
    expect(query).not.toContain("dueAt");
  });

  it("creates a scheduled YouTube Short with a video and title", async () => {
    const f = mockFetch({ data: { createPost: { post: { id: "p2" } } } });
    const client = new BufferClient("k", "https://x", f as unknown as typeof fetch);
    await client.createPost({
      channelId: "yt",
      service: "youtube",
      text: "caption",
      title: "Hook slide",
      mode: "customScheduled",
      dueAt: "2026-10-20T15:00:00.000Z",
      video: "https://cdn/v.mp4",
    });
    const query = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).query as string;
    expect(query).toContain('dueAt: "2026-10-20T15:00:00.000Z"');
    expect(query).toContain('videos: [{ url: "https://cdn/v.mp4" }]');
    expect(query).toContain('youtube: { title: "Hook slide"');
  });

  it("surfaces GraphQL errors, mutation errors and auth failures", async () => {
    const gqlErr = new BufferClient("k", "x", mockFetch({ errors: [{ message: "Unknown field" }] }) as unknown as typeof fetch);
    await expect(gqlErr.organizations()).rejects.toThrow("Unknown field");

    const mutErr = new BufferClient("k", "x", mockFetch({ data: { createPost: { message: "Video too long" } } }) as unknown as typeof fetch);
    await expect(mutErr.createPost({ channelId: "c", service: "tiktok", text: "t", mode: "shareNow" })).rejects.toThrow("Video too long");

    const auth = new BufferClient("bad", "x", mockFetch({}, 401) as unknown as typeof fetch);
    await expect(auth.organizations()).rejects.toBeInstanceOf(BufferError);
  });
});
