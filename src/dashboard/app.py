import sys, os, json, datetime
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import streamlit as st
import pandas as pd
import plotly.graph_objects as go

from cassandra.cluster import Cluster
from cassandra.io.asyncioreactor import AsyncioConnection
from cassandra.policies import AddressTranslator

class DockerLocalTranslator(AddressTranslator):
    def translate(self, addr):
        return '127.0.0.1'

st.set_page_config(page_title="Push to Go — F1 Live", page_icon="", layout="wide")

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
    .stApp { background: linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%); }
    .block-container { padding: 1rem 1.5rem; max-width: 100%; }
    #MainMenu, footer, header { visibility: hidden; }
    h1 { font-family: 'Inter', sans-serif; font-weight: 900; font-size: 1.4rem !important;
         background: linear-gradient(90deg, #e10600, #ff6b6b); -webkit-background-clip: text;
         -webkit-text-fill-color: transparent; margin-bottom: 0.3rem !important; }
    h2, h3 { font-family: 'Inter', sans-serif; font-size: 0.9rem !important; color: #c9d1d9 !important; }
    p, span, label { font-family: 'Inter', sans-serif; font-size: 11px !important; }
    [data-testid="stMetricValue"] { font-family: 'JetBrains Mono', monospace; color: #58a6ff; font-size: 1rem !important; }
    [data-testid="stMetricLabel"] { color: #8b949e; font-size: 0.65rem !important; text-transform: uppercase; }
    .stButton>button { background: rgba(22,27,34,0.9); color: #58a6ff; border: 1px solid #30363d;
        font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; padding: 0.4rem 0.8rem;
        width: 100%; text-align: left; border-radius: 6px; }
    .stButton>button:hover { border-color: #58a6ff; background: rgba(88,166,255,0.1); }
    hr { border-color: #21262d !important; margin: 0.3rem 0 !important; }
    div[data-testid="column"] { padding: 0 0.25rem !important; }
    .weather-bar { background: rgba(22,27,34,0.8); border: 1px solid #30363d; border-radius: 8px;
        padding: 8px 16px; display: flex; gap: 20px; align-items: center; font-family: 'JetBrains Mono', monospace;
        font-size: 11px; color: #8b949e; margin-bottom: 8px; }
    .weather-bar .val { color: #58a6ff; font-weight: 700; }
    .weather-bar .rain { color: #ff6b6b; font-weight: 700; }
    .flag-msg { background: rgba(22,27,34,0.7); border-left: 3px solid #ffaa00; border-radius: 4px;
        padding: 4px 10px; margin: 3px 0; font-size: 10px !important; color: #c9d1d9;
        font-family: 'JetBrains Mono', monospace; }
    .flag-msg.yellow { border-left-color: #ffaa00; }
    .flag-msg.green { border-left-color: #3fb950; }
    .flag-msg.red { border-left-color: #f85149; }
    .live-dot { display: inline-block; width: 8px; height: 8px; background: #3fb950;
        border-radius: 50%; margin-right: 6px; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
    .sector-val { font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 2px 8px;
        border-radius: 4px; display: inline-block; margin: 1px; }
    .tire-badge { display: inline-block; width: 18px; height: 18px; border-radius: 50%;
        text-align: center; line-height: 18px; font-size: 9px; font-weight: 900; }
    .tire-soft { background: #ff3333; color: white; }
    .tire-medium { background: #ffcc00; color: black; }
    .tire-hard { background: #ffffff; color: black; }
    .tire-inter { background: #39b54a; color: white; }
    .tire-wet { background: #0072ce; color: white; }
</style>
""", unsafe_allow_html=True)

REFRESH = 1.5
TEAM_COLORS = {
    'Mercedes': '#00D7B6', 'McLaren': '#F47600', 'Ferrari': '#ED1131',
    'Red Bull Racing': '#4781D7', 'Alpine': '#00A1E8', 'Audi': '#F50537',
    'Racing Bulls': '#6C98FF', 'Haas F1 Team': '#9C9FA2',
    'Aston Martin': '#229971', 'Williams': '#1868DB', 'Cadillac': '#909090'
}
DRIVER_TEAM = {
    'RUS': 'Mercedes', 'ANT': 'Mercedes', 'NOR': 'McLaren', 'PIA': 'McLaren',
    'LEC': 'Ferrari', 'HAM': 'Ferrari', 'VER': 'Red Bull Racing', 'LAW': 'Red Bull Racing',
    'GAS': 'Alpine', 'COL': 'Alpine', 'BOR': 'Audi', 'HUL': 'Audi',
    'TSU': 'Racing Bulls', 'LIN': 'Racing Bulls', 'BEA': 'Haas F1 Team', 'OCO': 'Haas F1 Team',
    'STR': 'Aston Martin', 'ALO': 'Aston Martin', 'ALB': 'Williams', 'SAI': 'Williams',
    'BOT': 'Cadillac', 'PER': 'Cadillac'
}

@st.cache_resource
def get_db():
    try:
        cluster = Cluster(['127.0.0.1'], port=9042, connection_class=AsyncioConnection,
                          address_translator=DockerLocalTranslator())
        return cluster.connect('f1_live')
    except Exception as e:
        return None

def read_state():
    try:
        with open(os.path.join(os.path.dirname(__file__), "..", "..", "live_state.json"), "r") as f:
            return json.load(f)
    except:
        return None

def get_team_color(driver):
    team = DRIVER_TEAM.get(driver, '')
    return TEAM_COLORS.get(team, '#8b949e')

def tire_badge(compound):
    if not compound: return ""
    c = compound.upper()
    cls = {"SOFT": "tire-soft", "MEDIUM": "tire-medium", "HARD": "tire-hard",
           "INTERMEDIATE": "tire-inter", "WET": "tire-wet"}.get(c, "")
    letter = c[0] if c else "?"
    return f'<span class="tire-badge {cls}">{letter}</span>'

def make_gauge(value, title, max_val, unit="", color="#58a6ff"):
    fig = go.Figure(go.Indicator(mode="gauge+number", value=value or 0,
        title={'text': title, 'font': {'color': '#8b949e', 'size': 10}},
        number={'suffix': f" {unit}", 'font': {'color': '#c9d1d9', 'size': 14}},
        gauge={'axis': {'range': [0, max_val], 'tickcolor': '#30363d', 'tickfont': {'size': 7}},
               'bar': {'color': color}, 'bgcolor': '#161b22',
               'borderwidth': 1, 'bordercolor': '#30363d'}))
    fig.update_layout(paper_bgcolor='rgba(0,0,0,0)', height=200,
        margin=dict(l=8, r=8, t=22, b=2), font={'color': '#c9d1d9'})
    return fig

db = get_db()
st.title("🏎️ PUSH TO GO — F1 LIVE TIMING")

@st.fragment(run_every=REFRESH)
def dashboard():
    now = datetime.datetime.now().strftime("%H:%M:%S")
    state = read_state()

    # ── Weather Bar ──
    if state and state.get("weather"):
        w = state["weather"]
        rain_icon = "🌧️ YES" if w.get("rain") == "1" else "☀️ No"
        rain_cls = "rain" if w.get("rain") == "1" else "val"
        st.markdown(f'''<div class="weather-bar">
            <span><span class="live-dot"></span>LIVE</span>
            <span>🌡️ Track <span class="val">{w.get("track_temp","?")}°C</span></span>
            <span>🌡️ Air <span class="val">{w.get("air_temp","?")}°C</span></span>
            <span>💧 Humidity <span class="val">{w.get("humidity","?")}%</span></span>
            <span>💨 Wind <span class="val">{w.get("wind_speed","?")} km/h</span></span>
            <span>🌧️ Rain <span class="{rain_cls}">{rain_icon}</span></span>
            <span style="margin-left:auto;color:#484f58">UI: {now}</span>
        </div>''', unsafe_allow_html=True)
    else:
        st.markdown(f'<div class="weather-bar"><span class="live-dot"></span>LIVE | Waiting for data... | {now}</div>', unsafe_allow_html=True)

    col_left, col_right = st.columns([1.2, 2])

    # ── TIMING TOWER ──
    with col_left:
        st.markdown("### 📊 LIVE TIMING")

        if state and state.get("positions"):
            # Build sorted driver list
            drivers_sorted = []
            for dc, pos in state["positions"].items():
                drivers_sorted.append({
                    "pos": pos, "driver": dc,
                    "best_lap": state.get("best_laps", {}).get(dc, ""),
                    "gap": state.get("gaps_to_leader", {}).get(dc, ""),
                    "gap_ahead": state.get("gaps_to_ahead", {}).get(dc, ""),
                    "tire": state.get("tires", {}).get(dc, {}).get("compound", ""),
                    "laps": state.get("num_laps", {}).get(dc, 0),
                    "last_lap": state.get("last_laps", {}).get(dc, ""),
                })
            drivers_sorted.sort(key=lambda x: (int(x["pos"]) if str(x["pos"]).isdigit() else 99))

            for d in drivers_sorted:
                tc = get_team_color(d["driver"])
                gap_display = d["gap"] if d["gap"] else ""
                if d["pos"] == 1 or not gap_display:
                    gap_display = d["best_lap"] if d["best_lap"] else "—"

                tire_html = tire_badge(d["tire"])
                laps_str = f'L{d["laps"]}' if d["laps"] else ""

                if st.button(
                    f'P{d["pos"]:>2}  {d["driver"]}  {gap_display:>12}  {laps_str}',
                    key=f'tb_{d["driver"]}'
                ):
                    st.session_state.sel_driver = d["driver"]
        else:
            # Fallback: read from Cassandra
            try:
                rows = list(db.execute("SELECT DISTINCT driver FROM live_telemetry"))
                drivers = sorted([r.driver for r in rows if r.driver])
            except:
                drivers = []
            if not drivers:
                st.info("Waiting for data...")
                return
            for d in drivers:
                if st.button(d, key=f'tb_{d}'):
                    st.session_state.sel_driver = d

        # ── Race Control Messages ──
        if state and state.get("flags"):
            st.markdown("### 🏁 RACE CONTROL")
            for msg in reversed(state["flags"][-8:]):
                flag = msg.get("flag", "")
                cls = "green" if "CLEAR" in flag else ("red" if "RED" in flag else "yellow")
                t = msg.get("time", "")[-8:] if msg.get("time") else ""
                st.markdown(f'<div class="flag-msg {cls}">{t} {msg.get("message","")}</div>', unsafe_allow_html=True)

    # ── DRIVER DETAIL ──
    with col_right:
        sel = st.session_state.get("sel_driver", "")
        if not sel and state and state.get("positions"):
            # Pick P1
            for dc, pos in state["positions"].items():
                if pos == 1:
                    sel = dc
                    break
        if not sel:
            sel = "NOR"

        # ── FLAG INDICATOR ──
        latest_flag = ""
        if state and state.get("flags") and len(state["flags"]) > 0:
            latest_flag = state["flags"][-1].get("flag", "").upper()
            if "RED" in latest_flag:
                st.error("🔴 RED FLAG - SESSION SUSPENDED")
            elif "YELLOW" in latest_flag:
                st.warning(f"🟡 {latest_flag}")
            elif "GREEN" in latest_flag or "CLEAR" in latest_flag:
                st.success("🟢 GREEN FLAG - RACING")
            elif "CHEQUERED" in latest_flag:
                st.info("🏁 CHEQUERED FLAG")

        tc = get_team_color(sel)
        team_name = DRIVER_TEAM.get(sel, "")
        full_name = ""
        if state and state.get("driver_meta", {}).get(sel):
            full_name = state["driver_meta"][sel].get("full_name", "")

        # Calculate Ahead and Behind
        pos_str = ""
        driver_ahead = None
        driver_behind = None
        
        if state and state.get("positions"):
            ds = [{"driver": dc, "pos": int(p) if str(p).isdigit() else 99} for dc, p in state["positions"].items()]
            ds.sort(key=lambda x: x["pos"])
            for i, d in enumerate(ds):
                if d["driver"] == sel:
                    pos_str = f"P{d['pos']}"
                    if i > 0:
                        driver_ahead = ds[i-1]["driver"]
                    if i < len(ds) - 1:
                        driver_behind = ds[i+1]["driver"]
                    break

        st.markdown(f'### <span style="color:{tc}">■</span> {pos_str} {sel} — {full_name} <span style="color:#484f58;font-size:0.7em">{team_name}</span>', unsafe_allow_html=True)

        # Gauges
        try:
            row = list(db.execute("SELECT speed, throttle, brake, rpm, estimated_soc, gap_to_ahead, overtake_prediction FROM live_telemetry WHERE driver = %s LIMIT 1", (sel,)))
            r = row[0] if row else None
        except:
            r = None

        if r:
            g1, g2, g3, g4 = st.columns(4)
            g1.plotly_chart(make_gauge(r.speed, "SPEED", 350, "km/h"), use_container_width=True)
            g2.plotly_chart(make_gauge(r.throttle, "THROTTLE", 100, "%", "#3fb950"), use_container_width=True)
            g3.plotly_chart(make_gauge(r.brake, "BRAKE", 100, "%", "#f85149"), use_container_width=True)
            g4.plotly_chart(make_gauge(r.rpm, "RPM", 15000, "", "#d29922"), use_container_width=True)

            m1, m2, m3, m4 = st.columns(4)
            pred = "🔥 OVERTAKE LIKELY" if r.overtake_prediction == 1 else "⚪ No overtake"
            vs_ahead = f" vs {driver_ahead}" if driver_ahead else ""
            
            m1.metric(f"Prediction{vs_ahead}", pred)
            m2.metric(f"Gap to {driver_ahead}" if driver_ahead else "Gap Ahead", f"{r.gap_to_ahead:.3f}s" if r.gap_to_ahead else "N/A")
            m3.metric("Driver Behind", driver_behind if driver_behind else "None")
            m4.metric("SoC", f"{r.estimated_soc:.1f}%" if r.estimated_soc else "N/A")

        # Sectors & Speeds from state
        if state:
            s1, s2 = st.columns(2)
            with s1:
                st.markdown("**Sector Times**")
                sectors = state.get("sectors", {}).get(sel, {})
                if sectors:
                    html = ""
                    for idx in sorted(sectors.keys()):
                        html += f'<span class="sector-val" style="background:#21262d;color:#58a6ff">S{int(idx)+1}: {sectors[idx]}</span> '
                    st.markdown(html, unsafe_allow_html=True)
                else:
                    st.caption("No sector data yet")

            with s2:
                st.markdown("**Speed Traps**")
                spds = state.get("speeds", {}).get(sel, {})
                if spds:
                    html = ""
                    labels = {"I1": "Int1", "I2": "Int2", "ST": "Trap", "FL": "F/L"}
                    for k in ("I1", "I2", "ST", "FL"):
                        if k in spds:
                            html += f'<span class="sector-val" style="background:#21262d;color:#3fb950">{labels.get(k,k)}: {spds[k]}</span> '
                    st.markdown(html, unsafe_allow_html=True)
                else:
                    st.caption("No speed data yet")

            # Best & Last lap
            bl = state.get("best_laps", {}).get(sel, "")
            ll = state.get("last_laps", {}).get(sel, "")
            nl = state.get("num_laps", {}).get(sel, "")
            tire = state.get("tires", {}).get(sel, {})
            tire_str = f'{tire.get("compound","?")} ({"New" if tire.get("new") else "Used"}, {tire.get("laps",0)} laps)' if tire else "?"

            t1, t2, t3, t4 = st.columns(4)
            t1.metric("Best Lap", bl or "—")
            t2.metric("Last Lap", ll or "—")
            t3.metric("Laps Done", nl or "—")
            t4.metric("Tire", tire_str)

        # Speed history from Cassandra
        try:
            hist = list(db.execute("SELECT timestamp, speed, throttle, brake FROM live_telemetry WHERE driver = %s LIMIT 30", (sel,)))
            if hist:
                df = pd.DataFrame([{"ts": r.timestamp, "Speed": r.speed, "Throttle": r.throttle, "Brake": r.brake} for r in hist]).sort_values("ts")
                fig = go.Figure()
                fig.add_trace(go.Scatter(x=df["ts"], y=df["Speed"], mode='lines', name='Speed',
                    line=dict(color='#58a6ff', width=2), fill='tozeroy', fillcolor='rgba(88,166,255,0.08)'))
                fig.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
                    height=140, margin=dict(l=5,r=5,t=5,b=5),
                    xaxis={'showgrid': False, 'color': '#484f58', 'tickfont': {'size': 7}},
                    yaxis={'showgrid': True, 'gridcolor': '#21262d', 'color': '#484f58', 'tickfont': {'size': 7}},
                    font={'color': '#c9d1d9', 'size': 9})
                st.plotly_chart(fig, use_container_width=True)
        except:
            pass

    # ── Speed Comparison ──
    if state and state.get("speeds"):
        st.markdown("### 🏁 SPEED TRAP COMPARISON")
        spd_data = []
        for dc, spds in state["speeds"].items():
            st_val = spds.get("ST", "")
            if st_val:
                try:
                    spd_data.append({"Driver": dc, "Speed Trap (km/h)": float(st_val), "Team": DRIVER_TEAM.get(dc, "")})
                except: pass
        if spd_data:
            sdf = pd.DataFrame(spd_data).sort_values("Speed Trap (km/h)", ascending=True)
            fig = go.Figure(go.Bar(
                y=sdf["Driver"], x=sdf["Speed Trap (km/h)"],
                orientation='h', marker_color=[get_team_color(d) for d in sdf["Driver"]],
                text=sdf["Speed Trap (km/h)"].apply(lambda x: f"{x:.0f}"), textposition='outside'))
            fig.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
                height=max(len(spd_data) * 22, 200), margin=dict(l=5,r=40,t=5,b=5),
                xaxis={'showgrid': True, 'gridcolor': '#21262d', 'color': '#484f58'},
                yaxis={'color': '#c9d1d9'}, font={'color': '#c9d1d9', 'size': 9})
            st.plotly_chart(fig, use_container_width=True)

dashboard()

