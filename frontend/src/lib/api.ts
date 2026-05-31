import { clearToken, getToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    throw new ApiError("Session expirée", 401);
  }

  if (!response.ok) {
    let message = "Une erreur est survenue";
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) {
        message = data.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export type MeResponse = {
  email: string;
  fullName: string | null;
  phone: string | null;
  roles: string[];
  role: string | null;
  roleLabel: string | null;
};

export async function checkApiHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/api/health`, {
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error("API health check failed");
  }

  return response.json();
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string }> {
  const response = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    let message =
      response.status === 403
        ? "Confirmez votre adresse e-mail avant de vous connecter."
        : "E-mail ou mot de passe incorrect.";
    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) {
        message = data.message;
      }
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }

  return response.json();
}

export type RegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export async function register(payload: RegisterPayload): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Impossible de créer le compte.";
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) {
        message = data.error;
      }
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<{ message: string }>;
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    let message = "Lien de confirmation invalide.";
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) {
        message = data.error;
      }
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<{ message: string }>;
}

export async function fetchMe(): Promise<MeResponse> {
  const token = getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }

  return response.json();
}

export async function changeMyPassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/me/password", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getApiUrl(): string {
  return API_URL;
}

export type SetPasswordInfo = {
  email: string;
  fullName: string | null;
  roleLabel: string;
};

export async function inspectSetPasswordToken(token: string): Promise<SetPasswordInfo> {
  const response = await fetch(
    `${API_URL}/api/set-password?token=${encodeURIComponent(token)}`,
  );

  if (!response.ok) {
    let message = "Lien invalide ou expiré.";
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<SetPasswordInfo>;
}

export async function setPasswordWithToken(payload: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/set-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Impossible de créer le mot de passe.";
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<{ message: string }>;
}
