/** 契約だけ先に定義した関数の仮の中身。各レーンで実装したら呼び出しを消す。 */
export function notImplemented(name: string): never {
  throw new Error(`not implemented: ${name}`);
}
