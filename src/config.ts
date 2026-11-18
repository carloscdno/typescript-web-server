type APIConfig = {
  fileserverHits: number;
};

// Shared in-memory state; lost on every server restart
export const config: APIConfig = {
  fileserverHits: 0,
};