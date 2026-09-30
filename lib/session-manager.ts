import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";

export type JoblySessionStatus =
  | "loading"
  | "authenticated"
  | "anonymous"
  | "refreshing"
  | "expired"
  | "error";

export type JoblySessionState = {
  status: JoblySessionStatus;
  session: Session | null;
  error: Error | null;
};

type Listener = (state: JoblySessionState) => void;

class JoblySessionManager {
  private state: JoblySessionState = { status: "loading", session: null, error: null };
  private listeners = new Set<Listener>();
  private readyPromise: Promise<void> | null = null;
  private refreshPromise: Promise<Session | null> | null = null;
  private subscribed = false;

  private ensureStarted() {
    if (this.readyPromise) return this.readyPromise;

    const supabase = getSupabaseClient();

    if (!this.subscribed) {
      this.subscribed = true;
      supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
        if (event === "SIGNED_OUT") {
          this.setState({ status: "anonymous", session: null, error: null });
          return;
        }

        if (session) {
          this.setState({ status: "authenticated", session, error: null });
        } else if (event === "INITIAL_SESSION") {
          this.setState({ status: "anonymous", session: null, error: null });
        }
      });
    }

    this.readyPromise = supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        this.setState({
          status: data.session ? "authenticated" : "anonymous",
          session: data.session,
          error: null,
        });
      })
      .catch((error: unknown) => {
        const normalized = error instanceof Error ? error : new Error("Session Jobly indisponible.");
        this.setState({ status: "error", session: null, error: normalized });
        throw normalized;
      });

    return this.readyPromise;
  }

  private setState(next: JoblySessionState) {
    this.state = next;
    for (const listener of this.listeners) listener(next);
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    void this.ensureStarted().catch(() => undefined);
    return () => this.listeners.delete(listener);
  }

  async getSession() {
    await this.ensureStarted();
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) {
      const normalized = error instanceof Error ? error : new Error(error.message);
      this.setState({ status: "error", session: null, error: normalized });
      throw normalized;
    }
    this.setState({
      status: data.session ? "authenticated" : "anonymous",
      session: data.session,
      error: null,
    });
    return data.session;
  }

  async getAccessToken() {
    const session = await this.getSession();
    return session?.access_token ?? null;
  }

  async setSession(accessToken: string, refreshToken: string) {
    await this.ensureStarted();
    const { data, error } = await getSupabaseClient().auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error || !data.session) {
      const normalized = error instanceof Error ? error : new Error("La session Jobly n'a pas pu être créée.");
      this.setState({ status: "error", session: null, error: normalized });
      throw normalized;
    }
    this.setState({ status: "authenticated", session: data.session, error: null });
    return data.session;
  }

  async refreshSession() {
    await this.ensureStarted();
    if (this.refreshPromise) return this.refreshPromise;

    this.setState({ status: "refreshing", session: this.state.session, error: null });
    this.refreshPromise = getSupabaseClient().auth
      .refreshSession()
      .then(({ data, error }) => {
        if (error || !data.session) {
          const normalized = error instanceof Error ? error : new Error("La session Jobly a expiré.");
          this.setState({ status: "expired", session: null, error: normalized });
          return null;
        }
        this.setState({ status: "authenticated", session: data.session, error: null });
        return data.session;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  async signOut() {
    await this.ensureStarted();
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
    this.setState({ status: "anonymous", session: null, error: null });
  }

  async authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    let token = await this.getAccessToken();
    if (!token) {
      throw new Error("Impossible de récupérer ta session Jobly active, recharge la page et réessaie.");
    }

    const call = (accessToken: string) => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      return fetch(input, { ...init, headers });
    };

    let response = await call(token);
    if (response.status !== 401) return response;

    const refreshed = await this.refreshSession();
    token = refreshed?.access_token ?? null;
    if (!token) return response;

    return call(token);
  }

  getState() {
    return this.state;
  }
}

let manager: JoblySessionManager | null = null;

export function getJoblySessionManager() {
  if (!manager) manager = new JoblySessionManager();
  return manager;
}
