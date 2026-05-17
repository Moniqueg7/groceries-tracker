import { formatZAR } from "@/lib/currency";
import { getSettings } from "@/lib/data";
import { BudgetForm } from "./BudgetForm";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title">Your budget</h2>
        <p className="page-sub">Set your monthly grocery limit — we track progress on Home.</p>
      </div>

      <section className="card text-center">
        <p className="label mb-1">Current limit</p>
        <p className="stat-big">{formatZAR(settings.monthlyBudget)}</p>
      </section>

      <BudgetForm current={settings.monthlyBudget} />
    </div>
  );
}
