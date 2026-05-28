import { useState, useEffect, useRef, useCallback } from "react";

// ─── Realtime data generators ────────────────────────────────────────────────
const rnd = (min, max) => Math.round(Math.random() * (max - min) + min);
const rndF = (min, max, dp = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(dp));

const genTokenSeries = (n = 20) =>
  Array.from({ length: n }, (_, i) => ({
    t: i,
    tokens: rnd(2000, 9000),
    cost: rndF(0.01, 0.08),
  }));

const genLogLine = () => {
  const levels = ["INFO", "WARN", "ERROR", "DEBUG"];
  const msgs = [
    "Pipeline stage 1 completed in 234ms",
    "Schema validation passed — 12 checks",
    "JWT issued for user session",
    "DB query executed: SELECT * FROM contacts",
    "API endpoint /api/v1/users responded 200",
    "Repair engine patched 2 schema inconsistencies",
    "Memory usage spike detected: 78%",
    "WebSocket connection established",
    "Auth middleware passed role=admin",
    "Cache hit ratio: 94.2%",
    "Rate limit: 847/1000 requests used",
    "GPU kernel launched — inference 38ms",
  ];
  const level = levels[rnd(0, 3)];
  return {
    id: Date.now() + Math.random(),
    ts: new Date().toISOString().split("T")[1].split(".")[0],
    level,
    msg: msgs[rnd(0, msgs.length - 1)],
  };
};

const genSystemMetrics = () => ({
  cpu: rnd(20, 95),
  gpu: rnd(30, 99),
  ram: rnd(40, 88),
  disk: rnd(10, 60),
  net_in: rnd(10, 400),
  net_out: rnd(5, 200),
  uptime: "14d 7h 23m",
  requests: rnd(800, 1200),
  latency: rnd(18, 120),
  error_rate: rndF(0, 3),
});

// ─── Mini sparkline SVG ───────────────────────────────────────────────────────
function Sparkline({ data, color = "#6c63ff", height = 40 }) {
  if (!data || data.length < 2) return null;
  const w = 120, h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Gauge ring ───────────────────────────────────────────────────────────────
function Gauge({ value, max = 100, color = "#6c63ff", size = 64, label }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const dash = pct * circ;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div style={{ marginTop: -44, fontSize: 13, fontWeight: 700, color: "#e8eaf2" }}>{value}%</div>
      <div style={{ fontSize: 10, color: "#555a78", marginTop: 28 }}>{label}</div>
    </div>
  );
}

// ─── Bar chart row ─────────────────────────────────────────────────────────────
function BarRow({ label, value, max, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8b91b0", marginBottom: 4 }}>
        <span>{label}</span><span style={{ color: "#e8eaf2", fontFamily: "monospace" }}>{value}</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: color, borderRadius: 4, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

// ─── Log level badge ──────────────────────────────────────────────────────────
function LogBadge({ level }) {
  const map = {
    INFO: { bg: "rgba(34,217,142,0.12)", c: "#22d98e" },
    WARN: { bg: "rgba(240,165,0,0.12)", c: "#f0a500" },
    ERROR: { bg: "rgba(255,84,112,0.12)", c: "#ff5470" },
    DEBUG: { bg: "rgba(108,99,255,0.12)", c: "#9b8aff" },
  };
  const s = map[level] || map.INFO;
  return (
    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: s.bg, color: s.c, fontFamily: "monospace", fontWeight: 700 }}>
      {level}
    </span>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 18, padding: 22, ...style
    }}>
      {children}
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({ label, value, spark, color = "#6c63ff", unit = "" }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#555a78" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#e8eaf2", fontFamily: "monospace" }}>
        {value}<span style={{ fontSize: 14, color: "#8b91b0", marginLeft: 3 }}>{unit}</span>
      </div>
      {spark && <Sparkline data={spark} color={color} height={32} />}
    </Card>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "success" ? "#0f2d1f" : t.type === "error" ? "#2d0f0f" : "#1a1d2e",
          border: `1px solid ${t.type === "success" ? "rgba(34,217,142,0.3)" : t.type === "error" ? "rgba(255,84,112,0.3)" : "rgba(108,99,255,0.3)"}`,
          color: t.type === "success" ? "#22d98e" : t.type === "error" ? "#ff5470" : "#9b8aff",
          padding: "10px 18px", borderRadius: 12, fontSize: 13, fontFamily: "monospace",
          animation: "slideIn 0.2s ease"
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────
function AuthModal({ onClose, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!email || !password) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    onLogin(email);
    setLoading(false);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ width: 400, background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 36 }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: "#e8eaf2" }}>{isLogin ? "Welcome back" : "Create account"}</div>
        <div style={{ fontSize: 13, color: "#555a78", marginBottom: 28 }}>AI Compiler Platform</div>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
          style={{ width: "100%", background: "#1f2937", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "13px 16px", color: "#e8eaf2", fontSize: 14, marginBottom: 12, boxSizing: "border-box", outline: "none" }} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
          style={{ width: "100%", background: "#1f2937", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "13px 16px", color: "#e8eaf2", fontSize: 14, marginBottom: 22, boxSizing: "border-box", outline: "none" }} />
        <button onClick={handle} disabled={loading}
          style={{ width: "100%", padding: 14, background: loading ? "#2a2f47" : "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 12, color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          {loading ? "Authenticating..." : isLogin ? "Login" : "Register"}
        </button>
        <div onClick={() => setIsLogin(!isLogin)} style={{ marginTop: 16, textAlign: "center", color: "#6c63ff", fontSize: 13, cursor: "pointer" }}>
          {isLogin ? "Create new account" : "Already have an account?"}
        </div>
        <div onClick={onClose} style={{ marginTop: 12, textAlign: "center", color: "#555a78", fontSize: 13, cursor: "pointer" }}>Cancel</div>
      </div>
    </div>
  );
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

// Dashboard / AI Usage
function PageAIUsage({ metrics, tokenSeries, setTokenSeries, addToast }) {
  const totalTokens = tokenSeries.reduce((s, d) => s + d.tokens, 0);
  const avgLatency = metrics.latency;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <StatChip label="Total tokens" value={totalTokens.toLocaleString()} spark={tokenSeries.map(d => d.tokens)} color="#6c63ff" />
        <StatChip label="Avg latency" value={avgLatency} unit="ms" spark={Array.from({ length: 20 }, () => rnd(18, 120))} color="#22d98e" />
        <StatChip label="Active requests" value={metrics.requests} spark={Array.from({ length: 20 }, () => rnd(700, 1300))} color="#38b6ff" />
        <StatChip label="Error rate" value={metrics.error_rate} unit="%" spark={Array.from({ length: 20 }, () => rndF(0, 5))} color="#ff5470" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#8b91b0", marginBottom: 16 }}>Token consumption · 20 cycles</div>
          <svg width="100%" height={120} viewBox={`0 0 ${tokenSeries.length * 18} 120`} preserveAspectRatio="none">
            {tokenSeries.map((d, i) => {
              const barH = (d.tokens / 10000) * 100;
              return <rect key={i} x={i * 18 + 2} y={120 - barH} width={14} height={barH} fill="#6c63ff" opacity={0.7} rx={3} />;
            })}
          </svg>
        </Card>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#8b91b0", marginBottom: 16 }}>Cost per cycle ($)</div>
          <svg width="100%" height={120} viewBox={`0 0 ${tokenSeries.length * 18} 120`} preserveAspectRatio="none">
            {tokenSeries.map((d, i) => {
              const barH = (d.cost / 0.1) * 100;
              return <rect key={i} x={i * 18 + 2} y={120 - barH} width={14} height={barH} fill="#22d98e" opacity={0.7} rx={3} />;
            })}
          </svg>
        </Card>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button onClick={() => {
          const rows = [["Cycle","Tokens","Cost($)"], ...tokenSeries.map((d,i) => [i+1, d.tokens, d.cost.toFixed(4)])];
          const csv = rows.map(r => r.join(",")).join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = "ai_usage_report.csv"; a.click();
          URL.revokeObjectURL(url);
        }}
          style={{ padding: "11px 22px", background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 12, color: "white", fontWeight: 700, cursor: "pointer" }}>
          Export Report
        </button>
        <button onClick={() => {
          setTokenSeries(genTokenSeries());
        }}
          style={{ padding: "11px 22px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#8b91b0", cursor: "pointer" }}>
          Reset Quota
        </button>
      </div>
    </div>
  );
}

