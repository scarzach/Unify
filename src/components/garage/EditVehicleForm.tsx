"use client";

import { useState } from "react";
import { updateVehicle } from "@/lib/actions/garage";
import { CAR_DATA, YEARS } from "@/lib/car-data";
import { Car, Loader2, Pencil, X } from "lucide-react";

type CarModelInfo = {
  trims: string[];
  photoUrl: string;
};

type EditVehicleFormProps = {
  vehicle: {
    id: string;
    nickname: string | null;
    make: string;
    model: string;
    trim: string | null;
    year: number;
    vin: string | null;
    photoUrl: string | null;
  };
};

export default function EditVehicleForm({ vehicle }: EditVehicleFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMake, setSelectedMake] = useState(vehicle.make);
  const [selectedModel, setSelectedModel] = useState(vehicle.model);
  const [selectedTrim, setSelectedTrim] = useState(vehicle.trim ?? "");
  const [error, setError] = useState<string | null>(null);

  const models: Record<string, CarModelInfo> = selectedMake
    ? (CAR_DATA[selectedMake as keyof typeof CAR_DATA] as Record<string, CarModelInfo>)
    : {};
  const selectedModelData = selectedModel ? models[selectedModel] : null;
  const trims = selectedModelData?.trims ?? [];

  const resetSelections = () => {
    setSelectedMake(vehicle.make);
    setSelectedModel(vehicle.model);
    setSelectedTrim(vehicle.trim ?? "");
    setError(null);
  };

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const result = await updateVehicle(formData);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <Pencil className="h-4 w-4" />
        Edit vehicle
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b p-6 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Car className="text-blue-500" />
            <h2 className="text-xl font-bold">Edit Vehicle</h2>
          </div>
          <button
            onClick={() => {
              resetSelections();
              setIsOpen(false);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        <form action={handleSubmit} className="space-y-4 p-6">
          <input type="hidden" name="vehicleId" value={vehicle.id} />

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Nickname</label>
              <input
                name="nickname"
                defaultValue={vehicle.nickname ?? ""}
                placeholder="e.g. My Daily Driver"
                required
                className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Make</label>
              <select
                name="make"
                required
                value={selectedMake}
                onChange={(event) => {
                  setSelectedMake(event.target.value);
                  setSelectedModel("");
                  setSelectedTrim("");
                }}
                className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">Select Make</option>
                {Object.keys(CAR_DATA)
                  .sort()
                  .map((make) => (
                    <option key={make} value={make}>
                      {make}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Model</label>
              <select
                name="model"
                required
                value={selectedModel}
                onChange={(event) => {
                  setSelectedModel(event.target.value);
                  setSelectedTrim("");
                }}
                disabled={!selectedMake}
                className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">Select Model</option>
                {selectedMake &&
                  Object.keys(models)
                    .sort()
                    .map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Trim</label>
              <select
                name="trim"
                value={selectedTrim}
                onChange={(event) => setSelectedTrim(event.target.value)}
                disabled={!selectedModel}
                className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">Select Trim</option>
                {selectedModel &&
                  [...trims].sort().map((trim) => (
                    <option key={trim} value={trim}>
                      {trim}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Year</label>
              <select
                name="year"
                required
                defaultValue={vehicle.year}
                className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">VIN (Optional)</label>
              <input
                name="vin"
                defaultValue={vehicle.vin ?? ""}
                placeholder="17-digit VIN"
                className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Photo URL (Optional)</label>
            <input
              name="photoUrl"
              type="url"
              defaultValue={vehicle.photoUrl ?? ""}
              placeholder="https://images.unsplash.com/..."
              className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                resetSelections();
                setIsOpen(false);
              }}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
