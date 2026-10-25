import createClient from "openapi-fetch";
import type { paths } from "./schema";

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | undefined;
}

export function createApiClient({ baseUrl, getToken }: ApiClientOptions) {
  const client = createClient<paths>({ baseUrl });

  client.use({
    onRequest({ request }) {
      const token = getToken?.();
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
      request.headers.set("Accept", "application/json");
      return request;
    },
  });

  return client;
}

export type { paths };
