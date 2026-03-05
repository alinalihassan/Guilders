import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authedFetch, resetTestDb, selfFetch, signUpTestUser } from "../helpers";

describe("Conversation routes", () => {
  let token: string;
  let conversationId: string;

  beforeAll(async () => {
    const result = await signUpTestUser("conversation-test@guilders.test");
    token = result.token;
  });

  afterAll(async () => {
    await resetTestDb();
  });

  it("GET /api/conversation without auth returns 401", async () => {
    const res = await selfFetch("/api/conversation");
    expect(res.status).toBe(401);
  });

  it("GET /api/conversation returns empty for new user", async () => {
    const res = await authedFetch("/api/conversation", token);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("GET /api/conversation/last returns 404 when none exist", async () => {
    const res = await authedFetch("/api/conversation/last", token);
    expect(res.status).toBe(404);
  });

  it("POST /api/conversation creates a new conversation", async () => {
    const res = await authedFetch("/api/conversation", token, {
      method: "POST",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; title: string };
    expect(body.id).toBeTruthy();
    expect(body.title).toBe("New chat");
    conversationId = body.id;
  });

  it("GET /api/conversation lists the created conversation", async () => {
    const res = await authedFetch("/api/conversation", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { id: string }[];
    expect(body).toHaveLength(1);
    expect(body[0]!.id).toBe(conversationId);
  });

  it("GET /api/conversation/:id returns the conversation", async () => {
    const res = await authedFetch(`/api/conversation/${conversationId}`, token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { id: string; title: string; messages: unknown[] };
    expect(body.id).toBe(conversationId);
    expect(body.title).toBe("New chat");
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it("GET /api/conversation/last returns the most recent", async () => {
    const res = await authedFetch("/api/conversation/last", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { id: string };
    expect(body.id).toBe(conversationId);
  });

  it("PATCH /api/conversation/:id renames the conversation", async () => {
    const res = await authedFetch(`/api/conversation/${conversationId}`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "My Budget Chat" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { title: string };
    expect(body.title).toBe("My Budget Chat");
  });

  it("GET /api/conversation/:id for non-existent returns 404", async () => {
    const res = await authedFetch(
      "/api/conversation/00000000-0000-0000-0000-000000000000",
      token,
    );
    expect(res.status).toBe(404);
  });

  it("DELETE /api/conversation/:id deletes the conversation", async () => {
    const res = await authedFetch(`/api/conversation/${conversationId}`, token, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("GET /api/conversation returns empty after deletion", async () => {
    const res = await authedFetch("/api/conversation", token);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveLength(0);
  });

  it("DELETE /api/conversation/:id for non-existent returns 404", async () => {
    const res = await authedFetch(
      "/api/conversation/00000000-0000-0000-0000-000000000000",
      token,
      { method: "DELETE" },
    );
    expect(res.status).toBe(404);
  });
});
