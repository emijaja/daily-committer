/**
 * E2E の共通の fixture。
 * - `signedInUser(options)`：テストごとに別のユーザーを DB に作り、ブラウザをログイン状態にする。
 *   ブラウザのタイムゾーンもユーザーの設定と揃える。テストが終わったらユーザーごと消す。
 * テストごとにユーザーが違うので、並列に走っても互いのデータに触れない。
 */
import { test as base, expect } from "@playwright/test";
import { signIn } from "./support/auth";
import {
  closeDb,
  createTestUser,
  deleteTestUsers,
  middayTimezone,
  type TestUser,
  type TestUserOptions,
} from "./support/db";

interface Fixtures {
  signedInUser: (options?: TestUserOptions) => Promise<TestUser>;
}

interface WorkerFixtures {
  db: void;
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  // ワーカーの終わりに DB の接続を閉じる
  db: [
    async ({}, provide) => {
      await provide();
      await closeDb();
    },
    { scope: "worker", auto: true },
  ],
  // ブラウザの時計のタイムゾーン。O5 はブラウザのタイムゾーンをサーバーに保存するので、
  // ユーザーの設定（middayTimezone）と揃える
  timezoneId: async ({}, provide) => {
    await provide(middayTimezone());
  },
  signedInUser: async ({ context, timezoneId }, provide) => {
    const created: string[] = [];
    await provide(async (options = {}) => {
      const testUser = await createTestUser({
        timezone: timezoneId,
        ...options,
      });
      created.push(testUser.id);
      await signIn(context, testUser.sessionToken);
      return testUser;
    });
    await deleteTestUsers(created);
  },
});

export { expect };
