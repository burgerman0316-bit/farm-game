import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Grid3x3, Sprout, Plus, Lock, Flame } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ─── Data ─────────────────────────────────────────────────────────────────────

const PLANT_DATA = {
  carrot:     { cost: 10,  time: 3000,  revenue: 20,  icon: "🥕", label: "Carrot",     speed: "Fast",   category: "veggie", unlocksAt: 4  },
  tomato:     { cost: 25,  time: 6000,  revenue: 50,  icon: "🍅", label: "Tomato",     speed: "Medium", category: "veggie", unlocksAt: 4  },
  corn:       { cost: 50,  time: 10000, revenue: 110, icon: "🌽", label: "Corn",       speed: "Slow",   category: "veggie", unlocksAt: 4  },
  potato:     { cost: 30,  time: 7000,  revenue: 65,  icon: "🥔", label: "Potato",     speed: "Medium", category: "veggie", unlocksAt: 5  },
  broccoli:   { cost: 45,  time: 9000,  revenue: 100, icon: "🥦", label: "Broccoli",   speed: "Medium", category: "veggie", unlocksAt: 6  },
  eggplant:   { cost: 55,  time: 11000, revenue: 120, icon: "🍆", label: "Eggplant",   speed: "Slow",   category: "veggie", unlocksAt: 8  },
  cucumber:   { cost: 20,  time: 5000,  revenue: 45,  icon: "🥒", label: "Cucumber",   speed: "Fast",   category: "veggie", unlocksAt: 9  },
  pepper:     { cost: 65,  time: 13000, revenue: 145, icon: "🌶️", label: "Pepper",     speed: "Slow",   category: "veggie", unlocksAt: 11 },
  onion:      { cost: 15,  time: 4000,  revenue: 35,  icon: "🧅", label: "Onion",      speed: "Fast",   category: "veggie", unlocksAt: 13 },
  garlic:     { cost: 75,  time: 14000, revenue: 160, icon: "🧄", label: "Garlic",     speed: "Slow",   category: "veggie", unlocksAt: 15 },
  strawberry: { cost: 20,  time: 4000,  revenue: 40,  icon: "🍓", label: "Strawberry", speed: "Fast",   category: "fruit",  unlocksAt: 5  },
  lemon:      { cost: 15,  time: 5000,  revenue: 35,  icon: "🍋", label: "Lemon",      speed: "Medium", category: "fruit",  unlocksAt: 6  },
  grapes:     { cost: 40,  time: 8000,  revenue: 90,  icon: "🍇", label: "Grapes",     speed: "Medium", category: "fruit",  unlocksAt: 8  },
  peach:      { cost: 35,  time: 7000,  revenue: 75,  icon: "🍑", label: "Peach",      speed: "Medium", category: "fruit",  unlocksAt: 10 },
  watermelon: { cost: 60,  time: 12000, revenue: 130, icon: "🍉", label: "Watermelon", speed: "Slow",   category: "fruit",  unlocksAt: 12 },
  pineapple:  { cost: 80,  time: 15000, revenue: 175, icon: "🍍", label: "Pineapple",  speed: "Slow",   category: "fruit",  unlocksAt: 14 },
};

const WEATHER_EVENTS = [
  { id: "sunny",   label: "Sunny Day",      icon: "☀️",  desc: "Normal conditions",          growMult: 1,   revMult: 1   },
  { id: "rain",    label: "Heavy Rain",      icon: "🌧️",  desc: "Crops grow 2× faster!",      growMult: 0.5, revMult: 1   },
  { id: "storm",   label: "Thunderstorm",    icon: "⛈️",  desc: "Growth slowed by half",       growMult: 2,   revMult: 1   },
  { id: "golden",  label: "Golden Sunshine", icon: "🌟",  desc: "Harvests worth 2× coins!",    growMult: 1,   revMult: 2   },
  { id: "drought", label: "Drought",         icon: "🏜️",  desc: "Crops earn 50% less",         growMult: 1,   revMult: 0.5 },
  { id: "rainbow", label: "Rainbow Weather", icon: "🌈",  desc: "Grow 2× faster & earn 1.5×!", growMult: 0.5, revMult: 1.5 },
];

