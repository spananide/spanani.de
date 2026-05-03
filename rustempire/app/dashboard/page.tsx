// app/dashboard/page.tsx
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma"; // Diese Instanz muss existieren
import { getSteamPlayerData, getSteamBans } from "@/lib/steam";

// --- SERVER ACTION (Die Logik im selben File) ---
async function performIntelSearch(formData: FormData) {
  "use server";
  const query = formData.get("steamId") as string;
  if (!query) return;

  // 1. Daten von APIs holen
  const steamProfile = await getSteamPlayerData(query);
  const steamBans = await getSteamBans(query);
  
  // 2. In Datenbank "Forensisch" speichern (Snapshot)
  if (steamProfile) {
    await prisma.player.upsert({
      where: { steamId: query },
      update: {
        currentName: steamProfile.personaname,
        lastSeen: new Date(),
      },
      create: {
        steamId: query,
        currentName: steamProfile.personaname,
        isBanned: steamBans?.VACBanned || false,
      },
    });

    // Erstelle einen Stunden-Snapshot (Beispiel-Logik)
    await prisma.snapshot.create({
      data: {
        playerId: query,
        hoursCount: 0, // Hier kämen BattleMetrics Stunden rein
        status: steamProfile.personastate === 0 ? "Offline" : "Online",
      }
    });
  }

  revalidatePath("/dashboard");
}

// --- UI COMPONENTS (Im selben File) ---
function StatCard({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) {
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 font-mono">
      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// --- MAIN DASHBOARD PAGE ---
export default async function Dashboard({ searchParams }: { searchParams: { q?: string } }) {
  // Falls eine Suche aktiv ist, laden wir die Daten aus der DB
  const player = searchParams.q 
    ? await prisma.player.findUnique({ 
        where: { steamId: searchParams.q },
        include: { snapshots: true } 
      }) 
    : null;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-mono">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex justify-between items-end border-b border-[#1a1a1a] pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            Rust<span className="text-[#ce412b]">Empire</span> <span className="text-sm font-light text-zinc-600">v1.0.4</span>
          </h1>
          <p className="text-[10px] text-zinc-500">OPERATOR: AUTHORIZED // CLASSIFIED INTEL ACCESS</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Search & Profile (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-[#0a0a0a] border border-[#1a1a1a] p-6">
            <h2 className="text-xs font-bold mb-4 uppercase tracking-widest text-[#ce412b]">Target Acquisition</h2>
            <form action={performIntelSearch} className="space-y-4">
              <input 
                name="steamId"
                placeholder="ENTER STEAMID64..."
                className="w-full bg-black border border-[#1a1a1a] p-3 text-sm focus:border-[#ce412b] outline-none transition-all"
              />
              <button className="w-full bg-[#ce412b] py-3 text-xs font-bold uppercase hover:bg-[#a33322] transition-colors">
                Run Forensic Scan
              </button>
            </form>
          </section>

          {player && (
            <section className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 animate-pulse-slow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-zinc-800 border border-[#ce412b]" />
                <div>
                  <p className="text-lg font-bold">{player.currentName}</p>
                  <p className="text-[10px] text-zinc-500">{player.steamId}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs border-b border-[#1a1a1a] py-1">
                  <span className="text-zinc-500 uppercase">Status</span>
                  <span className="text-green-500 font-bold tracking-widest">ACTIVE</span>
                </div>
                <div className="flex justify-between text-xs border-b border-[#1a1a1a] py-1">
                  <span className="text-zinc-500 uppercase">VAC Status</span>
                  <span className={player.isBanned ? "text-red-500" : "text-zinc-300"}>
                    {player.isBanned ? "BANNED" : "CLEAN"}
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Intelligence Data (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Identified Alts" value="0" />
            <StatCard label="Predicted Sleep" value="03:00 - 09:00" color="text-[#ce412b]" />
            <StatCard label="Raid Risk" value="LOW" color="text-green-500" />
          </div>

          {/* Activity Placeholder */}
          <section className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]" />
             <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-700">Activity Heatmap Module</p>
             <p className="text-xs text-zinc-500 mt-2 italic">Connect BattleMetrics API to unlock Level 2 Intel</p>
             
             {/* Decorative HUD Elements */}
             <div className="absolute top-4 right-4 w-12 h-12 border-t border-r border-zinc-800" />
             <div className="absolute bottom-4 left-4 w-12 h-12 border-b border-l border-zinc-800" />
          </section>
          
          <div className="bg-[#ce412b]/5 border border-[#ce412b]/20 p-4">
            <p className="text-[10px] text-[#ce412b] font-bold uppercase tracking-widest">System Alert</p>
            <p className="text-xs text-zinc-400 mt-1">Real-time raid monitoring disabled. Connect Rust+ to enable Module 3.</p>
          </div>
        </div>
      </main>
    </div>
  );
}