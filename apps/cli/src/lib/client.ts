import { hc } from "hono/client";
import type { AppType } from "server";

const baseUrl = process.env.LIGHTCODE_SERVER_URL ?? "http://localhost:3000/";

export const client = hc<AppType>(baseUrl);
export type Client = typeof client;
