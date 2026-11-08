import { afterEach, describe, expect, it, vi } from "vitest";
import { testDatabaseUrl } from "./test-database-url";

const CI_URL = "postgres://u:p@db:5432/ci_db";
const TEST_URL = "postgres://u:p@localhost:5432/mine_test";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("testDatabaseUrl", () => {
  it("TEST_DATABASE_URL があればそれを使う", () => {
    vi.stubEnv("CI", "");
    vi.stubEnv("TEST_DATABASE_URL", TEST_URL);
    expect(testDatabaseUrl()).toBe(TEST_URL);
  });

  it("CI では DATABASE_URL を使う", () => {
    vi.stubEnv("CI", "true");
    vi.stubEnv("TEST_DATABASE_URL", "");
    vi.stubEnv("DATABASE_URL", CI_URL);
    expect(testDatabaseUrl()).toBe(CI_URL);
  });

  it("CI で接続先が設定されていなければエラーにする", () => {
    vi.stubEnv("CI", "true");
    vi.stubEnv("TEST_DATABASE_URL", "");
    vi.stubEnv("DATABASE_URL", "");
    expect(() => testDatabaseUrl()).toThrow("CI では");
  });

  it("ローカルで DB 名が _test で終わらなければエラーにする", () => {
    vi.stubEnv("CI", "");
    vi.stubEnv("TEST_DATABASE_URL", "postgres://u:p@localhost:5432/dev");
    expect(() => testDatabaseUrl()).toThrow("_test");
  });
});
