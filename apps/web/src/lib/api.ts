export const apiBase = import.meta.env.VITE_API_BASE || "/api";

//Frontend types

export type User = {
  id: number;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
};

export type FocusSession = {
  id: number;
  user_id: number;
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
  status: "running" | "paused" | "completed" | "canceled";
  paused_seconds: number;
  paused_at?: string | null;
};

export type FocusSessionsResponse = {
  items: FocusSession[];
  total: number;
};

export type Track = {
  id: number;
  title: string;
  artist?: string | null;
  album?: string | null;
  duration_ms?: number | null;
  mime: string;
  size_bytes: number; // Para verificar tamaño del archivo
  sha256: string;     // Para verificar integridad del archivo , corrupcion o duplicados
};

export type PlaylistItem = {
  id: number;
  position: number;
  track: Track;
};

export type Playlist = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  items: PlaylistItem[];
};
// Esta es la definición autoritativa de una playlist 
export type PlaylistManifest = {
  playlist_id: number;
  name: string;
  updated_at: string;
  tracks: Array<Track & { download_url: string }>;
};

function apiHeaders() {
  return {
    "Content-Type": "application/json",
  };
}
// Punto central para hacer fetch a la API
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...apiHeaders(),
      ...(init?.headers || {}),
    },
  });
  if (!resp.ok) {
    const message = await resp.text();
    throw new Error(message || resp.statusText);
  }
  return resp.json() as Promise<T>;
}

export const api = {
  me: () => apiFetch<User>("/auth/me"),

  login: (username: string, password: string) =>
    apiFetch<User>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  logout: () => apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  focusStart: (durationSeconds: number) =>
    apiFetch<FocusSession>("/focus/start", {
      method: "POST",
      body: JSON.stringify({ duration_seconds: durationSeconds }),
    }),
  focusPause: (id: number) => apiFetch<FocusSession>(`/focus/${id}/pause`, { method: "POST" }),
  focusResume: (id: number) => apiFetch<FocusSession>(`/focus/${id}/resume`, { method: "POST" }),
  focusCancel: (id: number) => apiFetch<FocusSession>(`/focus/${id}/cancel`, { method: "POST" }),
  focusComplete: (id: number) => apiFetch<FocusSession>(`/focus/${id}/complete`, { method: "POST" }),
  focusActive: async () => {
    const resp = await fetch(`${apiBase}/focus/active`, {
      credentials: "include",
      headers: apiHeaders(),
    });
    if (resp.status === 204) return null;
    if (!resp.ok) {
      const message = await resp.text();
      throw new Error(message || resp.statusText);
    }
    return (await resp.json()) as FocusSession;
  },
  focusSessions: (limit = 20, offset = 0) =>
    apiFetch<FocusSessionsResponse>(`/focus/sessions?limit=${limit}&offset=${offset}`),
  health: () => apiFetch<{ status: string }>("/health"),
  tracks: () => apiFetch<Track[]>("/tracks"),
  scanTracks: () => apiFetch<{ added: number }>("/tracks/scan", { method: "POST" }),
  playlists: () => apiFetch<Playlist[]>("/playlists"),
  playlist: (id: number) => apiFetch<Playlist>(`/playlists/${id}`),
  createPlaylist: (name: string) =>
    apiFetch<Playlist>("/playlists", { method: "POST", body: JSON.stringify({ name }) }),
  addPlaylistItem: (id: number, trackId: number, position: number) =>
    apiFetch<Playlist>(`/playlists/${id}/items`, {
      method: "POST",
      body: JSON.stringify({ track_id: trackId, position }),
    }),
  deletePlaylistItem: (playlistId: number, itemId: number) =>
    apiFetch<{ deleted: boolean }>(`/playlists/${playlistId}/items/${itemId}`, {
      method: "DELETE",
    }),
  playlistManifest: (id: number) => apiFetch<PlaylistManifest>(`/playlists/${id}/manifest`),
  syncPlayback: (payload: Record<string, unknown>) =>
    apiFetch("/sync/playback", { method: "POST", body: JSON.stringify(payload) }),
};

export function streamUrl(trackId: number) {
  return `${apiBase}/tracks/${trackId}/stream`;
}

export function downloadUrl(trackId: number) {
  return `${apiBase}/tracks/${trackId}/download`;
}
