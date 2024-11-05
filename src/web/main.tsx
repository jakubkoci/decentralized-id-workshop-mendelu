import React from "hono/jsx";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { App, CredentialList } from "./views";
import {
  type AgentWithModules,
  getCredentials,
  initAgent,
  presentCredential,
  receiveCredential,
} from "../credo";

let agent: AgentWithModules;

export async function main() {
  const port = 3010;
  const app = new Hono();

  agent = await initAgent();

  app.get("/", async (c) => {
    const credentials = await getCredentials(agent);
    return c.html(<App credentials={credentials} />);
  });

  app.post("/receive-credential", async (c) => {
    const body = await c.req.parseBody();
    console.log("POST receive credential", body);
    const offerLink = body.offerLink as string;
    await receiveCredential(agent, offerLink);
    const credentials = await getCredentials(agent);
    return c.html(<CredentialList credentials={credentials} />);
  });

  app.post("/present-credential", async (c) => {
    const body = await c.req.parseBody();
    console.log("POST present credential", body);
    const presentationLink = body.presentationLink as string;
    await presentCredential(agent, presentationLink);
    const credentials = await getCredentials(agent);
    return c.html(<CredentialList credentials={credentials} />);
  });

  app.get("/api", (c) => c.text("Hello Node.js!"));
  app.get("/api/credentials", async (c) => {
    const credentials = await getCredentials(agent);
    return c.json(credentials);
  });
  serve({ fetch: app.fetch, port });
  console.log(`App started at http://localhost:${port}`);
}

main();
