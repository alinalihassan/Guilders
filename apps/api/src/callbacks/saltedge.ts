import type {
  SaltEdgeCallbackStage,
  SaltEdgeWebhookEvent,
} from "../queues/types";

type SaltEdgeCallbackBody = {
  data: {
    connection_id: string;
    customer_id: string;
    custom_fields: Record<string, string>;
    stage?: SaltEdgeCallbackStage;
    error_class?: string;
    error_message?: string;
  };
  meta: { version: string; time: string };
};

export async function handleSaltEdgeCallback(
  request: Request,
  env: Env,
  callbackType: "success" | "failure" | "destroy" | "notify",
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: SaltEdgeCallbackBody;
  try {
    body = (await request.json()) as SaltEdgeCallbackBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.data?.connection_id || !body.data?.customer_id) {
    return Response.json({ error: "Invalid callback payload" }, { status: 400 });
  }

  if (callbackType === "notify") {
    console.log(
      `SaltEdge notify: connection=${body.data.connection_id} stage=${body.data.stage}`,
    );
    return Response.json({ received: true });
  }

  const event: SaltEdgeWebhookEvent = {
    source: "saltedge",
    eventType: callbackType,
    payload: {
      connectionId: body.data.connection_id,
      customerId: body.data.customer_id,
      stage: body.data.stage,
      errorClass: body.data.error_class,
      errorMessage: body.data.error_message,
      customFields: body.data.custom_fields,
    },
  };

  await env.WEBHOOK_QUEUE.send(event);

  return Response.json({ received: true });
}
