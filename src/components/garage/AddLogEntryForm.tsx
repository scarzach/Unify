"use client";

import { useState, useTransition } from "react";
import { addLogEntry } from "@/lib/actions/garage";
import { CalendarDays, Loader2, NotebookPen, Wrench } from "lucide-react";

type AddLogEntryFormProps = {
  vehicleId: string;
};

const logTypeCopy = {
  MAINTENANCE: "Service, fluid changes, inspections, or preventative work.",
  REPAIR: "Fixes, diagnostics, or anything that restored functionality.",
  MOD: "Upgrades, tuning, cosmetic work, or new hardware installs.",
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddLogEntryForm({ vehicleId }: AddLogEntryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<keyof typeof logTypeCopy>("MAINTENANCE");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Quick add</p>
          <h2 className="mt-2 text-xl font-semibold">Log work</h2>
          <p className="mt-1 text-sm text-muted-foreground">{logTypeCopy[type]}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10">
          <NotebookPen className="h-5 w-5" />
        </div>
      </div>

      <form
        className="mt-6 space-y-4"
        action={(formData) => {
          setError(null);
          setSuccess(null);

          startTransition(async () => {
            const result = await addLogEntry(formData);

            if (result?.error) {
              setError(result.error);
              return;
            }

            const form = document.getElementById("add-log-entry-form") as HTMLFormElement | null;
            form?.reset();
            setType("MAINTENANCE");
            setSuccess("Log entry saved.");
          });
        }}
        id="add-log-entry-form"
      >
        <input type="hidden" name="vehicleId" value={vehicleId} />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Type</span>
            <select
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as keyof typeof logTypeCopy)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="MAINTENANCE">Maintenance</option>
              <option value="REPAIR">Repair</option>
              <option value="MOD">Modification</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Date</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="date"
                type="date"
                defaultValue={getToday()}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Title</span>
          <input
            name="title"
            placeholder="Oil change and inspection"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Notes</span>
          <textarea
            name="description"
            rows={4}
            placeholder="What was done, what you noticed, and what needs attention next."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Odometer</span>
            <input
              name="odometer"
              inputMode="numeric"
              placeholder="84210"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Cost</span>
            <input
              name="cost"
              inputMode="decimal"
              placeholder="129.99"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>
        </div>

        {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}
        {success ? <p className="text-sm font-medium text-green-600">{success}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
          Save log entry
        </button>
      </form>
    </div>
  );
}