const WEATHER_COLORS = {
  sunny:   "bg-amber-50 border-amber-200 text-amber-800",
  rain:    "bg-blue-50 border-blue-200 text-blue-800",
  storm:   "bg-slate-100 border-slate-300 text-slate-700",
  golden:  "bg-yellow-50 border-yellow-300 text-yellow-800",
  drought: "bg-orange-50 border-orange-200 text-orange-800",
  rainbow: "bg-purple-50 border-purple-200 text-purple-800",
};

const CATEGORIES = ["all", "fruit", "veggie"];
const BASE_MAX_PLOTS   = 16;
const PLOTS_PER_REBIRTH = 4;
const EXPAND_COST      = 100;
const TOTAL_SLOTS      = BASE_MAX_PLOTS + PLOTS_PER_REBIRTH * 10;
const EMPTY_PLOT       = { state: "empty", crop: null, plantedAt: 0, growTime: 0 };
const mkPlots          = () => Array.from({ length: TOTAL_SLOTS }, () => ({ ...EMPTY_PLOT }));

// ─── Tiny sub-components (no state, pure render) ──────────────────────────────

function Stat({ icon, label, children }) {
  return (
    <div className="bg-card border border-border rounded-2xl px-5 py-3 min-w-[130px]">
      <div className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-muted-foreground">
        {icon}{label}
      </div>
      <div className="text-xl font-semibold mt-1">{children}</div>
    </div>
  );
}

