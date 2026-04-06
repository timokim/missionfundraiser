import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-20 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          2026 큰빛 다운타운 선교 펀드레이징
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          펀드레이징 사전 주문 시스템
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          선교 펀드레이징 관리자들은 아래 버튼을 통해서 로그인 후 펀드레이징 관리 페이지에 접속할 수 있습니다.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-zinc-900/20 transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            로그인
          </Link>
        </div>
      </div>
    </main>
  );
}
