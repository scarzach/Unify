"use client";

import { useState, useTransition } from "react";
import { addPart } from "@/lib/actions/garage";
import { Boxes, Loader2, PackagePlus } from "lucide-react";

type AddPartFormProps = {
  vehicleId: string;
};

export default function AddPartForm({ vehicleId }: AddPartFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">Inventory</p>
          <h2 className="mt-2 text-xl font-semibold">Track a part</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep installed hardware, pending parts, and replaced components in one record.
          </p>
        </div>
        <div className="rounded-2xl bg-violet-50 p-3 text-violet-600 dark:bg-violet-500/10">
          <Boxes className="h-5 w-5" />
        </div>
      </div>

      <form
        className="mt-6 space-y-4"
        action={(formData) => {
          setError(null);
          setSuccess(null);

          startTransition(async () => {
            const result = await addPart(formData);

            if (result?.error) {
              setError(result.error);
              return;
            }

            const form = document.getElementById("add-part-form") as HTMLFormElement | null;
            form?.reset();
            setSuccess("Part saved.");
          });
        }}
        id="add-part-form"
      >
        <input type="hidden" name="vehicleId" value={vehicleId} />

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Part name</span>
          <input
            name="name"
            placeholder="Spark plugs"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Part number</span>
          <input
            name="partNumber"
            placeholder="NGK ILZKAR8H8S"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Status</span>
          <select
            name="status"
            defaultValue="INSTALLED"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="INSTALLED">Installed</option>
            <option value="WISHLIST">Wishlist</option>
            <option value="REPLACED">Replaced</option>
          </select>
        </label>

        {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}
        {success ? <p className="text-sm font-medium text-green-600">{success}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
          Save part
        </button>
      </form>
    </div>
  );
}
