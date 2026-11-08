import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { habits, session, user, userSettings } from "@/db/schema";
import {
  createHabit,
  createUser,
  d,
  entriesOf,
} from "@/server/testing/factories";
import { toggleCheck } from "./record";
import {
  completeOnboarding,
  deleteAccount,
  getSettings,
  isOnboarded,
  updateSettings,
} from "./settings";

describe("getSettings", () => {
  it("行がなければ既定値で作って返す", async () => {
    const id = "user-without-settings";
    await db.insert(user).values({ id, name: "x", email: "x@example.com" });
    expect(await getSettings(id)).toEqual({
      timezone: "Asia/Tokyo",
      weekStart: "mon",
      dayStartHour: 4,
      grumbleEnabled: true,
      grumblePush: false,
      reminderTime: null,
    });
  });
});

describe("updateSettings", () => {
  it("指定した項目だけを変える", async () => {
    const me = await createUser();
    const updated = await updateSettings(me, {
      weekStart: "sun",
      reminderTime: "21:00",
      timezone: "America/New_York",
    });
    expect(updated).toMatchObject({
      weekStart: "sun",
      reminderTime: "21:00",
      timezone: "America/New_York",
      dayStartHour: 4,
    });
  });

  it("正しくない値は拒否する", async () => {
    const me = await createUser();
    await expect(updateSettings(me, { dayStartHour: 7 })).rejects.toThrow(
      "設定の値が正しくありません",
    );
    await expect(
      updateSettings(me, { timezone: "Mars/Base" }),
    ).rejects.toThrow();
    await expect(
      updateSettings(me, { reminderTime: "25:00" }),
    ).rejects.toThrow();
  });
});

describe("completeOnboarding", () => {
  it("onboarded_at を記録し、2回目は最初の日時のまま", async () => {
    const me = await createUser();
    const first = new Date("2024-11-01T00:00:00Z");
    await completeOnboarding(me, first);
    await completeOnboarding(me, new Date("2024-12-01T00:00:00Z"));
    const [row] = await db
      .select({ onboardedAt: userSettings.onboardedAt })
      .from(userSettings)
      .where(eq(userSettings.userId, me));
    expect(row?.onboardedAt?.toISOString()).toBe(first.toISOString());
  });
});

describe("isOnboarded", () => {
  it("設定の行がない・onboarded_at が NULL なら false、完了後は true", async () => {
    const id = "user-without-settings-onboarding";
    await db.insert(user).values({ id, name: "x", email: "y@example.com" });
    expect(await isOnboarded(id)).toBe(false);
    const me = await createUser();
    expect(await isOnboarded(me)).toBe(false);
    await completeOnboarding(me);
    expect(await isOnboarded(me)).toBe(true);
  });
});

describe("deleteAccount", () => {
  it("そのユーザーのデータだけをすべて消す", async () => {
    const me = await createUser();
    const other = await createUser();
    const mine = await createHabit(me);
    const theirs = await createHabit(other);
    await toggleCheck(me, mine, d("2024-11-01"));
    await toggleCheck(other, theirs, d("2024-11-01"));
    await db.insert(session).values({
      id: "s1",
      token: "t1",
      userId: me,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await deleteAccount(me);

    expect(await db.select().from(user).where(eq(user.id, me))).toEqual([]);
    expect(await db.select().from(habits).where(eq(habits.userId, me))).toEqual(
      [],
    );
    expect(await entriesOf(mine)).toEqual([]);
    expect(
      await db.select().from(session).where(eq(session.userId, me)),
    ).toEqual([]);
    expect(
      await db.select().from(userSettings).where(eq(userSettings.userId, me)),
    ).toEqual([]);
    expect(await entriesOf(theirs)).toHaveLength(1);
  });
});
