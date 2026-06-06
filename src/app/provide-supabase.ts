import {
  APP_INITIALIZER,
  type EnvironmentProviders,
  makeEnvironmentProviders,
} from '@angular/core';

import { SupabaseService } from '../services/supabase.service';

import { setSharedSupabaseService } from './app-legacy-bootstrap';

/** Registers Supabase and runs a lightweight startup connectivity check. */
export function provideSupabase(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: APP_INITIALIZER,
      useFactory: (supabase: SupabaseService) => () => {
        setSharedSupabaseService(supabase);
        return supabase.verifyConnection();
      },
      deps: [SupabaseService],
      multi: true,
    },
  ]);
}
