/**
 * service が投げる「利用者に伝えてよい」エラー。Server Actions はこれを
 * ActionResult の { ok: false, error } に変える（server/actions/run.ts）。
 * それ以外の例外は内部のエラーとして扱い、詳細は画面に出さない。
 */
export type ServiceErrorCode = "not_found" | "invalid" | "conflict";

export class ServiceError extends Error {
  constructor(
    readonly code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export const habitNotFound = () =>
  new ServiceError("not_found", "習慣が見つかりません");

export const entryNotFound = () =>
  new ServiceError("not_found", "記録が見つかりません");