// Plot receives progress from parent — no internal setInterval
const Plot = React.memo(function Plot({ plot, progress, onClick }) {
  const isEmpty  = plot.state === "empty";
  const isPlanted = plot.state === "planted";
  const isGrown  = plot.state === "grown";
  const crop = plot.crop ? PLANT_DATA[plot.crop] : null;

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`relative aspect-square rounded-xl overflow-hidden transition-colors duration-300 border
        ${isEmpty   ? "bg-[#e8dfd4] border-[#d6c9b6] hover:bg-[#ded2c2]" : ""}
        ${isPlanted ? "bg-[#c8b896] border-[#b3a27e]" : ""}
        ${isGrown   ? "bg-[#f4e8a8] border-[#d4c266] hover:bg-[#f0e088]" : ""}
      `}
    >
      <div className="absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl">
        {isPlanted && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="drop-shadow-sm">
            🌱
          </motion.span>
        )}
        {isGrown && (
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
          >
            {crop?.icon}
          </motion.span>
        )}
      </div>

      {isPlanted && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
          <div
            className="h-full bg-emerald-500 transition-[width] duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {isGrown && (
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="absolute inset-0 ring-2 ring-amber-400 rounded-xl pointer-events-none"
        />
      )}
    </motion.button>
  );
});

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FarmPage() {
  const [rebirthCount, setRebirthCount] = useState(0);
  const [money, setMoney]               = useState(50);
  const [plotCount, setPlotCount]       = useState(4);
  const [selectedSeed, setSelectedSeed] = useState("carrot");
  const [plots, setPlots]               = useState(mkPlots);
  const [progress, setProgress]         = useState(() => new Array(TOTAL_SLOTS).fill(0));
  const [toast, setToast]               = useState(null);
  const [weather, setWeather]           = useState(WEATHER_EVENTS[0]);
  const [weatherCD, setWeatherCD]       = useState(30);
  const [shopTab, setShopTab]           = useState("all");
  const [rebirthOpen, setRebirthOpen]   = useState(false);

  // Keep a ref so click handler can read money synchronously inside setPlots
  const moneyRef    = useRef(50);
  const weatherRef  = useRef(weather);
  const seedRef     = useRef(selectedSeed);

  useEffect(() => { moneyRef.current   = money;       }, [money]);
  useEffect(() => { weatherRef.current = weather;     }, [weather]);
  useEffect(() => { seedRef.current    = selectedSeed;}, [selectedSeed]);

  const maxPlots = BASE_MAX_PLOTS + rebirthCount * PLOTS_PER_REBIRTH;

  // Single 200ms tick: ripens plots + computes progress array
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setPlots((prev) => {
        let changed = false;
        const next = prev.map((p) => {
          if (p.state === "planted" && now - p.plantedAt >= p.growTime) {
            changed = true;
            return { ...p, state: "grown" };
          }
          return p;
        });
        const src = changed ? next : prev;
        setProgress(src.map((p) => {
          if (p.state === "planted") return Math.min(100, ((now - p.plantedAt) / p.growTime) * 100);
          if (p.state === "grown")   return 100;
          return 0;
        }));
        return changed ? next : prev;
      });
    }, 200);
    return () => clearInterval(id);
  }, []);

  // Weather 1s tick
  useEffect(() => {
    const id = setInterval(() => {
      setWeatherCD((c) => {
        if (c <= 1) {
          setWeather((prev) => {
            const others = WEATHER_EVENTS.filter((w) => w.id !== prev.id);
            return others[Math.floor(Math.random() * others.length)];
          });
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  const handleClick = useCallback((index) => {
    setPlots((prev) => {
      if (index >= plotCount) return prev;
      const plot = prev[index];

      if (plot.state === "grown") {
        const revenue = Math.round(PLANT_DATA[plot.crop].revenue * weatherRef.current.revMult);
        setMoney((m) => { moneyRef.current = m + revenue; return m + revenue; });
        showToast(`+$${revenue} harvested`);
        const next = [...prev];
        next[index] = { ...EMPTY_PLOT };
        return next;
      }

      if (plot.state === "empty") {
        const seed = PLANT_DATA[seedRef.current];
        if (moneyRef.current < seed.cost) { showToast("Not enough funds"); return prev; }
        const newMoney = moneyRef.current - seed.cost;
        moneyRef.current = newMoney;
        setMoney(newMoney);
        const next = [...prev];
        next[index] = {
          state: "planted",
          crop: seedRef.current,
          plantedAt: Date.now(),
          growTime: Math.round(seed.time * weatherRef.current.growMult),
        };
        return next;
      }

      return prev;
    });
  }, [plotCount, showToast]);

  const handleExpand = useCallback(() => {
    if (plotCount >= maxPlots) { showToast("Farm fully expanded — rebirth to unlock more!"); return; }
    if (moneyRef.current < EXPAND_COST) { showToast("Not enough funds"); return; }
    const newMoney = moneyRef.current - EXPAND_COST;
    moneyRef.current = newMoney;
    setMoney(newMoney);
    setPlotCount((c) => c + 1);
    showToast("New plot unlocked");
  }, [plotCount, maxPlots, showToast]);

  const handleRebirth = useCallback(() => {
    setRebirthCount((r) => r + 1);
    moneyRef.current = 50;
    setMoney(50);
    setPlotCount(4);
    setPlots(mkPlots());
    setRebirthOpen(false);
    showToast("🔥 Reborn! Farm expanded!");
  }, [showToast]);

  const canExpand  = money >= EXPAND_COST && plotCount < maxPlots;
  const canRebirth = plotCount >= maxPlots;
  const visibleSeeds = Object.entries(PLANT_DATA).filter(
    ([, s]) => shopTab === "all" || s.category === shopTab
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-2">
              Harvest · Grow · Prosper
            </div>
            <h1 className="text-5xl sm:text-6xl font-serif tracking-tight leading-none">
              Farming Simulator
            </h1>
          </div>
          <div className="flex gap-3">
            <Stat icon={<Coins className="w-4 h-4" />} label="Balance">
              <motion.span key={money} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="tabular-nums">
                ${money}
              </motion.span>
            </Stat>
            <Stat icon={<Grid3x3 className="w-4 h-4" />} label="Plots">
              <span className="tabular-nums">{plotCount}/{maxPlots}</span>
            </Stat>
          </div>
        </div>

        {/* Weather Banner */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={weather.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex items-center justify-between px-5 py-3 rounded-2xl border mb-6 ${WEATHER_COLORS[weather.id]}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{weather.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{weather.label}</div>
                  <div className="text-xs opacity-70">{weather.desc}</div>
                </div>
              </div>
              <div className="text-xs opacity-60 tabular-nums">changes in {weatherCD}s</div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Grid + Sidebar */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

          {/* Farm Grid */}
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="grid grid-cols-4 gap-3 sm:gap-4">
              {plots.map((plot, i) => {
                if (i >= plotCount) {
                  return (
                    <div key={i} className="aspect-square rounded-xl bg-muted/60 border border-dashed border-border flex items-center justify-center text-muted-foreground/50">
                      <Lock className="w-5 h-5" />
                    </div>
                  );
                }
                return (
                  <Plot key={i} plot={plot} progress={progress[i]} onClick={() => handleClick(i)} />
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">

            {/* Seed Shop */}
            <div className="bg-card border border-border rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sprout className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs tracking-[0.25em] uppercase text-muted-foreground">Seed Shop</h3>
              </div>
              <div className="flex gap-1 mb-4 bg-muted rounded-xl p-1">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setShopTab(c)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${shopTab === c ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {c === "all" ? "All" : c === "fruit" ? "🍓 Fruits" : "🥕 Veggies"}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {visibleSeeds.map(([key, s]) => {
                  const active = selectedSeed === key;
                  const locked = plotCount < s.unlocksAt;
                  return (
                    <button key={key} onClick={() => !locked && setSelectedSeed(key)} disabled={locked}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all
                        ${locked ? "bg-muted/50 border-dashed border-border opacity-60 cursor-not-allowed"
                          : active ? "bg-foreground text-background border-foreground"
                          : "bg-background border-border hover:border-foreground/40"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl ${locked ? "grayscale" : ""}`}>{s.icon}</span>
                        <div className="text-left">
                          <div className="text-sm font-medium">{s.label}</div>
                          <div className={`text-xs ${active && !locked ? "text-background/60" : "text-muted-foreground"}`}>
                            {locked ? `Unlock at ${s.unlocksAt} plots` : `${s.speed} · earns $${s.revenue}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums">{locked ? "🔒" : `$${s.cost}`}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expand Farm */}
            <div className="bg-card border border-border rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs tracking-[0.25em] uppercase text-muted-foreground">Expand Farm</h3>
              </div>
              <div className="flex items-end justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {plotCount >= maxPlots ? "Farm is fully expanded!" : `${plotCount} / ${maxPlots} plots unlocked`}
                </p>
                {plotCount < maxPlots && (
                  <span className={`text-sm font-semibold ${money >= EXPAND_COST ? "text-emerald-600" : "text-destructive"}`}>
                    ${money} / ${EXPAND_COST}
                  </span>
                )}
              </div>
              {plotCount < maxPlots && (
                <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${(plotCount / maxPlots) * 100}%` }} />
                </div>
              )}
              <button onClick={handleExpand} disabled={!canExpand}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" />
                {plotCount >= maxPlots ? "Fully Expanded" : `Unlock Plot · $${EXPAND_COST}`}
              </button>
              {plotCount < maxPlots && !canExpand && money < EXPAND_COST && (
                <p className="text-xs text-muted-foreground text-center mt-2">Need ${EXPAND_COST - money} more to expand</p>
              )}
            </div>

            {/* Rebirth */}
            <div className="bg-card border border-border rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <h3 className="text-xs tracking-[0.25em] uppercase text-muted-foreground">Rebirth</h3>
                {rebirthCount > 0 && (
                  <span className="ml-auto text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">×{rebirthCount}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {canRebirth
                  ? `All ${maxPlots} plots unlocked! Rebirth to gain ${maxPlots + PLOTS_PER_REBIRTH} total plot slots.`
                  : `Unlock all ${maxPlots} plots to rebirth and expand beyond the current limit.`}
              </p>
              <button onClick={() => setRebirthOpen(true)} disabled={!canRebirth}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Flame className="w-4 h-4" />
                Rebirth Farm
              </button>
            </div>

            <div className="text-xs text-muted-foreground text-center px-4 leading-relaxed">
              Click an empty plot to sow, wait for it to ripen, then click again to harvest.
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rebirth Dialog */}
      <Dialog open={rebirthOpen} onOpenChange={setRebirthOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔥 Rebirth Farm?</DialogTitle>
            <DialogDescription>
              Your money resets to $50 and all plots are cleared. In return, your farm expands to{" "}
              <strong>{maxPlots + PLOTS_PER_REBIRTH} total plot slots</strong>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRebirthOpen(false)}>Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleRebirth}>Confirm Rebirth</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
