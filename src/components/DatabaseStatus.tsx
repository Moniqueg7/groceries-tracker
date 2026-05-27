import Link from "next/link";
import type { DatabaseError } from "@/lib/data";

type Props = {
  error: DatabaseError;
};

export function DatabaseStatus({ error }: Props) {
  return (
    <section className="card space-y-3 border-warn/40 bg-warn/10">
      <h2 className="font-semibold text-warn">Database not ready</h2>
      <p className="text-sm text-muted">{error.message}</p>
      {error.code === "setup" || error.code === "sqlite_on_vercel" ? (
        <ol className="text-sm text-muted list-decimal list-inside space-y-1">
          <li>Create a free Postgres database on Neon or Supabase</li>
          <li>Add DATABASE_URL in Vercel → Settings → Environment Variables</li>
          <li>Redeploy, then run locally: npm run db:migrate && npm run db:seed</li>
        </ol>
      ) : (
        <p className="text-sm text-muted">
          Tables may be missing. From your PC with the same DATABASE_URL in .env, run{" "}
          <code className="text-xs">npm run db:migrate</code> and <code className="text-xs">npm run db:seed</code>.
        </p>
      )}
      <Link href="/api/health" className="link text-sm">
        Check database health →
      </Link>
    </section>
  );
}
