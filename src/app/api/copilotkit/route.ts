import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  EmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";

// Allow long-running agent operations (up to 5 minutes)
export const maxDuration = 300;

// 1. You can use any service adapter here for multi-agent support. We use
//    the empty adapter since we're only using one agent.
const serviceAdapter = new EmptyAdapter();

// 2. Create the CopilotRuntime instance and utilize the LangGraph AG-UI
//    integration to setup the connection.
const runtime = new CopilotRuntime({
  agents: {
    sample_agent: new LangGraphAgent({
      deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8123",
      graphId: "sample_agent",
      langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
    }),
  },
});

export const GET = async (req: NextRequest) => {
  return new Response(
    JSON.stringify({
      message: "CopilotKit endpoint — use POST to interact",
      langgraph_deployment_url: process.env.LANGGRAPH_DEPLOYMENT_URL || "(empty — fallback to http://localhost:8123)",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

// 3. Build a Next.js API route that handles the CopilotKit runtime requests.
export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};

export const OPTIONS = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Allow": "GET,POST,OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};