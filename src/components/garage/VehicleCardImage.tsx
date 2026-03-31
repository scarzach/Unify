type VehicleCardImageProps = {
  make: string;
  model: string;
  year: number;
};

const makeThemes: Record<string, { from: string; to: string; accent: string }> = {
  Toyota: { from: "#1d4ed8", to: "#0f172a", accent: "#93c5fd" },
  Honda: { from: "#dc2626", to: "#111827", accent: "#fca5a5" },
  Ford: { from: "#2563eb", to: "#1e293b", accent: "#bfdbfe" },
  Chevrolet: { from: "#f59e0b", to: "#111827", accent: "#fde68a" },
  BMW: { from: "#0ea5e9", to: "#111827", accent: "#bae6fd" },
  "Mercedes-Benz": { from: "#6b7280", to: "#111827", accent: "#d1d5db" },
  Audi: { from: "#ef4444", to: "#111827", accent: "#fecaca" },
  Nissan: { from: "#dc2626", to: "#111827", accent: "#fca5a5" },
  Subaru: { from: "#2563eb", to: "#1e3a8a", accent: "#bfdbfe" },
  Mazda: { from: "#b91c1c", to: "#111827", accent: "#fecaca" },
  Porsche: { from: "#f59e0b", to: "#111827", accent: "#fde68a" },
  Tesla: { from: "#ef4444", to: "#0f172a", accent: "#fecaca" },
  Dodge: { from: "#dc2626", to: "#111827", accent: "#fca5a5" },
  Jeep: { from: "#65a30d", to: "#111827", accent: "#d9f99d" },
  Volkswagen: { from: "#1d4ed8", to: "#111827", accent: "#93c5fd" },
  Lexus: { from: "#374151", to: "#111827", accent: "#d1d5db" },
};

function getTheme(make: string) {
  return makeThemes[make] ?? { from: "#334155", to: "#0f172a", accent: "#cbd5e1" };
}

export default function VehicleCardImage({ make, model, year }: VehicleCardImageProps) {
  const theme = getTheme(make);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
      }}
    >
      <div
        className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-25"
        style={{ backgroundColor: theme.accent }}
      />
      <div
        className="absolute -bottom-16 left-6 h-44 w-44 rounded-full opacity-20"
        style={{ backgroundColor: theme.accent }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,23,42,0.65),rgba(15,23,42,0.1))]" />

      <div className="relative flex h-full flex-col justify-between p-5 text-white">
        <div className="flex items-start justify-between">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]">
            Catalog Default
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
            {make}
          </span>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/70">{year}</p>
          <h3 className="mt-2 max-w-[12rem] text-3xl font-semibold leading-tight">{model}</h3>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-white/80" />
            <div className="h-2 w-8 rounded-full bg-white/50" />
            <div className="h-2 w-16 rounded-full bg-white/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