// Live Deployment
function PageLiveDeployment({ addToast }) {
  const [deps, setDeps] = useState([
    { id: 1, name: "CRM Platform", env: "Production", status: "running", region: "us-east-1", uptime: "14d 7h", cpu: rnd(20, 70), version: "v2.4.1" },
    { id: 2, name: "HR Management AI", env: "Staging", status: "running", region: "eu-west-1", uptime: "3d 2h", cpu: rnd(10, 50), version: "v1.9.0" },
    { id: 3, name: "Finance AI Bot", env: "Production", status: "stopped", region: "ap-south-1", uptime: "0m", cpu: 0, version: "v3.0.0" },
    { id: 4, name: "Education Tutor AI", env: "Dev", status: "deploying", region: "us-west-2", uptime: "—", cpu: rnd(60, 90), version: "v0.8.2" },
  ]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEnv, setNewEnv] = useState("Production");
  const [newRegion, setNewRegion] = useState("us-east-1");
  const [expandedLogs, setExpandedLogs] = useState(null);
  const [deployingId, setDeployingId] = useState(null);

  const toggle = async (id) => {
    const dep = deps.find(d => d.id === id);
    if (!dep || dep.status === "deploying") return;
    if (dep.status === "running") {
      setDeps(prev => prev.map(d => d.id !== id ? d : { ...d, status: "stopped", cpu: 0, uptime: "0m" }));
    } else {
      setDeployingId(id);
      setDeps(prev => prev.map(d => d.id !== id ? d : { ...d, status: "deploying" }));
      await new Promise(r => setTimeout(r, 1800));
      setDeps(prev => prev.map(d => d.id !== id ? d : { ...d, status: "running", cpu: rnd(20, 60), uptime: "0m" }));
      setDeployingId(null);
    }
  };

  const addDeployment = () => {
    if (!newName.trim()) return;
    setDeps(prev => [...prev, {
      id: Date.now(), name: newName, env: newEnv, status: "deploying",
      region: newRegion, uptime: "—", cpu: rnd(30, 70), version: "v1.0.0"
    }]);
    const newId = Date.now();
    setTimeout(() => setDeps(prev => prev.map(d => d.name === newName && d.status === "deploying" ? { ...d, status: "running", uptime: "0m" } : d)), 2000);
    setNewName(""); setShowNewForm(false);
  };

  const statusColor = { running: "#22d98e", stopped: "#ff5470", deploying: "#f0a500" };

  const inlineLogs = (name) => Array.from({ length: 6 }, (_, i) => genLogLine()).map(l => ({ ...l, msg: l.msg.replace("Pipeline", name) }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button onClick={() => setShowNewForm(v => !v)}
          style={{ padding: "11px 22px", background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 12, color: "white", fontWeight: 700, cursor: "pointer" }}>
          {showNewForm ? "✕ Cancel" : "+ New Deployment"}
        </button>
      </div>

      {showNewForm && (
        <Card style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, color: "#555a78", marginBottom: 5 }}>App name</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="My New App"
              style={{ width: "100%", background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "9px 12px", color: "#e8eaf2", fontSize: 13, boxSizing: "border-box", outline: "none" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#555a78", marginBottom: 5 }}>Environment</div>
            <select value={newEnv} onChange={e => setNewEnv(e.target.value)}
              style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "9px 12px", color: "#e8eaf2", fontSize: 13, outline: "none" }}>
              {["Production","Staging","Dev"].map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#555a78", marginBottom: 5 }}>Region</div>
            <select value={newRegion} onChange={e => setNewRegion(e.target.value)}
              style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "9px 12px", color: "#e8eaf2", fontSize: 13, outline: "none" }}>
              {["us-east-1","eu-west-1","ap-south-1","us-west-2"].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <button onClick={addDeployment}
            style={{ padding: "9px 20px", background: "linear-gradient(135deg,#22d98e,#0fa870)", border: "none", borderRadius: 9, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            Deploy
          </button>
        </Card>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {deps.map(d => (
          <div key={d.id}>
            <Card style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor[d.status], flexShrink: 0, boxShadow: d.status === "running" ? `0 0 0 3px ${statusColor[d.status]}30` : "none",
                animation: d.status === "deploying" ? "pulse 1s infinite" : "none" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#e8eaf2" }}>{d.name}</div>
                <div style={{ fontSize: 12, color: "#555a78", marginTop: 3 }}>{d.env} · {d.region} · {d.version}</div>
              </div>
              <div style={{ textAlign: "center", minWidth: 80 }}>
                <div style={{ fontSize: 11, color: "#555a78" }}>Uptime</div>
                <div style={{ fontSize: 13, color: "#8b91b0", fontFamily: "monospace" }}>{d.uptime}</div>
              </div>
              <div style={{ textAlign: "center", minWidth: 80 }}>
                <div style={{ fontSize: 11, color: "#555a78" }}>CPU</div>
                <div style={{ fontSize: 13, color: d.cpu > 70 ? "#ff5470" : "#22d98e", fontFamily: "monospace" }}>{d.cpu}%</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => toggle(d.id)} disabled={d.status === "deploying"}
                  style={{ padding: "8px 18px", background: d.status === "running" ? "rgba(255,84,112,0.12)" : d.status === "deploying" ? "rgba(240,165,0,0.08)" : "rgba(34,217,142,0.12)", border: `1px solid ${d.status === "running" ? "rgba(255,84,112,0.3)" : d.status === "deploying" ? "rgba(240,165,0,0.3)" : "rgba(34,217,142,0.3)"}`, borderRadius: 10, color: d.status === "running" ? "#ff5470" : d.status === "deploying" ? "#f0a500" : "#22d98e", cursor: d.status === "deploying" ? "default" : "pointer", fontSize: 13, fontWeight: 700 }}>
                  {d.status === "running" ? "Stop" : d.status === "deploying" ? "Deploying…" : "Deploy"}
                </button>
                <button onClick={() => setExpandedLogs(expandedLogs === d.id ? null : d.id)}
                  style={{ padding: "8px 16px", background: expandedLogs === d.id ? "rgba(108,99,255,0.15)" : "transparent", border: `1px solid ${expandedLogs === d.id ? "rgba(108,99,255,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, color: expandedLogs === d.id ? "#9b8aff" : "#8b91b0", cursor: "pointer", fontSize: 12 }}>
                  {expandedLogs === d.id ? "Hide Logs" : "Logs"}
                </button>
              </div>
            </Card>
            {expandedLogs === d.id && (
              <div style={{ background: "rgba(8,12,26,0.9)", border: "1px solid rgba(108,99,255,0.2)", borderTop: "none", borderRadius: "0 0 14px 14px", padding: "12px 16px", fontFamily: "monospace", fontSize: 11 }}>
                <div style={{ color: "#555a78", marginBottom: 8, fontSize: 10, letterSpacing: 1 }}>LOGS · {d.name.toUpperCase()}</div>
                {inlineLogs(d.name).map(l => (
                  <div key={l.id} style={{ display: "flex", gap: 10, padding: "3px 0", alignItems: "center" }}>
                    <span style={{ color: "#444" }}>{l.ts}</span>
                    <LogBadge level={l.level} />
                    <span style={{ color: l.level === "ERROR" ? "#ff5470" : l.level === "WARN" ? "#f0a500" : "#666e99" }}>{l.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Runtime Monitor
function PageRuntimeMonitor({ metrics }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 28 }}>
        <Gauge value={metrics.cpu} color="#6c63ff" size={80} label="CPU" />
        <Gauge value={metrics.gpu} color="#38b6ff" size={80} label="GPU" />
        <Gauge value={metrics.ram} color="#22d98e" size={80} label="RAM" />
        <Gauge value={metrics.disk} color="#f0a500" size={80} label="Disk" />
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#8b91b0", marginBottom: 16 }}>Resource utilisation</div>
        <BarRow label="CPU usage" value={metrics.cpu} max={100} color="#6c63ff" />
        <BarRow label="GPU inference" value={metrics.gpu} max={100} color="#38b6ff" />
        <BarRow label="RAM" value={metrics.ram} max={100} color="#22d98e" />
        <BarRow label="Disk I/O" value={metrics.disk} max={100} color="#f0a500" />
        <BarRow label="Network in (Mbps)" value={metrics.net_in} max={500} color="#9b8aff" />
        <BarRow label="Network out (Mbps)" value={metrics.net_out} max={500} color="#ff5470" />
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          { label: "Uptime", value: metrics.uptime, color: "#22d98e" },
          { label: "Req/sec", value: metrics.requests, color: "#6c63ff" },
          { label: "p99 latency", value: `${metrics.latency}ms`, color: "#38b6ff" },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#555a78", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Token Analytics
function PageTokenAnalytics({ tokenSeries }) {
  const total = tokenSeries.reduce((s, d) => s + d.tokens, 0);
  const totalCost = tokenSeries.reduce((s, d) => s + d.cost, 0);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
        <StatChip label="Total tokens used" value={total.toLocaleString()} spark={tokenSeries.map(d => d.tokens)} color="#6c63ff" />
        <StatChip label="Total cost" value={`$${totalCost.toFixed(3)}`} spark={tokenSeries.map(d => d.cost * 100)} color="#22d98e" />
        <StatChip label="Avg per cycle" value={Math.round(total / tokenSeries.length).toLocaleString()} spark={tokenSeries.map(d => d.tokens)} color="#38b6ff" />
      </div>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#8b91b0", marginBottom: 14 }}>Model breakdown</div>
        {["claude-sonnet-4", "claude-haiku-4", "claude-opus-4"].map((m, i) => (
          <BarRow key={m} label={m} value={Math.round(total * [0.5, 0.3, 0.2][i])} max={total} color={["#6c63ff", "#22d98e", "#38b6ff"][i]} />
        ))}
      </Card>
    </div>
  );
}

// Realtime Logs
function PageRealtimeLogs({ logs }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs.length]);
  return (
    <Card style={{ fontFamily: "monospace", fontSize: 12, maxHeight: 480, overflowY: "auto", padding: 16 }}>
      <div style={{ marginBottom: 12, fontSize: 11, color: "#555a78", letterSpacing: 1, fontWeight: 700 }}>LIVE LOG STREAM</div>
      {logs.map(l => (
        <div key={l.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
          <span style={{ color: "#555a78", flexShrink: 0 }}>{l.ts}</span>
          <LogBadge level={l.level} />
          <span style={{ color: l.level === "ERROR" ? "#ff5470" : l.level === "WARN" ? "#f0a500" : "#8b91b0" }}>{l.msg}</span>
        </div>
      ))}
      <div ref={endRef} />
    </Card>
  );
}

// Projects page generic
function PageProjects({ workspace, addToast, navigate }) {
  const projectMap = {
    "Customer Support Bot": {
      desc: "AI-powered 24/7 customer support with NLP, intent detection and escalation routing.",
      longDesc: "A fully-featured customer support automation platform that handles inbound queries across chat, email, and voice channels. Uses Claude for intent classification, sentiment analysis, and response generation. Escalates to human agents when confidence is below threshold.",
      stack: ["FastAPI", "Claude", "Redis", "PostgreSQL"],
      status: "live",
      version: "v2.1.4",
      license: "MIT",
      stars: 1420,
      forks: 287,
      repo: "forge-ai/customer-support-bot",
      features: ["Multi-channel inbox (chat, email, voice)", "Intent detection with 94% accuracy", "Sentiment-based escalation rules", "Knowledge base with vector search", "Analytics dashboard & CSAT scoring", "Multilingual support (32 languages)"],
      outputs: ["REST API on port 8000", "WebSocket live chat server", "Admin dashboard at /admin", "Webhook integrations (Slack, Zendesk, HubSpot)"],
      guidelines: ["Set ANTHROPIC_API_KEY and DATABASE_URL in .env before running", "Run `python seed_kb.py` to populate the knowledge base before first launch", "Configure escalation thresholds in config/escalation.yaml", "Use `docker-compose up` for local dev; requires Docker ≥ 24"],
      arch: ["Client → API Gateway", "API Gateway → Claude NLP Engine", "Claude Engine → Redis cache", "Redis → PostgreSQL (audit log)"],
    },
    "Healthcare Assistant": {
      desc: "HIPAA-compliant medical AI assistant for appointment scheduling and symptom triage.",
      longDesc: "A HIPAA-compliant clinical assistant that helps patients book appointments, receive pre-visit instructions, and get symptom guidance. All patient data is encrypted at rest and in transit. Integrates with major EHR systems via FHIR R4.",
      stack: ["Next.js", "Claude", "FHIR API", "MongoDB"],
      status: "staging",
      version: "v1.3.0",
      license: "Apache 2.0",
      stars: 834,
      forks: 112,
      repo: "forge-ai/healthcare-assistant",
      features: ["Symptom triage with ICD-10 mapping", "Appointment booking via FHIR R4", "Pre-visit questionnaire automation", "Medication reminder system", "Secure patient portal (HIPAA)", "EHR integration (Epic, Cerner)"],
      outputs: ["Next.js app on port 3000", "FHIR proxy server on port 4000", "Patient portal at /portal", "Webhook for EHR sync events"],
      guidelines: ["Requires HIPAA Business Associate Agreement before production use", "Configure FHIR_BASE_URL and FHIR_CLIENT_ID in environment", "Run HIPAA compliance checklist in /docs/hipaa-checklist.md", "Do NOT store raw PII in logs — use the anonymized audit logger"],
      arch: ["Patient → Next.js UI", "UI → Claude Triage Engine", "Claude → FHIR Proxy", "FHIR Proxy → EHR System"],
    },
    "Finance AI Bot": {
      desc: "Real-time financial analytics bot with portfolio management and risk assessment.",
      longDesc: "A quantitative finance assistant that aggregates market data, analyses portfolio exposure, and generates risk reports. Uses Claude for natural-language query parsing so non-technical users can ask plain-English questions about their portfolio.",
      stack: ["React", "Claude", "Stripe", "TimescaleDB"],
      status: "stopped",
      version: "v3.0.0",
      license: "MIT",
      stars: 2100,
      forks: 445,
      repo: "forge-ai/finance-ai-bot",
      features: ["Real-time price feeds (stocks, crypto, FX)", "Portfolio P&L and attribution analysis", "VaR and stress-test risk models", "Natural-language query interface", "Automated PDF report generation", "Stripe-billed subscription tiers"],
      outputs: ["React dashboard on port 3000", "WebSocket price stream on port 5001", "REST API on port 8000", "Scheduled report emails (cron)"],
      guidelines: ["Add MARKET_DATA_API_KEY (Polygon.io or Alpha Vantage) to .env", "TimescaleDB must be initialised with `psql -f schema/timescale_init.sql`", "Set REPORT_CRON in config to control scheduled report timing", "Paper-trading mode enabled by default — set LIVE_TRADING=false to keep it safe"],
      arch: ["User → React UI", "UI → Claude NLQ Parser", "Claude → Finance API", "Finance API → TimescaleDB"],
    },
    "Education Tutor AI": {
      desc: "Adaptive learning platform with personalised curriculum and progress tracking.",
      longDesc: "An intelligent tutoring system that adapts lesson difficulty in real-time based on student performance. Uses spaced-repetition and Bloom's taxonomy to structure learning paths. Supports K-12 through university level across STEM and humanities.",
      stack: ["Vue.js", "Claude", "LangChain", "Pinecone"],
      status: "dev",
      version: "v0.8.2",
      license: "GPL-3.0",
      stars: 560,
      forks: 78,
      repo: "forge-ai/education-tutor-ai",
      features: ["Adaptive difficulty via IRT model", "Spaced-repetition flashcard system", "Progress tracking & mastery scores", "Multi-subject knowledge graph", "Parent/teacher reporting dashboard", "Video lesson recommendations"],
      outputs: ["Vue.js app on port 8080", "LangChain agent server on port 7000", "Pinecone index: tutor-knowledge-base", "Student progress API on port 8001"],
      guidelines: ["Set PINECONE_API_KEY and PINECONE_ENV before running knowledge ingestion", "Run `npm run seed-curriculum` to load default subject trees", "Adjust Bloom's taxonomy weights in config/pedagogy.json", "Student data must not leave the local region — check GDPR config in .env"],
      arch: ["Student → Vue.js UI", "UI → LangChain Agent", "Agent → Pinecone vector search", "Agent → Claude reasoning"],
    },
    "CRM Platform": {
      desc: "Full-featured CRM with AI-powered lead scoring, pipeline management and analytics.",
      longDesc: "An enterprise CRM that combines traditional pipeline management with AI lead scoring, churn prediction, and automated outreach sequences. Claude generates personalised email drafts and call scripts based on contact history.",
      stack: ["React", "FastAPI", "PostgreSQL", "Redis"],
      status: "live",
      version: "v2.4.1",
      license: "MIT",
      stars: 3800,
      forks: 721,
      repo: "forge-ai/crm-platform",
      features: ["AI lead scoring (0–100 propensity)", "Visual pipeline with drag-and-drop", "Automated email sequences", "Call script generation via Claude", "Churn prediction model", "Salesforce & HubSpot data import"],
      outputs: ["React frontend on port 3000", "FastAPI backend on port 8000", "Background workers (Celery)", "Webhook endpoint at /api/webhooks"],
      guidelines: ["Run `alembic upgrade head` to apply DB migrations before starting", "Set SMTP credentials in .env for outbound email sequences", "Seed demo data with `python manage.py seed --demo`", "Rate-limit Claude calls — default 60 req/min, configurable in config/ai.yaml"],
      arch: ["User → React SPA", "React → FastAPI REST", "FastAPI → Claude scoring", "FastAPI → PostgreSQL + Redis"],
    },
    "AI Invoice Generator": {
      desc: "Automated invoice generation with OCR, tax calculation and payment integration.",
      longDesc: "An intelligent invoicing tool that extracts line items from receipts, contracts, and purchase orders using OCR + Claude, automatically calculates applicable taxes by jurisdiction, and creates professional invoices. Integrates with Stripe for one-click payment collection.",
      stack: ["React", "Python", "Stripe", "MySQL"],
      status: "live",
      version: "v1.7.2",
      license: "MIT",
      stars: 1950,
      forks: 334,
      repo: "forge-ai/ai-invoice-generator",
      features: ["OCR extraction from PDFs, images, emails", "Auto tax calculation (150+ jurisdictions)", "Stripe payment link generation", "Recurring invoice scheduling", "Multi-currency support (45 currencies)", "QuickBooks & Xero export"],
      outputs: ["React app on port 3000", "Python OCR service on port 5050", "Stripe webhook receiver at /webhooks/stripe", "Invoice PDF storage in /storage/invoices"],
      guidelines: ["Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env", "MySQL schema is in db/schema.sql — run before first start", "Upload sample invoices to /samples to test OCR pipeline", "Configure tax rules per jurisdiction in config/tax_rules.json"],
      arch: ["User → React UI", "UI → Python OCR + Claude", "Claude → Tax engine", "Tax engine → Stripe API"],
    },
    "HR Management AI": {
      desc: "End-to-end HR platform with recruitment AI, performance tracking and payroll.",
      longDesc: "A comprehensive HR suite that automates the full employee lifecycle from applicant screening to offboarding. Claude screens CVs, generates interview questions, writes performance summaries, and flags policy violations in communications.",
      stack: ["React", "Django", "PostgreSQL", "Celery"],
      status: "staging",
      version: "v1.9.0",
      license: "Apache 2.0",
      stars: 1100,
      forks: 198,
      repo: "forge-ai/hr-management-ai",
      features: ["AI CV screening with bias controls", "Interview question generator", "Performance review automation", "Leave and attendance tracking", "Payroll calculation engine", "Policy compliance monitoring"],
      outputs: ["React frontend on port 3000", "Django API on port 8000", "Celery workers (payroll, email)", "Admin panel at /admin"],
      guidelines: ["Run `python manage.py migrate` after cloning", "Configure PAYROLL_CURRENCY and TAX_REGION in settings.py", "Enable bias-mitigation in config/screening.yaml before live CV screening", "Set up Celery with Redis broker: CELERY_BROKER_URL in .env"],
      arch: ["HR User → React UI", "React → Django REST", "Django → Claude screening", "Django → Celery payroll jobs"],
    },
  };

  const p = projectMap[workspace] || {
    desc: `${workspace} project workspace.`,
    longDesc: `${workspace} is a Forge AI project. Configure it via the editor and deploy when ready.`,
    stack: ["React", "FastAPI"], status: "dev", version: "v1.0.0", license: "MIT",
    stars: 0, forks: 0, repo: `forge-ai/${workspace.toLowerCase().replace(/ /g,"-")}`,
    features: ["Core AI features", "REST API", "Auth system"],
    outputs: ["Web app on port 3000", "API on port 8000"],
    guidelines: ["Set ANTHROPIC_API_KEY in .env", "Run install script before starting"],
    arch: ["Client → API", "API → Claude", "Claude → Database"],
  };

  const [status, setStatus] = useState(p.status);
  const [testResults, setTestResults] = useState(null);
  const [runningTests, setRunningTests] = useState(false);
  const [showApiDocs, setShowApiDocs] = useState(false);
  const [showClonePanel, setShowClonePanel] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const statusColor = { live: "#22d98e", staging: "#f0a500", stopped: "#ff5470", dev: "#6c63ff" };

  const runTests = async () => {
    setRunningTests(true); setTestResults(null);
    await new Promise(r => setTimeout(r, 1600));
    const tests = [
      { name: "Auth middleware", result: "pass" },
      { name: "API endpoints", result: Math.random() > 0.2 ? "pass" : "fail" },
      { name: "Schema validation", result: "pass" },
      { name: "Rate limiting", result: "pass" },
      { name: "Error handling", result: Math.random() > 0.3 ? "pass" : "fail" },
    ];
    setTestResults(tests); setRunningTests(false);
  };

  const deploy = async () => {
    setDeploying(true); setStatus("staging");
    await new Promise(r => setTimeout(r, 2000));
    setStatus("live"); setDeploying(false);
  };

  const slug = p.repo.split("/")[1];
  const cloneOptions = [
    { name: "GitHub", icon: "🐙", url: `https://github.com/${p.repo}`, cmd: `git clone https://github.com/${p.repo}.git`, color: "#e8eaf2", bg: "rgba(255,255,255,0.06)" },
    { name: "GitLab", icon: "🦊", url: `https://gitlab.com/${p.repo}`, cmd: `git clone https://gitlab.com/${p.repo}.git`, color: "#fc6d26", bg: "rgba(252,109,38,0.08)" },
    { name: "Bitbucket", icon: "🪣", url: `https://bitbucket.org/${p.repo}`, cmd: `git clone https://bitbucket.org/${p.repo}.git`, color: "#2684ff", bg: "rgba(38,132,255,0.08)" },
    { name: "Replit", icon: "♻️", url: `https://replit.com/github/${p.repo}`, cmd: null, color: "#f26207", bg: "rgba(242,98,7,0.08)" },
    { name: "CodeSandbox", icon: "📦", url: `https://codesandbox.io/p/github/${p.repo}`, cmd: null, color: "#dcf3ff", bg: "rgba(220,243,255,0.06)" },
    { name: "Vercel", icon: "▲", url: `https://vercel.com/new/clone?repository-url=https://github.com/${p.repo}`, cmd: null, color: "#e8eaf2", bg: "rgba(255,255,255,0.04)" },
  ];

  const tabs = ["overview", "output", "guidelines", "architecture", "clone"];

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#e8eaf2" }}>{workspace}</div>
              <span style={{ fontSize: 11, padding: "3px 10px", background: `${statusColor[status]}18`, color: statusColor[status], borderRadius: 8, border: `1px solid ${statusColor[status]}40`, fontWeight: 700 }}>{status.toUpperCase()}</span>
              <span style={{ fontSize: 11, color: "#555a78", fontFamily: "monospace" }}>{p.version}</span>
              <span style={{ fontSize: 11, color: "#555a78", padding: "2px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 6 }}>{p.license}</span>
            </div>
            <div style={{ fontSize: 13, color: "#8b91b0", lineHeight: 1.6, maxWidth: 600 }}>{p.desc}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {p.stack.map(s => (
                <span key={s} style={{ fontSize: 11, padding: "3px 10px", background: "rgba(108,99,255,0.12)", color: "#9b8aff", borderRadius: 6, border: "1px solid rgba(108,99,255,0.2)" }}>{s}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#555a78" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#e8eaf2" }}>⭐ {p.stars.toLocaleString()}</div>
              <div>Stars</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#e8eaf2" }}>🍴 {p.forks.toLocaleString()}</div>
              <div>Forks</div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button onClick={() => navigate && navigate("Dashboard", "Overview", "AI Builder")}
            style={{ padding: "9px 18px", background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 10, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            ✏️ Open in Editor
          </button>
          <button onClick={() => navigate && navigate("Dashboard", "Insights", "Realtime Logs")}
            style={{ padding: "9px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#8b91b0", cursor: "pointer", fontSize: 13 }}>
            📋 View Logs
          </button>
          <button onClick={deploy} disabled={deploying || status === "live"}
            style={{ padding: "9px 18px", background: deploying ? "rgba(240,165,0,0.1)" : status === "live" ? "rgba(34,217,142,0.08)" : "rgba(34,217,142,0.1)", border: `1px solid ${deploying ? "rgba(240,165,0,0.3)" : status === "live" ? "rgba(34,217,142,0.3)" : "rgba(34,217,142,0.25)"}`, borderRadius: 10, color: deploying ? "#f0a500" : "#22d98e", cursor: deploying || status === "live" ? "default" : "pointer", fontSize: 13, fontWeight: 600 }}>
            {deploying ? "⏳ Deploying…" : status === "live" ? "✓ Live" : "🚀 Deploy"}
          </button>
          <button onClick={runTests} disabled={runningTests}
            style={{ padding: "9px 18px", background: runningTests ? "rgba(108,99,255,0.1)" : "transparent", border: `1px solid ${runningTests ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: runningTests ? "#9b8aff" : "#8b91b0", cursor: runningTests ? "default" : "pointer", fontSize: 13 }}>
            {runningTests ? "⏳ Running…" : "🧪 Run Tests"}
          </button>
          <button onClick={() => { setShowClonePanel(v => !v); setActiveTab("clone"); }}
            style={{ padding: "9px 18px", background: showClonePanel ? "rgba(108,99,255,0.15)" : "transparent", border: `1px solid ${showClonePanel ? "rgba(108,99,255,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: showClonePanel ? "#9b8aff" : "#8b91b0", cursor: "pointer", fontSize: 13 }}>
            📥 Clone Project
          </button>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); if (tab === "clone") setShowClonePanel(true); }}
            style={{ padding: "9px 18px", background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab ? "#6c63ff" : "transparent"}`, color: activeTab === tab ? "#9b8aff" : "#555a78", cursor: "pointer", fontSize: 13, fontWeight: activeTab === tab ? 700 : 400, textTransform: "capitalize", transition: "all 0.15s" }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9b8aff", marginBottom: 14 }}>About this project</div>
            <p style={{ fontSize: 14, color: "#8b91b0", lineHeight: 1.8, margin: 0 }}>{p.longDesc}</p>
          </Card>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9b8aff", marginBottom: 14 }}>Key features</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {p.features.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#22d98e", fontSize: 13, marginTop: 1, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#8b91b0", lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Output */}
      {activeTab === "output" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9b8aff", marginBottom: 14 }}>Project outputs</div>
            <div style={{ display: "grid", gap: 10 }}>
              {p.outputs.map((o, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "rgba(0,0,0,0.25)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d98e", flexShrink: 0, boxShadow: "0 0 6px #22d98e66" }} />
                  <span style={{ fontSize: 13, color: "#e8eaf2", fontFamily: "monospace" }}>{o}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9b8aff", marginBottom: 14 }}>Quick start</div>
            <div style={{ background: "#0a0d1a", borderRadius: 10, padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: "#8b91b0", lineHeight: 2 }}>
              <div><span style={{ color: "#555a78" }}># Clone and install</span></div>
              <div><span style={{ color: "#22d98e" }}>git</span> clone https://github.com/{p.repo}.git</div>
              <div><span style={{ color: "#22d98e" }}>cd</span> {slug} && npm install</div>
              <div style={{ marginTop: 6 }}><span style={{ color: "#555a78" }}># Configure environment</span></div>
              <div><span style={{ color: "#22d98e" }}>cp</span> .env.example .env</div>
              <div style={{ marginTop: 6 }}><span style={{ color: "#555a78" }}># Start development server</span></div>
              <div><span style={{ color: "#22d98e" }}>npm</span> run dev</div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Guidelines */}
      {activeTab === "guidelines" && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9b8aff", marginBottom: 16 }}>Setup & usage guidelines</div>
          <div style={{ display: "grid", gap: 12 }}>
            {p.guidelines.map((g, i) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "14px 16px", background: "rgba(0,0,0,0.2)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", alignItems: "flex-start" }}>
                <div style={{ minWidth: 24, height: 24, borderRadius: "50%", background: "rgba(108,99,255,0.15)", border: "1px solid rgba(108,99,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#9b8aff", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: 13, color: "#8b91b0", lineHeight: 1.6 }}>{g}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(240,165,0,0.06)", border: "1px solid rgba(240,165,0,0.2)", borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: "#f0a500", fontWeight: 700, marginBottom: 4 }}>⚠ Before going to production</div>
            <div style={{ fontSize: 12, color: "#8b91b0", lineHeight: 1.6 }}>Review all environment variables, rotate default secrets, enable rate limiting, and ensure your API keys are scoped to the minimum required permissions.</div>
          </div>
        </Card>
      )}

      {/* Tab: Architecture */}
      {activeTab === "architecture" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9b8aff", marginBottom: 16 }}>System architecture</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "flex-start" }}>
              {p.arch.map((step, i) => {
                const [from, to] = step.split(" → ");
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ padding: "8px 16px", background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.25)", borderRadius: 8, fontSize: 12, color: "#9b8aff", fontWeight: 600 }}>{from}</div>
                      <span style={{ color: "#6c63ff", fontSize: 16 }}>→</span>
                      <div style={{ padding: "8px 16px", background: "rgba(34,217,142,0.08)", border: "1px solid rgba(34,217,142,0.2)", borderRadius: 8, fontSize: 12, color: "#22d98e", fontWeight: 600 }}>{to}</div>
                    </div>
                    {i < p.arch.length - 1 && <div style={{ width: 2, height: 18, background: "rgba(108,99,255,0.2)", marginLeft: 44 }} />}
                  </div>
                );
              })}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9b8aff", marginBottom: 14 }}>Tech stack details</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
              {p.stack.map((s, i) => {
                const roles = ["Frontend / API", "AI Engine", "Cache / Queue", "Database", "Auth", "Payments"];
                return (
                  <div key={s} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: "#e8eaf2", fontWeight: 600, flex: 1 }}>{s}</span>
                    <span style={{ fontSize: 11, color: "#555a78" }}>{roles[i] || "Service"}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Clone */}
      {activeTab === "clone" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9b8aff", marginBottom: 6 }}>Clone to your platform</div>
            <div style={{ fontSize: 12, color: "#555a78", marginBottom: 16 }}>Open or import this project directly into your preferred platform with one click.</div>
            <div style={{ display: "grid", gap: 10 }}>
              {cloneOptions.map(opt => (
                <div key={opt.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: opt.bg, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: opt.color, marginBottom: 3 }}>{opt.name}</div>
                    {opt.cmd && <div style={{ fontSize: 11, color: "#555a78", fontFamily: "monospace" }}>{opt.cmd}</div>}
                    {!opt.cmd && <div style={{ fontSize: 11, color: "#555a78" }}>One-click import via {opt.name}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {opt.cmd && (
                      <button onClick={() => navigator.clipboard?.writeText(opt.cmd)}
                        style={{ padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#8b91b0", cursor: "pointer", fontSize: 11 }}>
                        Copy
                      </button>
                    )}
                    <a href={opt.url} target="_blank" rel="noopener noreferrer"
                      style={{ padding: "6px 14px", background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 8, color: "white", cursor: "pointer", fontSize: 12, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                      Open ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9b8aff", marginBottom: 10 }}>SSH clone</div>
            <div style={{ background: "#0a0d1a", borderRadius: 10, padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: "#8b91b0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span>git clone git@github.com:{p.repo}.git</span>
              <button onClick={() => navigator.clipboard?.writeText(`git clone git@github.com:${p.repo}.git`)}
                style={{ padding: "5px 12px", background: "rgba(108,99,255,0.12)", border: "1px solid rgba(108,99,255,0.25)", borderRadius: 7, color: "#9b8aff", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>
                Copy
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Test results */}
      {testResults && (
        <Card style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#8b91b0", marginBottom: 12 }}>
            Test Results · {testResults.filter(t => t.result === "pass").length}/{testResults.length} passed
          </div>
          {testResults.map(t => (
            <div key={t.name} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
              <span style={{ color: "#8b91b0" }}>{t.name}</span>
              <span style={{ color: t.result === "pass" ? "#22d98e" : "#ff5470", fontFamily: "monospace", fontSize: 12 }}>{t.result === "pass" ? "✓ PASS" : "✗ FAIL"}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// Templates page
function PageTemplates({ workspace, addToast, navigate }) {
  const templates = {
    "AI Landing Page": { preview: "#6c63ff", comp: 12, downloads: 3400, prompt: "Build an AI SaaS landing page with hero section, features grid, pricing plans, testimonials, and CTA buttons" },
    "Dashboard UI": { preview: "#22d98e", comp: 28, downloads: 5600, prompt: "Build a modern analytics dashboard with sidebar nav, stat cards, line charts, data table, and dark theme" },
    "Admin Panel": { preview: "#38b6ff", comp: 45, downloads: 2200, prompt: "Build a full admin panel with user management, role controls, audit logs, and settings pages" },
    "FastAPI Boilerplate": { preview: "#f0a500", comp: 8, downloads: 7800, prompt: "Build a FastAPI backend with JWT auth, CRUD endpoints, PostgreSQL models, rate limiting, and Swagger docs" },
    "Authentication API": { preview: "#ff5470", comp: 6, downloads: 4300, prompt: "Build a secure authentication API with login, register, refresh tokens, 2FA, and password reset flows" },
    "Realtime API": { preview: "#9b8aff", comp: 14, downloads: 3100, prompt: "Build a realtime API with WebSocket support, event streaming, pub/sub channels, and connection management" },
  };
  const t = templates[workspace] || { preview: "#6c63ff", comp: 10, downloads: 1000, prompt: `Build a ${workspace} application` };
  const [showPreview, setShowPreview] = useState(false);

  const previewComponents = [
    { name: "Hero Section", lines: rnd(80, 140) },
    { name: "Navigation Bar", lines: rnd(40, 80) },
    { name: "Feature Cards", lines: rnd(60, 120) },
    { name: "Data Table", lines: rnd(100, 200) },
    { name: "Auth Forms", lines: rnd(70, 130) },
    { name: "Settings Panel", lines: rnd(90, 160) },
  ].slice(0, t.comp > 20 ? 6 : t.comp > 10 ? 4 : 3);

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: 16, background: `${t.preview}20`, border: `2px solid ${t.preview}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>
            📦
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#e8eaf2" }}>{workspace}</div>
            <div style={{ fontSize: 13, color: "#8b91b0", marginTop: 4 }}>{t.comp} components · {t.downloads.toLocaleString()} downloads</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button onClick={() => navigate && navigate("Dashboard", "Overview", "AI Builder", t.prompt)}
              style={{ padding: "11px 20px", background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 12, color: "white", fontWeight: 700, cursor: "pointer" }}>
              Use Template
            </button>
            <button onClick={() => setShowPreview(v => !v)}
              style={{ padding: "11px 20px", background: showPreview ? "rgba(108,99,255,0.15)" : "transparent", border: `1px solid ${showPreview ? "rgba(108,99,255,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, color: showPreview ? "#9b8aff" : "#8b91b0", cursor: "pointer" }}>
              {showPreview ? "Close Preview" : "Preview"}
            </button>
          </div>
        </div>
      </Card>

      {showPreview && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#8b91b0", marginBottom: 14 }}>Template preview · {previewComponents.length} components</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
            {previewComponents.map((c, i) => (
              <div key={i} style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${t.preview}25` }}>
                <div style={{ height: 70, background: `${t.preview}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "60%", height: 8, background: `${t.preview}40`, borderRadius: 4 }} />
                </div>
                <div style={{ padding: "8px 10px", background: "rgba(0,0,0,0.3)" }}>
                  <div style={{ fontSize: 12, color: "#8b91b0", fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{c.lines} lines</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 10, fontFamily: "monospace", fontSize: 11, color: "#555a78" }}>
            <span style={{ color: t.preview }}>// {workspace}</span><br />
            <span style={{ color: "#6c63ff" }}>import</span> {"{"} {previewComponents.map(c => c.name.replace(" ", "")).join(", ")} {"}"} <span style={{ color: "#6c63ff" }}>from</span> <span style={{ color: "#22d98e" }}>"./{workspace.replace(" ", "")}"</span>
          </div>
        </Card>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} style={{ cursor: "pointer" }} onClick={() => addToast(`Component ${i + 1} selected`, "info")}>
            <div style={{ height: 60, background: `${t.preview}10`, borderRadius: 10, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", color: t.preview, fontSize: 12 }}>Component {i + 1}</div>
            <div style={{ fontSize: 12, color: "#8b91b0" }}>Block · {rnd(200, 800)} lines</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Analytics pages
function PageAnalytics({ workspace, metrics, addToast }) {
  const isRevenue = workspace === "Revenue Analytics";
  const isGPU = workspace === "GPU Usage";
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState("Weekly");
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [scheduled, setScheduled] = useState(false);

  const exportCSV = () => {
    const rows = isRevenue
      ? [["Metric","Value"],["MRR","48200"],["ARR","578000"],["Churn","2.1%"],["ARPU","94"]]
      : isGPU
      ? [["Metric","Value"],["GPU util",metrics.gpu+"%"],["VRAM","18.4 GB"],["Temp","67°C"],["Power","280W"]]
      : [["Metric","Value"],["Req/sec",metrics.requests],["p99",metrics.latency+"ms"],["Error%",metrics.error_rate+"%"],["Throughput","4.2 GB/s"]];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${workspace.replace(" ","_")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {(isRevenue
          ? [{ l: "MRR", v: "$48,200", c: "#22d98e" }, { l: "ARR", v: "$578K", c: "#6c63ff" }, { l: "Churn", v: "2.1%", c: "#ff5470" }, { l: "ARPU", v: "$94", c: "#38b6ff" }]
          : isGPU
          ? [{ l: "GPU util", v: `${metrics.gpu}%`, c: "#38b6ff" }, { l: "VRAM", v: "18.4 GB", c: "#6c63ff" }, { l: "Temp", v: "67°C", c: "#f0a500" }, { l: "Power", v: "280W", c: "#ff5470" }]
          : [{ l: "Req/sec", v: metrics.requests, c: "#6c63ff" }, { l: "p99", v: `${metrics.latency}ms`, c: "#22d98e" }, { l: "Error %", v: `${metrics.error_rate}%`, c: "#ff5470" }, { l: "Throughput", v: "4.2 GB/s", c: "#38b6ff" }]
        ).map(s => (
          <Card key={s.l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#555a78" }}>{s.l}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.c, fontFamily: "monospace", marginTop: 6 }}>{s.v}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#8b91b0", marginBottom: 14 }}>Time series — last 30 cycles</div>
        <svg width="100%" height={140} viewBox="0 0 600 140" preserveAspectRatio="none">
          {Array.from({ length: 30 }, (_, i) => {
            const v = rnd(30, 100);
            return <rect key={i} x={i * 20 + 1} y={140 - v} width={18} height={v} fill="#6c63ff" opacity={0.6 + i / 60} rx={2} />;
          })}
        </svg>
      </Card>
      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <button onClick={exportCSV}
          style={{ padding: "10px 20px", background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 10, color: "white", fontWeight: 700, cursor: "pointer" }}>
          Export CSV
        </button>
        <button onClick={() => { setScheduleOpen(v => !v); setScheduled(false); }}
          style={{ padding: "10px 20px", background: scheduleOpen ? "rgba(108,99,255,0.12)" : "transparent", border: `1px solid ${scheduleOpen ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: scheduleOpen ? "#9b8aff" : "#8b91b0", cursor: "pointer" }}>
          Schedule Report
        </button>
      </div>
      {scheduleOpen && (
        <Card style={{ marginTop: 14 }}>
          {scheduled ? (
            <div style={{ color: "#22d98e", fontSize: 13 }}>✓ Report scheduled — {scheduleFreq} digest to <strong>{scheduleEmail || "your account email"}</strong></div>
          ) : (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, color: "#555a78", marginBottom: 5 }}>Email (optional)</div>
                <input value={scheduleEmail} onChange={e => setScheduleEmail(e.target.value)} placeholder="you@example.com"
                  style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "8px 12px", color: "#e8eaf2", fontSize: 13, outline: "none", width: 200 }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#555a78", marginBottom: 5 }}>Frequency</div>
                <select value={scheduleFreq} onChange={e => setScheduleFreq(e.target.value)}
                  style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "8px 12px", color: "#e8eaf2", fontSize: 13, outline: "none" }}>
                  {["Daily","Weekly","Monthly"].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <button onClick={() => setScheduled(true)}
                style={{ padding: "9px 18px", background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 9, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                Confirm
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// Settings pages
function PageSettings({ workspace, user, addToast }) {
  const [name, setName] = useState(user?.split("@")[0] || "User");
  const [theme, setTheme] = useState("Dark");
  const [notifs, setNotifs] = useState(true);
  const [twoFA, setTwoFA] = useState(false);
  const [saved, setSaved] = useState(false);
  const [plan, setPlan] = useState("Pro");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [members, setMembers] = useState(["admin@forge.ai", "dev1@forge.ai", "analyst@forge.ai"]);
  const [inviteEmail, setInviteEmail] = useState("");

  if (workspace === "Billing") return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e8eaf2", marginBottom: 4 }}>Current plan</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: plan === "Enterprise" ? "#22d98e" : "#6c63ff" }}>
          {plan === "Enterprise" ? "Enterprise · $199/mo" : "Pro · $49/mo"}
        </div>
        <div style={{ fontSize: 13, color: "#8b91b0", marginTop: 6 }}>Next billing: July 1, 2026 · {plan === "Enterprise" ? "Unlimited" : "5"} seats</div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {plan !== "Enterprise" && (
            <button onClick={() => setShowUpgradeModal(true)}
              style={{ padding: "10px 20px", background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 10, color: "white", fontWeight: 700, cursor: "pointer" }}>
              Upgrade to Enterprise
            </button>
          )}
          {plan === "Enterprise" && (
            <div style={{ padding: "10px 20px", background: "rgba(34,217,142,0.08)", border: "1px solid rgba(34,217,142,0.2)", borderRadius: 10, color: "#22d98e", fontSize: 13, fontWeight: 700 }}>
              ✓ Enterprise Active
            </div>
          )}
          <button onClick={() => {
            const inv = `INVOICE\nForge AI Platform\n${plan} Plan\nDate: May 28, 2026\nAmount: ${plan === "Enterprise" ? "$199.00" : "$49.00"}\nStatus: PAID`;
            const blob = new Blob([inv], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "forge_invoice_may2026.txt"; a.click();
            URL.revokeObjectURL(url);
          }} style={{ padding: "10px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#8b91b0", cursor: "pointer" }}>
            Download Invoice
          </button>
        </div>
      </Card>
      {showUpgradeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <Card style={{ width: 420 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#e8eaf2", marginBottom: 6 }}>Upgrade to Enterprise</div>
            <div style={{ fontSize: 13, color: "#8b91b0", marginBottom: 20, lineHeight: 1.6 }}>Unlimited seats · SSO · Priority support · Custom SLA · Dedicated infra</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#22d98e", marginBottom: 20 }}>$199<span style={{ fontSize: 14, color: "#8b91b0" }}>/mo</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setPlan("Enterprise"); setShowUpgradeModal(false); }}
                style={{ flex: 1, padding: 12, background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 12, color: "white", fontWeight: 700, cursor: "pointer" }}>
                Confirm Upgrade
              </button>
              <button onClick={() => setShowUpgradeModal(false)}
                style={{ padding: "12px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#8b91b0", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  if (workspace === "Team Settings") return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#8b91b0", marginBottom: 14 }}>Team members</div>
        {members.map(m => (
          <div key={m} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#2a2f47", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#9b8aff" }}>{m[0].toUpperCase()}</div>
            <div style={{ flex: 1, fontSize: 13, color: "#8b91b0" }}>{m}</div>
            <span style={{ fontSize: 11, padding: "2px 10px", background: "rgba(34,217,142,0.1)", color: "#22d98e", borderRadius: 6 }}>Active</span>
            <button onClick={() => setMembers(prev => prev.filter(x => x !== m))}
              style={{ padding: "5px 12px", background: "rgba(255,84,112,0.1)", border: "1px solid rgba(255,84,112,0.2)", borderRadius: 8, color: "#ff5470", cursor: "pointer", fontSize: 12 }}>Remove</button>
          </div>
        ))}
        {members.length === 0 && <div style={{ fontSize: 13, color: "#555a78", padding: "10px 0" }}>No team members.</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
          <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com"
            style={{ flex: 1, background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "9px 12px", color: "#e8eaf2", fontSize: 13, boxSizing: "border-box", outline: "none" }} />
          <button onClick={() => { if (inviteEmail.trim()) { setMembers(prev => [...prev, inviteEmail.trim()]); setInviteEmail(""); } }}
            style={{ padding: "10px 20px", background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 10, color: "white", fontWeight: 700, cursor: "pointer" }}>+ Invite Member</button>
        </div>
      </Card>
    </div>
  );

  return (
    <div>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#8b91b0", marginBottom: 18 }}>{workspace}</div>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "#555a78", marginBottom: 6 }}>Display name</div>
            <input value={name} onChange={e => { setName(e.target.value); setSaved(false); }}
              style={{ width: "100%", background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#e8eaf2", fontSize: 14, boxSizing: "border-box", outline: "none" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, color: "#e8eaf2" }}>Notifications</div>
              <div style={{ fontSize: 12, color: "#555a78" }}>Email and push alerts</div>
            </div>
            <div onClick={() => { setNotifs(!notifs); setSaved(false); }} style={{ width: 44, height: 24, borderRadius: 12, background: notifs ? "#6c63ff" : "#2a2f47", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 3, left: notifs ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, color: "#e8eaf2" }}>Two-factor authentication</div>
              <div style={{ fontSize: 12, color: "#555a78" }}>TOTP / hardware key</div>
            </div>
            <div onClick={() => { setTwoFA(!twoFA); setSaved(false); }} style={{ width: 44, height: 24, borderRadius: 12, background: twoFA ? "#22d98e" : "#2a2f47", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 3, left: twoFA ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
            </div>
          </div>
          <button onClick={() => setSaved(true)}
            style={{ padding: "12px", background: saved ? "rgba(34,217,142,0.1)" : "linear-gradient(135deg,#2563eb,#7c3aed)", border: saved ? "1px solid rgba(34,217,142,0.3)" : "none", borderRadius: 12, color: saved ? "#22d98e" : "white", fontWeight: 700, cursor: "pointer", fontSize: 14, transition: "all 0.2s" }}>
            {saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>
      </Card>
    </div>
  );
}

// AI App Builder page (with Anthropic API)
function PageBuilder({ user, addToast, showAuthModal, initialPrompt }) {
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");

  const STAGES = [
    { id: 0, label: "Intent Extraction" },
    { id: 1, label: "System Design" },
    { id: 2, label: "Schema Generation" },
    { id: 3, label: "Validation & Repair" },
  ];
  const [doneStages, setDoneStages] = useState([]);

  const generate = async () => {
    if (!user) { showAuthModal(); return; }
    if (!prompt.trim()) { addToast("Enter a prompt first", "error"); return; }
    setLoading(true);
    setOutput(null);
    setDoneStages([]);

    const steps = [
      { label: "Intent Extraction", sys: "You are Stage 1: Intent Extraction. Parse the user's app description into structured JSON with keys: app_name, app_type, core_features, user_roles, complexity. Respond ONLY with valid JSON.", max: 600 },
      { label: "System Design", sys: "You are Stage 2: System Design. Convert intent into architecture JSON with keys: entities, pages, user_flows, auth_strategy. Respond ONLY with valid JSON.", max: 800 },
      { label: "Schema Generation", sys: "You are Stage 3: Schema Generation. Generate ui_schema, api_schema, db_schema, auth_schema as nested JSON. Respond ONLY with valid JSON.", max: 1200 },
      { label: "Validation", sys: "You are Stage 4: Validation. Check consistency and return JSON: { overall_status, score, checks: [{title, severity, description}], execution_ready }. Respond ONLY with valid JSON.", max: 600 },
    ];

    const results = {};
    for (let i = 0; i < steps.length; i++) {
      setStage(steps[i].label);
      try {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: steps[i].max,
            system: steps[i].sys,
            messages: [{ role: "user", content: `App: "${prompt}"\nPrevious stages: ${JSON.stringify(results)}` }]
          })
        });
        const data = await resp.json();
        const text = data.content?.map(b => b.text || "").join("") || "";
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1));
        results[steps[i].label] = parsed;
      } catch (e) {
        results[steps[i].label] = { error: e.message };
      }
      setDoneStages(prev => [...prev, i]);
    }
    setOutput(results);
    setLoading(false);
    setStage("");
    addToast("App schema compiled successfully!", "success");
  };

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#8b91b0", marginBottom: 14 }}>AI Multi-Agent Compiler</div>
        <textarea rows={5} value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Build a SaaS CRM with login, contacts, dashboard, role-based access, and premium plan with payments..."
          style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#e8eaf2", fontSize: 15, resize: "none", lineHeight: 1.7, boxSizing: "border-box" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["CRM", "E-commerce", "LMS", "HR Tool", "Analytics"].map(s => (
              <span key={s} onClick={() => setPrompt(`Build a ${s} platform with authentication, dashboard, and admin panel`)}
                style={{ fontSize: 11, padding: "4px 12px", background: "rgba(108,99,255,0.1)", color: "#9b8aff", borderRadius: 20, cursor: "pointer", border: "1px solid rgba(108,99,255,0.2)" }}>
                {s}
              </span>
            ))}
          </div>
          <button onClick={generate} disabled={loading}
            style={{ padding: "12px 28px", background: loading ? "#2a2f47" : "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 14, color: "white", fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer" }}>
            {loading ? `${stage}...` : "⚡ Generate"}
          </button>
        </div>
      </Card>

      {loading && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#8b91b0", marginBottom: 14 }}>Pipeline progress</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {STAGES.map(s => (
              <div key={s.id} style={{ textAlign: "center", padding: 10, borderRadius: 10, background: doneStages.includes(s.id) ? "rgba(34,217,142,0.08)" : stage === s.label ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${doneStages.includes(s.id) ? "rgba(34,217,142,0.3)" : stage === s.label ? "rgba(108,99,255,0.4)" : "rgba(255,255,255,0.06)"}` }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{doneStages.includes(s.id) ? "✓" : stage === s.label ? "⏳" : "○"}</div>
                <div style={{ fontSize: 11, color: doneStages.includes(s.id) ? "#22d98e" : stage === s.label ? "#9b8aff" : "#555a78" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {output && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#22d98e", marginBottom: 14 }}>Generated Schema</div>
          <pre style={{ whiteSpace: "pre-wrap", color: "#8b91b0", fontSize: 12, fontFamily: "monospace", maxHeight: 400, overflowY: "auto", lineHeight: 1.7 }}>
            {JSON.stringify(output, null, 2)}
          </pre>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(output, null, 2)); addToast("Copied to clipboard!", "success"); }}
              style={{ padding: "9px 18px", background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 10, color: "white", fontWeight: 700, cursor: "pointer" }}>
              Copy JSON
            </button>
            <button onClick={() => setOutput(null)}
              style={{ padding: "9px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#8b91b0", cursor: "pointer" }}>
              Clear
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const menu = {
  Dashboard: {
    Overview: ["AI Usage", "Live Deployment", "Runtime Monitor"],
    Insights: ["Token Analytics", "Realtime Logs"]
  },
  Projects: {
    "Chatbot Apps": ["Customer Support Bot", "Healthcare Assistant", "Finance AI Bot", "Education Tutor AI"],
    SaaS: ["CRM Platform", "AI Invoice Generator", "HR Management AI"]
  },
  Templates: {
    "Frontend Templates": ["AI Landing Page", "Dashboard UI", "Admin Panel"],
    "Backend Templates": ["FastAPI Boilerplate", "Authentication API", "Realtime API"]
  },
  Analytics: {
    Performance: ["System Metrics", "GPU Usage", "AI Requests"],
    Reports: ["Revenue Analytics", "User Activity"]
  },
  Settings: {
    Profile: ["Edit Profile", "Security", "Notifications"],
    Workspace: ["Team Settings", "Billing", "Integrations"]
  }
};

export default function App() {
  const [activeMain, setActiveMain] = useState("Dashboard");
  const [activeSub, setActiveSub] = useState("Overview");
  const [activeWorkspace, setActiveWorkspace] = useState("AI Usage");
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [metrics, setMetrics] = useState(genSystemMetrics());
  const [tokenSeries, setTokenSeries] = useState(genTokenSeries());
  const [logs, setLogs] = useState(() => Array.from({ length: 8 }, genLogLine));
  const [toasts, setToasts] = useState([]);

  // Realtime updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(genSystemMetrics());
      setTokenSeries(prev => [...prev.slice(-19), { t: Date.now(), tokens: rnd(2000, 9000), cost: rndF(0.01, 0.08) }]);
      setLogs(prev => [...prev.slice(-49), genLogLine()]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const [builderPrompt, setBuilderPrompt] = useState("");

  const navigate = (main, sub, ws, prompt) => {
    setActiveMain(main);
    setActiveSub(sub || Object.keys(menu[main] || {})[0] || "Overview");
    setActiveWorkspace(ws);
    if (prompt !== undefined) setBuilderPrompt(prompt);
  };

  const renderPage = () => {
    if (activeWorkspace === "AI Usage") return <PageAIUsage metrics={metrics} tokenSeries={tokenSeries} setTokenSeries={setTokenSeries} addToast={addToast} />;
    if (activeWorkspace === "Live Deployment") return <PageLiveDeployment addToast={addToast} />;
    if (activeWorkspace === "Runtime Monitor") return <PageRuntimeMonitor metrics={metrics} />;
    if (activeWorkspace === "Token Analytics") return <PageTokenAnalytics tokenSeries={tokenSeries} />;
    if (activeWorkspace === "Realtime Logs") return <PageRealtimeLogs logs={logs} />;
    if (activeMain === "Projects") return <PageProjects workspace={activeWorkspace} addToast={addToast} navigate={navigate} />;
    if (activeMain === "Templates") return <PageTemplates workspace={activeWorkspace} addToast={addToast} navigate={navigate} />;
    if (activeMain === "Analytics") return <PageAnalytics workspace={activeWorkspace} metrics={metrics} addToast={addToast} />;
    if (activeMain === "Settings") return <PageSettings workspace={activeWorkspace} user={user} addToast={addToast} />;
    return <PageBuilder user={user} addToast={addToast} showAuthModal={() => setShowAuth(true)} initialPrompt={builderPrompt} />;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#e8eaf2", fontFamily: "Inter, sans-serif", display: "flex" }}>
      <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

      {/* SIDEBAR */}
      <div style={{ width: 280, background: "rgba(15,23,42,0.95)", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "20px 16px", overflowY: "auto", flexShrink: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 28, color: "#e8eaf2" }}>
          ⚡ Forge
        </div>

        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(34,217,142,0.06)", border: "1px solid rgba(34,217,142,0.15)", borderRadius: 10, marginBottom: 20 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22d98e", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: 12, color: "#22d98e" }}>System online · {metrics.requests} req/s</span>
        </div>

        {Object.keys(menu).map(main => (
          <div key={main} style={{ marginBottom: 6 }}>
            <div onClick={() => navigate(main, Object.keys(menu[main])[0], menu[main][Object.keys(menu[main])[0]][0])}
              style={{ padding: "11px 14px", borderRadius: 12, background: activeMain === main ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "transparent", cursor: "pointer", fontWeight: 700, fontSize: 14, color: activeMain === main ? "white" : "#8b91b0", marginBottom: 4, transition: "all 0.15s" }}>
              {main}
            </div>

            {activeMain === main && (
              <div style={{ marginLeft: 10, marginBottom: 8 }}>
                {Object.keys(menu[main]).map(sub => (
                  <div key={sub}>
                    <div onClick={() => navigate(main, sub, menu[main][sub][0])}
                      style={{ padding: "8px 12px", borderRadius: 8, background: activeSub === sub ? "rgba(255,255,255,0.08)" : "transparent", cursor: "pointer", fontWeight: 600, fontSize: 13, color: activeSub === sub ? "#e8eaf2" : "#555a78", marginBottom: 2 }}>
                      {sub}
                    </div>

                    {activeSub === sub && (
                      <div style={{ marginLeft: 12 }}>
                        {menu[main][sub].map(ws => (
                          <div key={ws} onClick={() => setActiveWorkspace(ws)}
                            style={{ padding: "7px 10px", marginBottom: 2, borderRadius: 8, background: activeWorkspace === ws ? "rgba(108,99,255,0.15)" : "transparent", cursor: "pointer", fontSize: 13, color: activeWorkspace === ws ? "#9b8aff" : "#444466", borderLeft: activeWorkspace === ws ? "2px solid #6c63ff" : "2px solid transparent" }}>
                            {ws}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Quick AI Builder shortcut */}
        <div onClick={() => navigate("Dashboard", "Overview", "AI Builder")}
          style={{ marginTop: 16, padding: "11px 14px", borderRadius: 12, background: activeWorkspace === "AI Builder" ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.2)", cursor: "pointer", fontWeight: 700, fontSize: 14, color: "#9b8aff", textAlign: "center" }}>
          ⚡ AI App Builder
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* TOPBAR */}
        <div style={{ padding: "16px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(15,23,42,0.6)" }}>
          <div>
            <div style={{ fontSize: 12, color: "#555a78", fontFamily: "monospace" }}>{activeMain} / {activeSub}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#e8eaf2" }}>{activeWorkspace}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Live metrics bar */}
            <div style={{ display: "flex", gap: 16, fontSize: 12, fontFamily: "monospace", color: "#555a78" }}>
              <span style={{ color: metrics.cpu > 80 ? "#ff5470" : "#555a78" }}>CPU {metrics.cpu}%</span>
              <span style={{ color: metrics.gpu > 85 ? "#f0a500" : "#555a78" }}>GPU {metrics.gpu}%</span>
              <span>RAM {metrics.ram}%</span>
            </div>
            {!user ? (
              <button onClick={() => setShowAuth(true)}
                style={{ padding: "10px 22px", background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 12, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Login
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(108,99,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#9b8aff", fontWeight: 700 }}>
                  {user[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 13, color: "#8b91b0" }}>{user}</span>
                <button onClick={() => { setUser(null); addToast("Logged out", "info"); }}
                  style={{ padding: "7px 14px", background: "rgba(255,84,112,0.1)", border: "1px solid rgba(255,84,112,0.2)", borderRadius: 10, color: "#ff5470", cursor: "pointer", fontSize: 12 }}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
          {activeWorkspace === "AI Builder" ? (
            <PageBuilder user={user} addToast={addToast} showAuthModal={() => setShowAuth(true)} initialPrompt={builderPrompt} />
          ) : renderPage()}
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={u => { setUser(u); addToast(`Welcome, ${u}!`, "success"); }} />}
      <Toast toasts={toasts} />

      <style>{`
        @keyframes pulse {0%,100%{opacity:1}50%{opacity:0.4}}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:10px}
      `}</style>
    </div>
  );
}
