import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title">Store prices</h2>
        <p className="page-sub">Only live store data is shown. No seeded or estimated prices.</p>
      </div>

      <section className="card text-center">
        <p className="text-sm text-muted">
          Use live search to compare sourced prices side-by-side. Stores that cannot be fetched show
          &ldquo;Live price unavailable&rdquo;.
        </p>
        <Link href="/search" className="btn block text-center mt-4">
          Open live price search
        </Link>
      </section>
    </div>
  );
}
