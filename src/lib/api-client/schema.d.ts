/**
 * PLACEHOLDER - regenerate with `npm run generate:api-client` (see package.json)
 * once the backend exposes /api/documentation.json (see backend/storage/api-docs).
 * A build (CI) that finds this file stale relative to the backend routes should fail,
 * per cahier des charges §10.4 - wire that check into CI before go-live.
 */
export interface paths {
  "/api/v1/health": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": {
              status: "ok";
            };
          };
        };
      };
    };
  };
}

export interface components {
  schemas: Record<string, never>;
}
