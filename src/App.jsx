import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const CATEGORIES_IN = ["Maintenance", "Parking Fee", "Club Fee", "NOC Fee", "Penalty", "Other Income"];
const CATEGORIES_OUT = ["Security", "Housekeeping", "Electricity", "Water", "Repairs", "Gardener Salary", "Garden Expense", "Admin", "Other Expense"];

const FLATS = ["TH12", "TH13", "TH14", "TH15", "TH16"].flatMap(tower =>
  [101, 102, 201, 202, 301, 302].map(unit => `${tower}-${unit}`)
);

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1.5px solid #e8e6de", fontSize: 13,
  background: "#fafafa", outline: "none", color: "#1a1a2e"
};

const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6
};

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("ledger");
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const isAdmin = new URLSearchParams(window.location.search).get("admin") === "estrella2025";

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "in", category: "Maintenance",
    flat: "", description: "", amount: "", addedBy: "",
  });

  useEffect(() => { loadEntries(); }, []);

  async function loadEntries() {
    setLoading(true);
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error) setEntries(data || []);
    else showToast("Failed to load entries.", "error");
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleFormChange(field, val) {
    setForm(prev => {
      const updated = { ...prev, [field]: val };
      if (field === "type") {
        updated.category = val === "in" ? "Maintenance" : "Security";
        updated.flat = val === "out" ? "" : prev.flat;
      }
      return updated;
    });
  }

  async function handleAddEntry() {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) { showToast("Enter a valid amount.", "error"); return; }
    if (!form.description.trim()) { showToast("Description is required.", "error"); return; }
    if (form.type === "in" && !form.flat) { showToast("Select flat for income entry.", "error"); return; }
    if (!form.addedBy.trim()) { showToast("Enter your name.", "error"); return; }

    setSaving(true);
    const newEntry = {
      id: Date.now().toString(),
      date: form.date,
      type: form.type,
      category: form.category,
      flat: form.flat || "—",
      description: form.description.trim(),
      amount: Number(form.amount),
      added_by: form.addedBy.trim(),
    };

    const { data, error } = await supabase.from("entries").insert([newEntry]).select();
    if (error) {
      showToast("Failed to save. Try again.", "error");
    } else {
      setEntries(prev => [data[0], ...prev]);
      showToast("Entry added successfully!");
      setForm({ date: new Date().toISOString().split("T")[0], type: "in", category: "Maintenance", flat: "", description: "", amount: "", addedBy: form.addedBy });
      setView("ledger");
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (!error) {
      setEntries(prev => prev.filter(e => e.id !== id));
      showToast("Entry deleted.");
    } else {
      showToast("Delete failed.", "error");
    }
  }

  const filtered = entries.filter(e => {
    if (filterType !== "all" && e.type !== filterType) return false;
    if (filterMonth && !e.date.startsWith(filterMonth)) return false;
    if (search && !`${e.description} ${e.flat} ${e.category} ${e.added_by}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalIn = filtered.filter(e => e.type === "in").reduce((s, e) => s + Number(e.amount), 0);
  const totalOut = filtered.filter(e => e.type === "out").reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIn - totalOut;

  const flatSummary = {};
  entries.filter(e => e.type === "in").forEach(e => { flatSummary[e.flat] = (flatSummary[e.flat] || 0) + Number(e.amount); });

  const expenseSummary = {};
  entries.filter(e => e.type === "out").forEach(e => { expenseSummary[e.category] = (expenseSummary[e.category] || 0) + Number(e.amount); });

  const allTotalIn = entries.filter(e => e.type === "in").reduce((s, e) => s + Number(e.amount), 0);
  const allTotalOut = entries.filter(e => e.type === "out").reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#F7F6F2" }}>

      {/* Header */}
      <div style={{ background: "#1a1a2e", color: "#fff", padding: "20px 24px 0" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#8b8fa8", textTransform: "uppercase", marginBottom: 4 }}>Estrella Condominium · Pirangut</div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, margin: 0, fontWeight: 400 }}>Maintenance Ledger</h1>
              <div style={{ fontSize: 12, color: "#8b8fa8", marginTop: 4 }}>Transparent · Shared · Real-time</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              {isAdmin && (
                <>
                  <button onClick={() => setView(view === "add" ? "ledger" : "add")} style={{
                    background: view === "add" ? "#555" : "#e8c547",
                    color: view === "add" ? "#fff" : "#1a1a2e",
                    border: "none", borderRadius: 8, padding: "10px 20px",
                    fontWeight: 600, fontSize: 14, cursor: "pointer"
                  }}>
                    {view === "add" ? "✕ Cancel" : "+ Add Entry"}
                  </button>
                  <span style={{ fontSize: 11, color: "#e8c547", background: "rgba(232,197,71,0.15)", padding: "4px 10px", borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>
                    ● ADMIN
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Nav tabs */}
          <div style={{ display: "flex", marginTop: 20 }}>
            {[["ledger", "📋 Ledger"], ["summary", "📊 Summary"]].map(([v, label]) => (
              <button key={v} onClick={() => setView(v)} style={{
                background: view === v ? "#F7F6F2" : "transparent",
                color: view === v ? "#1a1a2e" : "#8b8fa8",
                border: "none", padding: "10px 22px", fontSize: 13, fontWeight: 600,
                cursor: "pointer", borderRadius: "8px 8px 0 0", transition: "all 0.15s"
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: 20, right: 20, zIndex: 999,
            background: toast.type === "error" ? "#ff4757" : "#2ed573",
            color: "#fff", padding: "12px 20px", borderRadius: 10,
            fontSize: 14, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
          }}>{toast.msg}</div>
        )}

        {/* Balance Cards */}
        {view !== "add" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Income", value: totalIn, color: "#1a7f3c", bg: "#f0fff4", border: "#bbf7d0" },
              { label: "Total Expenses", value: totalOut, color: "#c0392b", bg: "#fff5f5", border: "#fecaca" },
              { label: "Net Balance", value: balance, color: balance >= 0 ? "#1a1a2e" : "#c0392b", bg: "#fff", border: "#e8e6de" },
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: "16px 18px", border: `1px solid ${c.border}` }}>
                <div style={{ fontSize: 11, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{formatINR(c.value)}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{filtered.length} entries shown</div>
              </div>
            ))}
          </div>
        )}

        {/* ADD FORM */}
        {view === "add" && isAdmin && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, border: "1px solid #e8e6de", marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, fontSize: 22, margin: "0 0 24px" }}>New Journal Entry</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Entry Type</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[["in", "💰 Income / Payment Received"], ["out", "💸 Expense / Payment Made"]].map(([v, l]) => (
                    <button key={v} onClick={() => handleFormChange("type", v)} style={{
                      flex: 1, padding: "11px 0", borderRadius: 8, border: "2px solid",
                      borderColor: form.type === v ? (v === "in" ? "#2ed573" : "#ff4757") : "#e8e6de",
                      background: form.type === v ? (v === "in" ? "#f0fff4" : "#fff5f5") : "#fafafa",
                      fontWeight: 600, fontSize: 13, cursor: "pointer",
                      color: form.type === v ? (v === "in" ? "#1a7f3c" : "#c0392b") : "#888",
                    }}>{l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={form.date} onChange={e => handleFormChange("date", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={form.category} onChange={e => handleFormChange("category", e.target.value)} style={inputStyle}>
                  {(form.type === "in" ? CATEGORIES_IN : CATEGORIES_OUT).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {form.type === "in" && (
                <div>
                  <label style={labelStyle}>Flat / Unit</label>
                  <select value={form.flat} onChange={e => handleFormChange("flat", e.target.value)} style={inputStyle}>
                    <option value="">Select Flat</option>
                    {FLATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              )}

              <div style={form.type === "out" ? { gridColumn: "1 / -1" } : {}}>
                <label style={labelStyle}>Amount (₹)</label>
                <input type="number" placeholder="0" value={form.amount} onChange={e => handleFormChange("amount", e.target.value)} style={inputStyle} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Description</label>
                <input type="text" placeholder="e.g. May 2025 maintenance, Security guard salary..." value={form.description} onChange={e => handleFormChange("description", e.target.value)} style={inputStyle} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Added By</label>
                <input type="text" placeholder="Your name" value={form.addedBy} onChange={e => handleFormChange("addedBy", e.target.value)} style={inputStyle} />
              </div>
            </div>

            <button onClick={handleAddEntry} disabled={saving} style={{
              marginTop: 24, background: "#1a1a2e", color: "#e8c547",
              border: "none", borderRadius: 10, padding: "13px 36px",
              fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1
            }}>
              {saving ? "Saving..." : "✓ Save Entry"}
            </button>
          </div>
        )}

        {/* LEDGER VIEW */}
        {view === "ledger" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input type="text" placeholder="🔍 Search description, flat, category..." value={search}
                onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 180 }} />
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 130 }}>
                <option value="all">All Entries</option>
                <option value="in">Income Only</option>
                <option value="out">Expenses Only</option>
              </select>
              <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
              {(filterType !== "all" || filterMonth || search) && (
                <button onClick={() => { setFilterType("all"); setFilterMonth(""); setSearch(""); }}
                  style={{ ...inputStyle, background: "#ffe0e0", color: "#c0392b", cursor: "pointer", border: "1px solid #ffb3b3", fontWeight: 600, minWidth: 80 }}>
                  Clear ✕
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 80, color: "#aaa" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <div>Loading ledger...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 80, color: "#aaa" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontWeight: 500 }}>No entries found</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{isAdmin ? "Use + Add Entry to get started" : "No records yet."}</div>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8e6de", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#1a1a2e", color: "#fff" }}>
                        {["Date", "Type", "Category", "Flat", "Description", "Amount", "Added By", ...(isAdmin ? [""] : [])].map((h, i) => (
                          <th key={i} style={{ padding: "13px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e, i) => (
                        <tr key={e.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafaf8", borderBottom: "1px solid #f0ede5" }}>
                          <td style={{ padding: "11px 14px", color: "#666", whiteSpace: "nowrap" }}>{formatDate(e.date)}</td>
                          <td style={{ padding: "11px 14px" }}>
                            <span style={{
                              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: e.type === "in" ? "#f0fff4" : "#fff5f5",
                              color: e.type === "in" ? "#1a7f3c" : "#c0392b",
                            }}>{e.type === "in" ? "IN" : "OUT"}</span>
                          </td>
                          <td style={{ padding: "11px 14px", color: "#555" }}>{e.category}</td>
                          <td style={{ padding: "11px 14px", color: "#888", fontWeight: e.flat !== "—" ? 600 : 400 }}>{e.flat}</td>
                          <td style={{ padding: "11px 14px" }}>{e.description}</td>
                          <td style={{ padding: "11px 14px", fontWeight: 700, color: e.type === "in" ? "#1a7f3c" : "#c0392b", whiteSpace: "nowrap" }}>
                            {e.type === "in" ? "+" : "−"}{formatINR(e.amount)}
                          </td>
                          <td style={{ padding: "11px 14px", color: "#999", fontSize: 12, whiteSpace: "nowrap" }}>{e.added_by}</td>
                          {isAdmin && (
                            <td style={{ padding: "11px 14px" }}>
                              <button onClick={() => handleDelete(e.id)} style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: "#ddd", fontSize: 16, padding: "2px 6px", borderRadius: 4
                              }} title="Delete">🗑</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* SUMMARY VIEW */}
        {view === "summary" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #e8e6de" }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, fontSize: 19, margin: "0 0 18px" }}>🏠 Flat-wise Payments</h3>
              {Object.keys(flatSummary).length === 0 ? (
                <div style={{ color: "#aaa", fontSize: 13 }}>No income entries yet.</div>
              ) : (
                <div style={{ maxHeight: 420, overflowY: "auto" }}>
                  {FLATS.map(flat => (
                    <div key={flat} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f5f3ee", fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: flatSummary[flat] ? "#1a1a2e" : "#ccc" }}>{flat}</span>
                      <span style={{ color: flatSummary[flat] ? "#1a7f3c" : "#ddd", fontWeight: 700 }}>
                        {flatSummary[flat] ? formatINR(flatSummary[flat]) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #e8e6de" }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, fontSize: 19, margin: "0 0 18px" }}>📌 Expense by Category</h3>
              {Object.keys(expenseSummary).length === 0 ? (
                <div style={{ color: "#aaa", fontSize: 13 }}>No expense entries yet.</div>
              ) : (
                <div>
                  {Object.entries(expenseSummary).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                    const pct = Math.round((amt / allTotalOut) * 100);
                    return (
                      <div key={cat} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                          <span style={{ fontWeight: 500 }}>{cat}</span>
                          <span style={{ color: "#c0392b", fontWeight: 700 }}>{formatINR(amt)} <span style={{ color: "#aaa", fontWeight: 400 }}>({pct}%)</span></span>
                        </div>
                        <div style={{ background: "#f5f3ee", borderRadius: 4, height: 6 }}>
                          <div style={{ width: `${pct}%`, background: "#ff6b7a", borderRadius: 4, height: 6, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ gridColumn: "1 / -1", background: "#1a1a2e", borderRadius: 16, padding: 26, color: "#fff" }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, fontSize: 19, margin: "0 0 20px", color: "#e8c547" }}>
                Overall Society Financial Position
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
                {[
                  { label: "Total Collected", value: allTotalIn, color: "#2ed573" },
                  { label: "Total Spent", value: allTotalOut, color: "#ff6b7a" },
                  { label: "Current Balance", value: allTotalIn - allTotalOut, color: "#e8c547" },
                ].map(c => (
                  <div key={c.label}>
                    <div style={{ fontSize: 11, color: "#8b8fa8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>{c.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: c.color }}>{formatINR(c.value)}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{entries.length} total entries</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 40, fontSize: 12, color: "#ccc" }}>
          Estrella Condominium · Managing Committee · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
