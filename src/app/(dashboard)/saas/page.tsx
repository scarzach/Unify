import ConfirmSubmitButton from "@/components/dashboard/ConfirmSubmitButton";
import { clearFinancialData, importFinancialCsv } from "@/lib/actions/finance";
import { formatDateRange, resolveTransactionCategory } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/sharing";
import { getCurrentWorkspaceMembershipOrRedirect, hasWorkspacePermission } from "@/lib/workspaces";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  CalendarClock,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  PieChart,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";

type SaaSPageProps = {
  searchParams: Promise<{
    status?: string;
    error?: string;
    count?: string;
    duplicates?: string;
    message?: string;
  }>;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function transactionCategory(transaction: {
  description: string;
  merchant?: string | null;
  category?: string | null;
  amount: number | { toString(): string };
  direction: "INCOME" | "EXPENSE" | "TRANSFER";
}) {
  return resolveTransactionCategory({
    description: transaction.description,
    merchant: transaction.merchant,
    category: transaction.category,
    amount: Number(transaction.amount),
    direction: transaction.direction,
  });
}

function flashMessage(params: {
  status?: string;
  error?: string;
  count?: string;
  duplicates?: string;
  message?: string;
}) {
  if (params.error === "missing-file") {
    return { tone: "error", text: "Choose a CSV export before importing transactions." };
  }

  if (params.error === "file-too-large") {
    return { tone: "error", text: "CSV files are currently limited to 5 MB." };
  }

  if (params.error === "parse-failed") {
    return {
      tone: "error",
      text: params.message ? decodeURIComponent(params.message) : "The uploaded CSV could not be parsed.",
    };
  }

  if (params.status === "imported") {
    const duplicateCount = Number(params.duplicates ?? "0");

    return {
      tone: "success",
      text:
        duplicateCount > 0
          ? `Imported ${params.count ?? "0"} new transactions and skipped ${duplicateCount} duplicates.`
          : `Imported ${params.count ?? "0"} transactions into Mini SaaS finance.`,
    };
  }

  if (params.status === "cleared") {
    return {
      tone: "success",
      text: "Cleared all finance data for this account.",
    };
  }

  return null;
}

export default async function SaaSPage({ searchParams }: SaaSPageProps) {
  const { workspace, membership } = await getCurrentWorkspaceMembershipOrRedirect();
  const params = await searchParams;
  const message = flashMessage(params);
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [connections, accounts, recentTransactions, monthlyTransactions, transactionRange, accountRanges] =
    await Promise.all([
    prisma.financialConnection.findMany({
      where: { workspaceId: workspace.id },
      include: {
        accounts: {
          include: {
            _count: {
              select: { transactions: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.financialAccount.findMany({
      where: { workspaceId: workspace.id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.financialTransaction.findMany({
      where: { workspaceId: workspace.id },
      include: {
        account: {
          select: {
            name: true,
            institutionName: true,
          },
        },
      },
      orderBy: { postedAt: "desc" },
      take: 8,
    }),
    prisma.financialTransaction.findMany({
      where: {
        workspaceId: workspace.id,
        postedAt: {
          gte: monthStart,
        },
      },
      include: {
        account: {
          select: {
            name: true,
            institutionName: true,
          },
        },
      },
      orderBy: { postedAt: "desc" },
    }),
    prisma.financialTransaction.aggregate({
      where: { workspaceId: workspace.id },
      _min: { postedAt: true },
      _max: { postedAt: true },
    }),
    prisma.financialTransaction.groupBy({
      by: ["accountId"],
      where: { workspaceId: workspace.id },
      _min: { postedAt: true },
      _max: { postedAt: true },
    }),
  ]);

  const incomeThisMonth = monthlyTransactions
    .filter((transaction) => transaction.direction === "INCOME")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const spendingThisMonth = monthlyTransactions
    .filter((transaction) => transaction.direction === "EXPENSE")
    .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0);
  const netCashflow = incomeThisMonth - spendingThisMonth;

  const categorySpending = monthlyTransactions
    .filter((transaction) => transaction.direction === "EXPENSE")
    .reduce<Record<string, number>>((accumulator, transaction) => {
      const key = transactionCategory(transaction);
      accumulator[key] = (accumulator[key] ?? 0) + Math.abs(Number(transaction.amount));
      return accumulator;
    }, {});

  const topCategories = Object.entries(categorySpending)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);

  const otherSpendingBreakdown = monthlyTransactions
    .filter(
      (transaction) =>
        transaction.direction === "EXPENSE" && transactionCategory(transaction) === "Other Spending",
    )
    .reduce<Record<string, number>>((accumulator, transaction) => {
      const key =
        transaction.merchant?.trim() || transaction.description.trim() || "Unidentified merchant";
      accumulator[key] = (accumulator[key] ?? 0) + Math.abs(Number(transaction.amount));
      return accumulator;
    }, {});

  const topOtherSpending = Object.entries(otherSpendingBreakdown)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8);

  const accountDateRanges = new Map(
    accountRanges.map((range) => [
      range.accountId,
      {
        start: range._min.postedAt,
        end: range._max.postedAt,
      },
    ]),
  );

  const overallTransactionRange = formatDateRange(transactionRange._min.postedAt, transactionRange._max.postedAt);
  const canImportFinance = hasWorkspacePermission(membership.role, "finance:import");
  const canClearFinance = hasWorkspacePermission(membership.role, "finance:clear");

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 text-stone-50 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
              <Wallet className="h-3.5 w-3.5" />
              Mini SaaS Finance
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Income, spending, and imported bank history in one place.
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-stone-300 md:text-base">
              Start with CSV imports from your bank or card provider. The data model is already prepared
              for live bank sync later, so Plaid or Teller can be layered in without rebuilding the finance module.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-stone-200">
            Transactions from: <span className="font-semibold text-white">{overallTransactionRange}</span>
          </div>
        </div>
      </header>

      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            message.tone === "error"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300"
              : "border-green-200 bg-green-50 text-green-800 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-300"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-muted-foreground">Income this month</p>
          <div className="mt-3 flex items-center gap-3">
            <ArrowUpCircle className="h-6 w-6 text-emerald-500" />
            <p className="text-3xl font-bold">{formatMoney(incomeThisMonth)}</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-muted-foreground">Spending this month</p>
          <div className="mt-3 flex items-center gap-3">
            <ArrowDownCircle className="h-6 w-6 text-rose-500" />
            <p className="text-3xl font-bold">{formatMoney(spendingThisMonth)}</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-muted-foreground">Net cash flow</p>
          <div className="mt-3 flex items-center gap-3">
            <TrendingUp className={`h-6 w-6 ${netCashflow >= 0 ? "text-blue-500" : "text-amber-500"}`} />
            <p className="text-3xl font-bold">{formatMoney(netCashflow)}</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-muted-foreground">Tracked accounts</p>
          <div className="mt-3 flex items-center gap-3">
            <Landmark className="h-6 w-6 text-amber-500" />
            <p className="text-3xl font-bold">{accounts.length}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.05fr_1.45fr]">
        <div className="space-y-8">
          <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold">Import bank data</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Import a CSV export from your bank, card provider, or payroll account. Supported columns include
              `date`, `description`, `amount`, or separate `credit` / `debit` columns.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Re-importing updated CSVs is safe. Existing matching transactions are skipped automatically as
              duplicates.
            </p>

            <form action={importFinancialCsv} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="file">CSV file</label>
                <input
                  id="file"
                  name="file"
                  type="file"
                  accept=".csv,text/csv"
                  required
                  className="w-full text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 p-2"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="sourceLabel">Source label</label>
                  <input
                    id="sourceLabel"
                    name="sourceLabel"
                    defaultValue="Manual bank import"
                    className="w-full rounded-lg border bg-gray-50 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="institution">Institution</label>
                  <input
                    id="institution"
                    name="institution"
                    placeholder="Chase, Capital One, payroll export"
                    className="w-full rounded-lg border bg-gray-50 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="accountName">Account name</label>
                  <input
                    id="accountName"
                    name="accountName"
                    defaultValue="Primary account"
                    className="w-full rounded-lg border bg-gray-50 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="accountType">Account type</label>
                  <select
                    id="accountType"
                    name="accountType"
                    defaultValue="CHECKING"
                    className="w-full rounded-lg border bg-gray-50 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="CHECKING">Checking</option>
                    <option value="SAVINGS">Savings</option>
                    <option value="CREDIT_CARD">Credit card</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <button
                disabled={!canImportFinance}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Import transactions
              </button>
            </form>

            {!canImportFinance ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Your workspace role is read-only for finance imports.
              </p>
            ) : null}

            {canClearFinance ? (
              <form action={clearFinancialData} className="mt-4">
                <ConfirmSubmitButton
                  className="inline-flex w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                  confirmMessage="Clear all imported finance data? This will delete all finance connections, accounts, and transactions."
                >
                  Clear finance data
                </ConfirmSubmitButton>
              </form>
            ) : null}
          </div>

          <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-bold">Data sources</h2>
            </div>

            {connections.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-800/50">
                No sources connected yet. Start with a CSV import, then add live sync later.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {connections.map((connection) => (
                  <div key={connection.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{connection.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {connection.institution || connection.provider} • {connection.accounts.length} account
                          {connection.accounts.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-zinc-900 dark:text-zinc-300">
                        {connection.provider === "MANUAL_IMPORT" ? "Imported" : "Connected"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Last sync {connection.lastSyncedAt ? formatDateTime(connection.lastSyncedAt) : "pending"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Transaction range{" "}
                      {formatDateRange(
                        connection.accounts
                          .map((account) => accountDateRanges.get(account.id)?.start)
                          .filter((value): value is Date => Boolean(value))
                          .sort((left, right) => left.getTime() - right.getTime())[0] ?? null,
                        connection.accounts
                          .map((account) => accountDateRanges.get(account.id)?.end)
                          .filter((value): value is Date => Boolean(value))
                          .sort((left, right) => right.getTime() - left.getTime())[0] ?? null,
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-100">
              Live bank login is not enabled in the MVP yet. This screen is already modeled for Plaid or Teller,
              but importing CSVs is the cheaper and faster path to reliable income and spending reports today.
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-emerald-500" />
              <h2 className="text-xl font-bold">Monthly picture</h2>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Income</p>
                <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{formatMoney(incomeThisMonth)}</p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-4 dark:bg-rose-900/20">
                <p className="text-sm font-medium text-rose-900 dark:text-rose-100">Spending</p>
                <p className="mt-2 text-2xl font-bold text-rose-900 dark:text-rose-100">{formatMoney(spendingThisMonth)}</p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top spending categories</h3>
              {topCategories.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-800/50">
                  Import transactions to see where money is going.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {topCategories.map(([category, total]) => {
                    const percentage = spendingThisMonth > 0 ? (total / spendingThisMonth) * 100 : 0;

                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{category}</span>
                          <span className="text-muted-foreground">{formatMoney(total)}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                          <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(percentage, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold">Other spending breakdown</h2>
            </div>

            {topOtherSpending.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-800/50">
                Nothing is landing in Other Spending for this month.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {topOtherSpending.map(([label, total]) => {
                  const percentage = spendingThisMonth > 0 ? (total / spendingThisMonth) * 100 : 0;

                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium">{label}</span>
                        <span className="shrink-0 text-muted-foreground">{formatMoney(total)}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                        <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(percentage, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-bold">Tracked accounts</h2>
            </div>

            {accounts.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-800/50">
                No accounts yet. Import a CSV to create your first tracked account.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {accounts.map((account) => (
                  <div key={account.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{account.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {account.institutionName || "Manual import"} • {account.type.replace("_", " ")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Transaction range{" "}
                          {formatDateRange(
                            accountDateRanges.get(account.id)?.start ?? null,
                            accountDateRanges.get(account.id)?.end ?? null,
                          )}
                        </p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {account._count.transactions} txns
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold">Recent transactions</h2>
            </div>

            {recentTransactions.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-800/50">
                No transactions yet. Import a bank export to start reporting income and spending.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {recentTransactions.map((transaction) => {
                  const amount = Number(transaction.amount);
                  const displayAmount =
                    transaction.direction === "EXPENSE" ? -Math.abs(amount) : Math.abs(amount);

                  return (
                    <div key={transaction.id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{transaction.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {transaction.account.institutionName || transaction.account.name} • {formatShortDate(transaction.postedAt)}
                          {` • ${transactionCategory(transaction)}`}
                        </p>
                      </div>
                      <p className={`ml-4 text-sm font-semibold ${displayAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatMoney(displayAmount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
