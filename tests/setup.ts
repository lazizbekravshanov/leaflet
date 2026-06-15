// Test bootstrap. Runs before any test file (vitest setupFiles).
//
// Safety rail: integration tests INSERT/DELETE real rows, so they must only
// ever hit a throwaway database. We default to the local test DB and refuse to
// run unless the URL clearly names a test database — so a stray prod/dev
// DATABASE_URL in the environment can never be wiped by the suite.
const DEFAULT_TEST_DB =
  "postgresql://leaflet:leaflet@localhost:5434/leaflet_test";

process.env.DATABASE_URL ||= DEFAULT_TEST_DB;

const url = process.env.DATABASE_URL;
if (!/test/i.test(url)) {
  throw new Error(
    `Refusing to run tests: DATABASE_URL does not name a test database ` +
      `(expected the name to contain "test"). Point it at a throwaway DB.`,
  );
}
