import { redirect } from "next/navigation";

/** 入口。オンボーディング（フェーズ3-1）ができるまでは記録画面へ移す */
export default function Home() {
  redirect("/record/today");
}
