"use client";

import { useState } from "react";
import { addVehicle } from "@/lib/actions/garage";
import { CAR_DATA, YEARS } from "@/lib/car-data";
import { Plus, X, Car, Loader2 } from "lucide-react";

type CarModelInfo = {
  trims: string[];
  photoUrl: string;
};

export default function AddVehicleForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedTrim, setSelectedTrim] = useState(""); // Added state for trim
  const [error, setError] = useState<string | null>(null);

  const models: Record<string, CarModelInfo> = selectedMake
    ? (CAR_DATA[selectedMake as keyof typeof CAR_DATA] as Record<string, CarModelInfo>)
    : {};
  const selectedModelData = selectedModel ? models[selectedModel] : null;
  const trims = selectedModelData?.trims ?? [];

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const result = await addVehicle(formData);
    setLoading(false);

    if (result?.error) {
      if (typeof result.error === "string") {
        setError(result.error);
      } else {
        setError("Please check the form for errors.");
      }
    } else {
      setIsOpen(false);
      setSelectedMake("");
      setSelectedModel("");
      setSelectedTrim(""); // Reset trim on success
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm"
      >
        <Plus size={20} />
        Add Vehicle
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Car className="text-blue-500" />
            <h2 className="text-xl font-bold">Add New Vehicle</h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        <form action={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Nickname</label>
              <input 
                name="nickname" 
                placeholder="e.g. My Daily Driver"
                required 
                className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Make</label>
              <select 
                name="make" 
                required 
                value={selectedMake}
                onChange={(e) => {
                  setSelectedMake(e.target.value);
                  setSelectedModel(""); // Reset model when make changes
                  setSelectedTrim(""); // Reset trim when make changes
                }}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700"
              >
                <option value="">Select Make</option>
                {Object.keys(CAR_DATA).sort().map(make => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Model</label>
              <select 
                name="model" 
                required 
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setSelectedTrim(""); // Reset trim when model changes
                }}
                disabled={!selectedMake}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 disabled:opacity-50"
              >
                <option value="">Select Model</option>
                {selectedMake && Object.keys(models).sort().map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5">Trim</label>
              <select 
                name="trim" 
                required 
                value={selectedTrim}
                onChange={(e) => setSelectedTrim(e.target.value)}
                disabled={!selectedModel}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 disabled:opacity-50"
              >
                <option value="">Select Trim</option>
                {selectedModel && [...trims].sort().map(trim => (
                  <option key={trim} value={trim}>{trim}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Year</label>
              <select 
                name="year" 
                required 
                className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700"
              >
                {YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">VIN (Optional)</label>
              <input 
                name="vin" 
                placeholder="17-digit VIN"
                className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Photo URL (Optional)</label>
            <input 
              name="photoUrl" 
              type="url"
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => {
                setIsOpen(false);
                // Reset states when closing the form
                setSelectedMake("");
                setSelectedModel("");
                setSelectedTrim("");
                setError(null);
              }}
              className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Save Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
