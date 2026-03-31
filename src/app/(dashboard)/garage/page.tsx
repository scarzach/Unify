import { Car, Wrench, Settings, Clock, Hammer, Pen, ArrowRight, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import AddVehicleForm from "@/components/garage/AddVehicleForm";
import { deleteVehicle } from "@/lib/actions/garage";
import VehicleCardImage from "@/components/garage/VehicleCardImage";
import Link from "next/link";
import { getVehicleDisplayName, getVehicleInsights } from "@/lib/garage";
import { getCurrentWorkspaceMembershipOrRedirect, hasWorkspacePermission } from "@/lib/workspaces";

export default async function GaragePage() {
  const { workspace, membership } = await getCurrentWorkspaceMembershipOrRedirect();
  const canEditGarage = hasWorkspacePermission(membership.role, "garage:write");

  const vehicles = await prisma.vehicle.findMany({
    where: { workspaceId: workspace.id },
    include: {
      logs: {
        select: {
          type: true,
          date: true,
          cost: true,
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 6,
      },
      parts: {
        select: {
          status: true,
        },
      },
      _count: {
        select: { logs: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const recentLogs = await prisma.logEntry.findMany({
    where: { vehicle: { workspaceId: workspace.id } },
    include: { vehicle: true },
    orderBy: { date: "desc" },
    take: 5
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Digital Garage</h1>
          <p className="text-muted-foreground mt-1">Manage your vehicles, mods, and maintenance.</p>
        </div>
        {canEditGarage ? <AddVehicleForm /> : null}
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Vehicles Section */}
        <section className="lg:col-span-8 space-y-6">
          {vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl border-gray-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
              <Car className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-bold">No vehicles yet</h3>
              <p className="text-muted-foreground text-center max-w-sm mt-1">
                Your garage is empty. Add your first car to start tracking maintenance and mods.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vehicles.map((vehicle) => {
                const insights = getVehicleInsights(vehicle);

                return (
                  <div key={vehicle.id} className="group bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800 hover:shadow-lg transition-all">
                    <div className="h-48 overflow-hidden relative bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                      {vehicle.photoUrl ? (
                        <img src={vehicle.photoUrl} alt={vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <VehicleCardImage make={vehicle.make} model={vehicle.model} year={vehicle.year} />
                      )}
                      <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                        {vehicle.year} {vehicle.make}
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold">{getVehicleDisplayName(vehicle)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {vehicle.model}{vehicle.trim ? ` • ${vehicle.trim}` : ""}
                          </p>
                        </div>
                        {canEditGarage ? (
                          <form action={async () => {
                            "use server";
                            await deleteVehicle(vehicle.id);
                          }}>
                            <button className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </form>
                        ) : null}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Status</span>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{insights.status.label}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Total Logs</span>
                          <span className="text-sm font-semibold">{vehicle._count.logs} entries</span>
                        </div>
                      </div>

                      <Link href={`/garage/${vehicle.id}`} className="w-full flex items-center justify-center gap-2 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium transition-all group">
                        View Logs
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Sidebar / Activity Section */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-blue-500" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No activity logs yet.</p>
              ) : (
                recentLogs.map((log) => (
                  <Link key={log.id} href={`/garage/${log.vehicleId}`} className="flex gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                    <div className={`mt-1 p-2 rounded-lg ${
                      log.type === 'MOD' ? 'bg-purple-100 text-purple-600' :
                      log.type === 'MAINTENANCE' ? 'bg-green-100 text-green-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {log.type === 'MOD' ? <Pen size={16} /> : 
                       log.type === 'MAINTENANCE' ? <Wrench size={16} /> : 
                       <Hammer size={16} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold leading-none mb-1">{log.title}</h4>
                      <p className="text-xs text-muted-foreground">{log.vehicle.nickname} • {new Date(log.date).toLocaleDateString()}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
            {recentLogs.length > 0 && (
              <button className="w-full mt-4 text-sm font-medium text-blue-500 hover:text-blue-600 hover:underline transition-all">
                View All History
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
