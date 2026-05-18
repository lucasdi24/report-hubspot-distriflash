import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  RefreshCw,
  LogOut,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { format, subDays, startOfMonth, startOfQuarter, startOfYear, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

import {
  fetchAccountInfo,
  fetchPipelines,
  fetchDeals,
  fetchContacts,
  fetchOwners,
  sourceLabel,
  type AccountInfo,
  type Pipeline,
  type HSDeal,
  type HSContact,
  type HSOwner,
} from "../lib/hubspot";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SESSION_KEY = "hs_pat_token";

function fmtCurrency(val: number, currency = "USD") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(val);
}

function fmtNum(val: number) {
  return new Intl.NumberFormat("es-AR").format(val);
}

type Range = "7d" | "30d" | "90d" | "month" | "quarter" | "year" | "custom";

function getRangeDates(range: Range, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const to = endOfDay(new Date());
  switch (range) {
    case "7d":
      return { from: subDays(to, 7), to };
    case "30d":
      return { from: subDays(to, 30), to };
    case "90d":
      return { from: subDays(to, 90), to };
    case "month":
      return { from: startOfMonth(to), to };
    case "quarter":
      return { from: startOfQuarter(to), to };
    case "year":
      return { from: startOfYear(to), to };
    case "custom": {
      const from = customFrom ? new Date(customFrom + "T00:00:00") : subDays(to, 30);
      const toEnd = customTo ? endOfDay(new Date(customTo + "T00:00:00")) : to;
      return { from, to: toEnd };
    }
  }
}

const PRESET_RANGES: Exclude<Range, "custom">[] = ["7d", "30d", "90d", "month", "quarter", "year"];

const RANGE_LABELS: Record<Range, string> = {
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
  month: "Este mes",
  quarter: "Este trimestre",
  year: "Este año",
  custom: "Personalizado",
};

const PIE_COLORS = [
  "#FF7A59",
  "#00BDA5",
  "#516F90",
  "#F5C26B",
  "#99ACC2",
  "#6C4298",
  "#E5E8EC",
];

// ─── Token Setup ──────────────────────────────────────────────────────────────

function TokenSetup({ onConnect }: { onConnect: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    const t = token.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      await fetchAccountInfo(t); // validates token
      sessionStorage.setItem(SESSION_KEY, t);
      onConnect(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Token inválido. Verificá que sea un Private App token con los scopes de CRM.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "#FF7A59" }}>
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">HubSpot Reports</h1>
          <p className="text-gray-500 mt-1">Conectá tu cuenta para ver tus métricas</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-base font-medium text-gray-900 mb-4">Private App Token</h2>

          {/* Steps */}
          <ol className="text-sm text-gray-600 space-y-3 mb-6">
            <li className="flex gap-2">
              <span className="font-medium text-gray-400 w-4 shrink-0">1.</span>
              <span>Andá a <strong>HubSpot → Configuración → Integraciones → Apps privadas</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-gray-400 w-4 shrink-0">2.</span>
              <span>
                Creá una nueva app. Scopes necesarios:
                <span className="flex flex-wrap gap-1 mt-1">
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">crm.objects.deals.read</code>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">crm.objects.contacts.read</code>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">crm.objects.owners.read</code>
                </span>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-gray-400 w-4 shrink-0">3.</span>
              <span>Copiá el token y pegalo acá abajo</span>
            </li>
          </ol>

          {/* Input */}
          <div className="relative mb-4">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm font-mono focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{ focusRingColor: "#FF7A59" }}
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Button */}
          <button
            onClick={handleConnect}
            disabled={loading || !token.trim()}
            className="w-full py-3 rounded-xl text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
            style={{ background: "#FF7A59" }}
          >
            {loading ? "Conectando..." : "Conectar cuenta"}
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            El token se guarda solo en tu sesión del navegador y nunca se envía a nuestros servidores.
          </p>
        </div>

        {/* HubSpot docs link */}
        <p className="text-center text-sm text-gray-400 mt-4">
          <a
            href="https://knowledge.hubspot.com/integrations/how-do-i-get-my-hubspot-api-key"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-gray-600 transition"
          >
            Cómo crear una Private App <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-5">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface DashData {
  deals: HSDeal[];
  contacts: HSContact[];
  pipelines: Pipeline[];
  account: AccountInfo;
  owners: HSOwner[];
}

