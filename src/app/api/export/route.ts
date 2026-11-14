import { getCurrentUser } from "@/server/auth";
import { exportEntriesCsv } from "@/server/services/export";

/**
 * ⑦ DATA「データを書き出す」：ログイン中のユーザーの記録を CSV でダウンロードさせる。
 * 形式は src/domain/csv-export.ts。ログインしていなければ 401。
 */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("ログインしてください", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const file = await exportEntriesCsv(user.id);
  return new Response(file.content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
