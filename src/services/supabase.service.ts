import { Injectable } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../environments/environment';
import type { Database } from '../types/database.types';

/** Provides a shared Supabase browser client for the Poll App. */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly client: SupabaseClient<Database> | null;

  /** Creates the Supabase client when URL and key are configured. */
  public constructor() {
    this.client = this.buildClient();
  }

  /**
   * Returns the shared Supabase client or null when not configured.
   * @returns Singleton browser client, or null when environment values are missing.
   */
  public getClient(): SupabaseClient<Database> | null {
    return this.client;
  }

  /**
   * True when both Supabase URL and anon/publishable key are set.
   * @returns True when `environment.supabaseUrl` and `environment.supabaseAnonKey` are non-empty.
   */
  public isConfigured(): boolean {
    return (
      environment.supabaseUrl.trim().length > 0 &&
      environment.supabaseAnonKey.trim().length > 0
    );
  }

  /**
   * Verifies that the Supabase client can reach the project API.
   * @returns True when the client is configured and a zero-row `surveys` query succeeds.
   */
  public async verifyConnection(): Promise<boolean> {
    if (this.client === null) {
      console.warn('[Supabase] Client not configured. Check environment.ts.');
      return false;
    }
    const { error } = await this.client.from('surveys').select('id').limit(0);
    if (error !== null) {
      console.error('[Supabase] Schema check failed:', error.message);
      return false;
    }
    console.info('[Supabase] Client and survey schema ready:', environment.supabaseUrl);
    return true;
  }

  /**
   * Builds the browser Supabase client from environment values.
   * @returns Configured client, or null when URL or anon key is missing.
   * @remarks Auth session persistence and token refresh are disabled for anonymous voting.
   */
  private buildClient(): SupabaseClient<Database> | null {
    if (!this.isConfigured()) {
      return null;
    }
    return createClient<Database>(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
}