function Dashboard({
  token,
  onDisconnect,
}: {
  token: string;
  onDisconnect: () => void;
}) {
  const [range, setRange] = useState<Range>("30d");
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [customFrom, setCustomFrom] = useState<string>(() =>
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [customTo, setCustomTo] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getRangeDates(range, customFrom, customTo);
      // Primero los 3 livianos (un solo request c/u) en paralelo
      const [account, pipelines, owners] = await Promise.all([
        fetchAccountInfo(token),
        fetchPipelines(token),
        fetchOwners(token),
      ]);
      // Luego los dos paginados secuencial para no chocar contra el secondly limit
      const deals = await fetchDeals(token, from, to);
      const contacts = await fetchContacts(token, from, to);
      setData({ account, pipelines, owners, deals, contacts });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar datos";
      if (msg.includes("scopes") || msg.includes("scope")) {
        setError(
          "Faltan scopes en tu Private App. Agregá estos en HubSpot → Configuración → Integraciones → Apps privadas → tu app → Alcances: crm.objects.deals.read · crm.objects.contacts.read · crm.objects.owners.read"
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [token, range, customFrom, customTo]);

  useEffect(() => { load(); }, [load]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const stageMap = new Map<string, { label: string; pipelineLabel: string; isClosed: boolean; isWon: boolean }>();
  data?.pipelines.forEach((p) => {
    p.stages.forEach((s) => {
      stageMap.set(s.id, {
        label: s.label,
        pipelineLabel: p.label,
        isClosed: s.metadata.isClosed === "true",
        isWon: s.metadata.isClosed === "true" && s.metadata.probability === "1",
      });
    });
  });

  const deals = data?.deals ?? [];
  const contacts = data?.contacts ?? [];
  const currency = data?.account.currency ?? "USD";

  const totalDeals = deals.length;
  const closedWon = deals.filter((d) => {
    const stage = stageMap.get(d.properties.dealstage ?? "");
    return stage?.isWon;
  });
  const revenue = closedWon.reduce((sum, d) => sum + parseFloat(d.properties.amount ?? "0"), 0);
  const pipelineValue = deals
    .filter((d) => {
      const stage = stageMap.get(d.properties.dealstage ?? "");
      return !stage?.isClosed;
    })
    .reduce((sum, d) => sum + parseFloat(d.properties.amount ?? "0"), 0);
  const totalContacts = contacts.length;

  // Pipeline chart: group deals by stage (open stages only)
  const pipelineChartData = Array.from(
    deals.reduce((map, d) => {
      const stageId = d.properties.dealstage ?? "unknown";
      const stageMeta = stageMap.get(stageId);
      if (!stageMeta || stageMeta.isClosed) return map;
      const key = stageMeta.label;
      const existing = map.get(key) ?? { stage: key, cantidad: 0, valor: 0 };
      existing.cantidad += 1;
      existing.valor += parseFloat(d.properties.amount ?? "0");
      map.set(key, existing);
      return map;
    }, new Map<string, { stage: string; cantidad: number; valor: number }>())
  )
    .map(([, v]) => v)
    .sort((a, b) => b.valor - a.valor);

  // Sources pie chart
  const sourcesData = Array.from(
    contacts.reduce((map, c) => {
      const src = sourceLabel(c.properties.hs_analytics_source);
      map.set(src, (map.get(src) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // Contacts by owner (horizontal bar chart)
  const ownerMap = new Map<string, string>();
  data?.owners.forEach((o) => {
    ownerMap.set(o.id, o.firstName ? `${o.firstName} ${o.lastName}`.trim() : o.email);
  });
  const contactsByOwner = Array.from(
    contacts.reduce((map, c) => {
      const ownerId = c.properties.hubspot_owner_id;
      const label = ownerId ? (ownerMap.get(ownerId) ?? `ID ${ownerId}`) : "Sin asignar";
      map.set(label, (map.get(label) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .map(([owner, cantidad]) => ({ owner, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // Pipeline por propietario: un card por owner con sus deals por etapa
  // Las etapas ordenadas por displayOrder (respeta el orden del pipeline en HubSpot)
  const orderedStages = Array.from(stageMap.entries())
    .filter(([, s]) => !s.isClosed)
    .sort((a, b) => {
      const aStage = data?.pipelines.flatMap((p) => p.stages).find((s) => s.id === a[0]);
      const bStage = data?.pipelines.flatMap((p) => p.stages).find((s) => s.id === b[0]);
      return (aStage?.displayOrder ?? 0) - (bStage?.displayOrder ?? 0);
    })
    .map(([id, s]) => ({ id, label: s.label }));

  const pipelineByOwner = Array.from(
    deals.reduce((map, d) => {
      const ownerId = d.properties.hubspot_owner_id;
      const ownerName = ownerId ? (ownerMap.get(ownerId) ?? `ID ${ownerId}`) : "Sin asignar";
      if (!map.has(ownerName)) map.set(ownerName, new Map<string, number>());
      const stageId = d.properties.dealstage ?? "";
      const stageMeta = stageMap.get(stageId);
      if (!stageMeta?.isClosed) {
        const stageLabel = stageMeta?.label ?? stageId;
        const stageMap2 = map.get(ownerName)!;
        stageMap2.set(stageLabel, (stageMap2.get(stageLabel) ?? 0) + 1);
      }
      return map;
    }, new Map<string, Map<string, number>>())
  )
    .map(([owner, stagesMap]) => ({
      owner,
      total: Array.from(stagesMap.values()).reduce((s, v) => s + v, 0),
      stageData: orderedStages
        .map((s) => ({ stage: s.label, cantidad: stagesMap.get(s.label) ?? 0 }))
        .filter((s) => s.cantidad > 0),
    }))
    .filter((o) => o.total > 0)
    .sort((a, b) => b.total - a.total);

  // Recent deals table (top 10 by createdate)
  const recentDeals = [...deals]
    .sort((a, b) => new Date(b.properties.createdate ?? 0).getTime() - new Date(a.properties.createdate ?? 0).getTime())
    .slice(0, 10);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 lg:px-10 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: "#FF7A59" }}>
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900 leading-tight">HubSpot Reports</p>
              {data && (
                <p className="text-xs text-gray-400 leading-tight mt-0.5">
                  {data.account.companyName || `Portal ${data.account.portalId}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Range selector */}
            <div className="relative">
              <button
                onClick={() => setShowRangeMenu((v) => !v)}
                className="flex items-center gap-2 text-sm border border-gray-200 rounded-xl px-4 py-2.5 bg-white hover:bg-gray-50 transition font-medium text-gray-700"
              >
                {range === "custom"
                  ? `${format(new Date(customFrom + "T00:00:00"), "d MMM", { locale: es })} – ${format(new Date(customTo + "T00:00:00"), "d MMM yyyy", { locale: es })}`
                  : RANGE_LABELS[range]}
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showRangeMenu && (
                <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-20">
                  {PRESET_RANGES.map((r) => (
                    <button
                      key={r}
                      onClick={() => { setRange(r); setShowRangeMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition ${r === range ? "font-medium text-gray-900 bg-orange-50/40" : "text-gray-600"}`}
                    >
                      {RANGE_LABELS[r]}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 my-1" />
                  <div className="px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Personalizado</p>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center justify-between gap-2 text-xs text-gray-600">
                        <span>Desde</span>
                        <input
                          type="date"
                          value={customFrom}
                          max={customTo || undefined}
                          onChange={(e) => setCustomFrom(e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-gray-400"
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2 text-xs text-gray-600">
                        <span>Hasta</span>
                        <input
                          type="date"
                          value={customTo}
                          min={customFrom || undefined}
                          max={format(new Date(), "yyyy-MM-dd")}
                          onChange={(e) => setCustomTo(e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-gray-400"
                        />
                      </label>
                      <button
                        onClick={() => { setRange("custom"); setShowRangeMenu(false); }}
                        disabled={!customFrom || !customTo || customFrom > customTo}
                        className="text-sm text-white rounded-lg py-2 mt-1 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
                        style={{ background: "#FF7A59" }}
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={load}
              disabled={loading}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-6 lg:px-10 py-10 space-y-10">
        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-7 h-32 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-5" />
                <div className="h-8 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {data && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <KpiCard
                label="Deals creados"
                value={fmtNum(totalDeals)}
                sub={`${RANGE_LABELS[range].toLowerCase()}`}
                icon={TrendingUp}
                color="#FF7A59"
              />
              <KpiCard
                label="Valor en pipeline"
                value={fmtCurrency(pipelineValue, currency)}
                sub="Deals abiertos"
                icon={DollarSign}
                color="#00BDA5"
              />
              <KpiCard
                label="Revenue cerrado"
                value={fmtCurrency(revenue, currency)}
                sub={`${closedWon.length} deals ganados`}
                icon={CheckCircle2}
                color="#516F90"
              />
              <KpiCard
                label="Nuevos contactos"
                value={fmtNum(totalContacts)}
                sub={`${RANGE_LABELS[range].toLowerCase()}`}
                icon={Users}
                color="#F5C26B"
              />
            </div>

            {/* Charts row */}
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Pipeline by stage — bar chart */}
              <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-7 hover:shadow-md transition-shadow">
                <h3 className="text-base font-semibold text-gray-900">Pipeline por etapa</h3>
                <p className="text-xs text-gray-400 mt-1 mb-6">Valor acumulado de deals abiertos</p>
                {pipelineChartData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-sm text-gray-400">
                    Sin deals abiertos en el período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={pipelineChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis
                        dataKey="stage"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) =>
                          v >= 1000 ? `${currency} ${(v / 1000).toFixed(0)}K` : String(v)
                        }
                        width={70}
                      />
                      <Tooltip
                        formatter={(value: number) => [fmtCurrency(value, currency), "Valor"]}
                        contentStyle={{ borderRadius: 12, border: "1px solid #f3f4f6", fontSize: 12 }}
                      />
                      <Bar dataKey="valor" fill="#FF7A59" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Contacts by source — pie */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-7 hover:shadow-md transition-shadow">
                <h3 className="text-base font-semibold text-gray-900">Contactos por fuente</h3>
                <p className="text-xs text-gray-400 mt-1 mb-3">Distribución por origen</p>
                {sourcesData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-sm text-gray-400">
                    Sin contactos en el período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={sourcesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {sourcesData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [v, "Contactos"]}
                        contentStyle={{ borderRadius: 12, border: "1px solid #f3f4f6", fontSize: 12 }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => <span style={{ fontSize: 11, color: "#6b7280" }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Pipeline por propietario — un card por owner */}
            <div>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Pipeline por propietario</h3>
                  <p className="text-xs text-gray-400 mt-1">Deals abiertos por etapa para cada miembro del equipo</p>
                </div>
                {pipelineByOwner.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {pipelineByOwner.length} propietarios · {pipelineByOwner.reduce((s, o) => s + o.total, 0)} deals abiertos
                  </span>
                )}
              </div>
              {pipelineByOwner.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-32 flex items-center justify-center text-sm text-gray-400">
                  Sin deals abiertos en el período
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {pipelineByOwner.map(({ owner, total, stageData }, idx) => {
                    const ownerColor = [
                      "#FF7A59", "#00BDA5", "#516F90", "#F5C26B", "#6C4298", "#99ACC2",
                    ][idx % 6];
                    // Colores para cada etapa dentro del card (progresión de claro a oscuro)
                    const segColors = [
                      "#E2E8F0","#CBD5E1","#94A3B8","#64748B","#475569","#334155","#1E293B",
                    ];
                    const maxStageCount = Math.max(...stageData.map((s) => s.cantidad), 1);
                    return (
                      <div key={owner} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0"
                              style={{ background: ownerColor }}
                            >
                              {owner.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-900 truncate">{owner}</span>
                          </div>
                          <span
                            className="text-xs font-semibold px-3 py-1.5 rounded-full text-white shrink-0 ml-3"
                            style={{ background: ownerColor }}
                          >
                            {total} deals
                          </span>
                        </div>

                        {/* Stage rows */}
                        <div className="divide-y divide-gray-50 py-1">
                          {stageData.map((s, i) => {
                            const pct = Math.round((s.cantidad / maxStageCount) * 100);
                            return (
                              <div key={s.stage} className="flex items-center gap-4 px-6 py-3.5">
                                {/* Stage name */}
                                <span className="text-sm text-gray-600 w-40 shrink-0 truncate">{s.stage}</span>
                                {/* Bar */}
                                <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden">
                                  <div
                                    className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-500"
                                    style={{
                                      width: `${pct}%`,
                                      minWidth: 32,
                                      background: segColors[i % segColors.length],
                                    }}
                                  >
                                    <span className="text-xs font-semibold text-white">{s.cantidad}</span>
                                  </div>
                                </div>
                                {/* % of owner total */}
                                <span className="text-xs text-gray-400 w-10 text-right shrink-0 font-medium">
                                  {Math.round((s.cantidad / total) * 100)}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent deals table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-7 py-5 border-b border-gray-50">
                <h3 className="text-base font-semibold text-gray-900">Deals recientes</h3>
                <p className="text-xs text-gray-400 mt-1">Últimos 10 deals creados en el período</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-7 py-3.5">Nombre</th>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-7 py-3.5">Etapa</th>
                      <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-7 py-3.5">Valor</th>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-7 py-3.5">Creado</th>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-7 py-3.5">Cierre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentDeals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-400 py-10 text-sm">
                          Sin deals en el período seleccionado
                        </td>
                      </tr>
                    ) : (
                      recentDeals.map((deal) => {
                        const stage = stageMap.get(deal.properties.dealstage ?? "");
                        const amount = parseFloat(deal.properties.amount ?? "0");
                        const isWon = stage?.isWon;
                        const isClosed = stage?.isClosed && !isWon;
                        return (
                          <tr key={deal.id} className="hover:bg-gray-50/50 transition">
                            <td className="px-7 py-4 font-medium text-gray-800 max-w-xs truncate">
                              {deal.properties.dealname ?? "Sin nombre"}
                            </td>
                            <td className="px-7 py-4">
                              <span
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                                style={{
                                  background: isWon ? "#DCFCE7" : isClosed ? "#FEE2E2" : "#FFF7ED",
                                  color: isWon ? "#16A34A" : isClosed ? "#DC2626" : "#C2410C",
                                }}
                              >
                                {stage?.label ?? deal.properties.dealstage ?? "Desconocida"}
                              </span>
                            </td>
                            <td className="px-7 py-4 text-right font-semibold text-gray-800 tabular-nums">
                              {amount > 0 ? fmtCurrency(amount, currency) : "—"}
                            </td>
                            <td className="px-7 py-4 text-gray-500 whitespace-nowrap">
                              {deal.properties.createdate
                                ? format(new Date(deal.properties.createdate), "d MMM yyyy", { locale: es })
                                : "—"}
                            </td>
                            <td className="px-7 py-4 text-gray-500 whitespace-nowrap">
                              {deal.properties.closedate
                                ? format(new Date(deal.properties.closedate), "d MMM yyyy", { locale: es })
                                : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer note */}
            <p className="text-xs text-gray-400 text-center pb-2">
              Datos en tiempo real desde la API de HubSpot · {RANGE_LABELS[range]} ·{" "}
              {format(new Date(), "d MMM yyyy HH:mm", { locale: es })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const FIXED_TOKEN = import.meta.env.VITE_HUBSPOT_TOKEN as string;

export default function HubSpotReports() {
  return <Dashboard token={FIXED_TOKEN} onDisconnect={() => {}} />;
}
