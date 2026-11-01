export class BackendError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function callBackend(
  baseUrl: string,
  route: string,
  method: "GET" | "POST" = "GET"
): Promise<{ status: number; body: unknown }> {
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      method,
      signal: AbortSignal.timeout(5000)
    });

    const body: unknown = await response.json();

    return {
      status: response.status,
      body
    };
  } catch (error) {
    console.error("Backend request failed:", error);

    throw new BackendError(
      503,
      "Backend service unavailable or returned an invalid response"
    );
  }
}