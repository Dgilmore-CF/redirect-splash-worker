import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          // Stub Analytics Engine binding so writeDataPoint calls succeed
          // without an actual Cloudflare account during tests
          analyticsEngineDatasets: {
            ANALYTICS: { dataset: 'redirect_splash_events_test' },
          },
        },
      },
    },
  },
});
