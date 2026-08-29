"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Search, Star } from "lucide-react";

interface PokemonOption {
  id: number;
  name: string;
  speciesId: string;
}

interface IvResult {
  league: string;
  rank: number;
  level: number;
  cp: number;
  attackIv: number;
  defenseIv: number;
  staminaIv: number;
  attack: number;
  defense: number;
  hp: number;
  statProduct: number;
  percentBest: number;
  totalIvs: number;
}

interface CalcedResult {
  league: string;
  rank: number;
  level: number;
  cp: number;
  attack: number;
  defense: number;
  hp: number;
  statProduct: number;
  percentBest: number;
}

const LEAGUE_NAMES: Record<string, string> = {
  great: "Great League",
  ultra: "Ultra League",
  master: "Master League",
};

const LEAGUE_COLORS: Record<string, string> = {
  great: "bg-green-500/10 text-green-500 border-green-500/20",
  ultra: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  master: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export default function IvCheckerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [pokemonList, setPokemonList] = useState<PokemonOption[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonOption | null>(null);
  const [atkIv, setAtkIv] = useState(0);
  const [defIv, setDefIv] = useState(0);
  const [hpIv, setHpIv] = useState(0);
  const [bestIvs, setBestIvs] = useState<Record<string, IvResult[]>>({});

  const searchPokemon = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPokemonList([]);
      return;
    }
    try {
      const res = await fetch("/api/search-pokemon?q=" + encodeURIComponent(query));
      if (res.ok) {
        const data = await res.json();
        setPokemonList(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchPokemon(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPokemon]);

  const fetchBestIvs = useCallback(async (speciesId: string) => {
    try {
      const [great, ultra, master] = await Promise.all([
        fetch(`/api/pvp-ivs?league=great&speciesId=${speciesId}`).then((r) => r.json()),
        fetch(`/api/pvp-ivs?league=ultra&speciesId=${speciesId}`).then((r) => r.json()),
        fetch(`/api/pvp-ivs?league=master&speciesId=${speciesId}`).then((r) => r.json()),
      ]);
      setBestIvs({ great, ultra, master });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const selectPokemon = (p: PokemonOption) => {
    setSelectedPokemon(p);
    setSearchQuery(p.name);
    setPokemonList([]);
    fetchBestIvs(p.speciesId);
  };

  const results = useMemo<CalcedResult[] | null>(() => {
    if (!selectedPokemon || Object.keys(bestIvs).length === 0) return null;

    const leagues = ["great", "ultra", "master"];
    const caps: Record<string, number> = { great: 1500, ultra: 2500, master: 99999 };

    const CPM = [0.094,0.1351374318,0.16639787,0.192650919,0.21573247,0.2365726613,0.25572005,0.2735303812,0.29024988,0.3060573775,0.3210876,0.3354450362,0.34921268,0.3624577511,0.3752356,0.387592416,0.39956728,0.4111935514,0.4225,0.4329264091,0.44310755,0.4530599591,0.4627984,0.472336093,0.48168495,0.4908558003,0.49985844,0.508701765,0.51739395,0.5259425113,0.5343543,0.5426357375,0.5507927,0.5588305862,0.5667545,0.5745691333,0.5822789,0.5898879072,0.5974,0.6048236651,0.6121573,0.6194041216,0.6265671,0.6336491432,0.64065295,0.6475809666,0.65443563,0.6612192524,0.667934,0.6745818959,0.6811649,0.6876849038,0.69414365,0.70054287,0.7068842,0.7131691091,0.7193991,0.7255756136,0.7317,0.7347410093,0.7377695,0.7407855938,0.74378943,0.7467812109,0.74976104,0.7527290867,0.7556855,0.7586303683,0.76156384,0.7644860647,0.76739717,0.7702972656,0.7731865,0.7760649616,0.77893275,0.7817900548,0.784637,0.7874736075,0.7903,0.792803968,0.79530001,0.797800015,0.8003,0.802799995,0.8053,0.8078,0.81029999,0.812799985,0.81529999,0.81779999,0.82029999,0.82279999,0.82529999,0.82779999,0.83029999,0.83279999,0.83529999,0.83779999,0.84029999,0.84279999,0.84529999];

    const calculated: CalcedResult[] = [];

    for (const league of leagues) {
      const cap = caps[league];
      const bests = bestIvs[league] || [];

      let bestLevel = 0;
      let bestCp = 0;
      let bestAtk = 0;
      let bestDef = 0;
      let bestHp = 0;
      let bestSp = 0;

      for (let i = CPM.length - 1; i >= 0; i--) {
        const cpm = CPM[i];
        const level = 1 + i * 0.5;
        const atk = (atkIv) * cpm;
        const def = (defIv) * cpm;
        const hp = Math.floor(hpIv * cpm);
        if (hp < 1) continue;
        const cp = Math.floor((atk * Math.sqrt(def) * Math.sqrt(hp)) / 10);
        if (cp <= cap) {
          bestLevel = level;
          bestCp = cp;
          bestAtk = atk;
          bestDef = def;
          bestHp = hp;
          bestSp = atk * def * hp;
          break;
        }
      }

      if (bestLevel === 0 && league === "master") {
        const cpm = CPM[CPM.length - 1];
        bestLevel = 1 + (CPM.length - 1) * 0.5;
        bestAtk = atkIv * cpm;
        bestDef = defIv * cpm;
        bestHp = Math.floor(hpIv * cpm);
        bestCp = Math.floor((bestAtk * Math.sqrt(bestDef) * Math.sqrt(bestHp)) / 10);
        bestSp = bestAtk * bestDef * bestHp;
      }

      let rank = -1;
      let pctBest = 0;
      const bestRank1 = bests[0];
      if (bestRank1) {
        const idx = bests.findIndex(
          (b) => b.attackIv === atkIv && b.defenseIv === defIv && b.staminaIv === hpIv
        );
        if (idx >= 0) {
          rank = bests[idx].rank;
          pctBest = bests[idx].percentBest;
        } else if (bestSp > 0 && bestRank1.statProduct > 0) {
          pctBest = (bestSp / bestRank1.statProduct) * 100;
          rank = bests.filter((b) => b.statProduct > bestSp).length + 1;
        }
      }

      calculated.push({
        league,
        rank: rank > 0 ? rank : -1,
        level: bestLevel,
        cp: bestCp,
        attack: bestAtk,
        defense: bestDef,
        hp: bestHp,
        statProduct: bestSp,
        percentBest: Math.min(pctBest, 100),
      });
    }

    return calculated;
  }, [selectedPokemon, atkIv, defIv, hpIv, bestIvs]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Crosshair className="h-6 w-6 text-blue-500" />
          IV Checker
        </h2>
        <p className="text-muted-foreground">
          Ingresa los IVs de tu Pokemon y ve su ranking en cada liga
        </p>
      </div>

      {/* Pokemon search */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar Pokemon..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedPokemon(null);
              }}
              className="pl-9"
            />
            {pokemonList.length > 0 && !selectedPokemon && (
              <div className="absolute z-10 top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {pokemonList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPokemon(p)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* IV Inputs */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Attack IV</label>
              <Input
                type="number"
                min={0}
                max={15}
                value={atkIv}
                onChange={(e) => setAtkIv(Math.max(0, Math.min(15, parseInt(e.target.value) || 0)))}
                className="w-20 text-center font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Defense IV</label>
              <Input
                type="number"
                min={0}
                max={15}
                value={defIv}
                onChange={(e) => setDefIv(Math.max(0, Math.min(15, parseInt(e.target.value) || 0)))}
                className="w-20 text-center font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Stamina IV</label>
              <Input
                type="number"
                min={0}
                max={15}
                value={hpIv}
                onChange={(e) => setHpIv(Math.max(0, Math.min(15, parseInt(e.target.value) || 0)))}
                className="w-20 text-center font-mono"
              />
            </div>
            <div className="text-xs text-muted-foreground pb-2">
              Total: <span className="font-mono font-bold">{atkIv + defIv + hpIv}</span>/45
              {atkIv + defIv + hpIv === 45 && (
                <Star className="inline h-3 w-3 ml-1 text-yellow-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="grid gap-4 md:grid-cols-3">
          {results.map((r) => (
            <Card key={r.league} className={r.rank === 1 ? "ring-2 ring-green-500/50" : ""}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={LEAGUE_COLORS[r.league]}>
                    {LEAGUE_NAMES[r.league]}
                  </Badge>
                  {r.rank > 0 ? (
                    <span className="text-lg font-bold">
                      #{r.rank}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin datos</span>
                  )}
                </div>

                {r.rank > 0 && (
                  <>
                    <div className="flex items-baseline gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">CP</div>
                        <div className="text-xl font-mono font-bold">{r.cp}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Nivel</div>
                        <div className="text-lg font-mono">{r.level}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <div className="text-muted-foreground">Atk</div>
                        <div className="font-mono font-medium">{r.attack.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Def</div>
                        <div className="font-mono font-medium">{r.defense.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">HP</div>
                        <div className="font-mono font-medium">{r.hp}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        SP: {Math.round(r.statProduct).toLocaleString()}
                      </span>
                      <span
                        className={`font-bold ${
                          r.percentBest >= 99
                            ? "text-green-500"
                            : r.percentBest >= 95
                            ? "text-blue-500"
                            : r.percentBest >= 90
                            ? "text-amber-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {r.percentBest.toFixed(2)}%
                        {r.percentBest >= 99 && (
                          <Star className="inline h-3 w-3 ml-0.5 text-yellow-500" />
                        )}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedPokemon && !results && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Crosshair className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Modifica los IVs para ver el ranking</p>
          </CardContent>
        </Card>
      )}

      {!selectedPokemon && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Crosshair className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Selecciona un Pokemon para comenzar</p>
            <p className="text-sm mt-1">Busca por nombre o número de Pokedex</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
