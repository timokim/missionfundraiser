import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-20 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          Mission fundraiser
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Simple order forms for group fundraisers
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Admins build a branded form with items and optional inventory caps.
          Supporters pick quantities; stock is enforced on submit.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-zinc-900/20 transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Admin login
          </Link>
        </div>
      </div>
    </main>
  );
}
