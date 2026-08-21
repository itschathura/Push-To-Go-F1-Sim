import sys, os
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


st.set_page_config(
    page_title="Push to Go — F1 Live Dashboard",
    page_icon="🏎️",
    layout="wide"
)

st.markdown("""
<style>
    .stApp { background-color: #0a0e17; }
    [data-testid="stMetricValue"] { color: #00d4ff; font-family: monospace; }
    [data-testid="stMetricLabel"] { color: #7a8699; }
    h1, h2, h3 { color: #e6ecf5 !important; }
    .stButton>button {
        background-color: #131a29;
        color: #00d4ff;
        border: 1px solid #1e2938;
        width: 100%;
        text-align: left;
    }
    .stButton>button:hover {
        border: 1px solid #00d4ff;
        color: #ffffff;
    }
</style>
""", unsafe_allow_html=True)

REFRESH_SECONDS = 2
HISTORY_LIMIT = 40


@st.cache_resource
def get_db_session():
    cluster = Cluster(
        ['127.0.0.1'],
        port=9042,
        connection_class=AsyncioConnection,
        address_translator=DockerLocalTranslator()
    )
    return cluster.connect('f1_live')


def get_sessions(db_session):
    rows = db_session.execute("SELECT session_id FROM live_telemetry")
    sessions = set(r.session_id for r in rows if r.session_id)
    return sorted(sessions)


def get_drivers(db_session):
    rows = db_session.execute("SELECT DISTINCT driver FROM live_telemetry")
    return sorted(set(r.driver for r in rows))


def get_latest_row(db_session, driver):
    query = """
        SELECT driver, timestamp, speed, throttle, brake, rpm,
               estimated_soc, gap_to_ahead, overtake_prediction, session_id
        FROM live_telemetry WHERE driver = %s LIMIT 1
    """
    rows = list(db_session.execute(query, (driver,)))
    return rows[0] if rows else None


def get_driver_history(db_session, driver, limit=HISTORY_LIMIT):
    query = """
        SELECT timestamp, speed, throttle, brake, estimated_soc, gap_to_ahead
        FROM live_telemetry WHERE driver = %s LIMIT %s
    """
    rows = list(db_session.execute(query, (driver, limit)))
    df = pd.DataFrame([{
        "Timestamp": r.timestamp, "Speed": r.speed, "Throttle": r.throttle,
        "Brake": r.brake, "SoC": r.estimated_soc, "Gap": r.gap_to_ahead
    } for r in rows])
    return df.sort_values("Timestamp") if not df.empty else df


def make_gauge(value, title, max_val, unit="", color="#00d4ff"):
    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=value if value is not None else 0,
        title={'text': title, 'font': {'color': '#7a8699', 'size': 14}},
        number={'suffix': f" {unit}", 'font': {'color': '#e6ecf5', 'size': 26}},
        gauge={
            'axis': {'range': [0, max_val], 'tickcolor': '#7a8699'},
            'bar': {'color': color},
            'bgcolor': '#131a29',
            'borderwidth': 1,
            'bordercolor': '#1e2938',
        }
    ))
    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        height=180,
        margin=dict(l=20, r=20, t=40, b=10),
        font={'color': '#e6ecf5'}
    )
    return fig


def make_sparkline(df, col, title, color="#00d4ff"):
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df["Timestamp"], y=df[col], mode='lines',
        line=dict(color=color, width=2), fill='tozeroy',
        fillcolor="rgba(0,212,255,0.1)"
    ))
    fig.update_layout(
        title={'text': title, 'font': {'color': '#7a8699', 'size': 13}},
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        height=180,
        margin=dict(l=10, r=10, t=30, b=10),
        xaxis={'showgrid': False, 'color': '#7a8699'},
        yaxis={'showgrid': True, 'gridcolor': '#1e2938', 'color': '#7a8699'},
    )
    return fig


db_session = get_db_session()

st.title("🏎️ Push to Go — F1 Live Dashboard")

sessions = get_sessions(db_session)
col_a, col_b, col_c = st.columns(3)
with col_a:
    selected_session = st.selectbox("Session", sessions if sessions else ["No data yet"])
with col_b:
    st.text_input("Round", value="R12 - British GP", disabled=True)
with col_c:
    st.text_input("Session Type", value="FP1", disabled=True)

st.divider()

if "selected_driver" not in st.session_state:
    st.session_state.selected_driver = None


# ============================================================
# Auto-refreshing fragment (replaces the old while-loop pattern)
# ============================================================
@st.fragment(run_every=REFRESH_SECONDS)
def live_dashboard():
    drivers = get_drivers(db_session)

    latest_rows = []
    for d in drivers:
        row = get_latest_row(db_session, d)
        if row:
            latest_rows.append(row)

    if not latest_rows:
        st.warning("⚠️ No live data yet. Waiting for telemetry stream...")
        return

    leaderboard_df = pd.DataFrame([{
        "Driver": r.driver, "Speed": r.speed, "SoC": r.estimated_soc,
        "Gap": r.gap_to_ahead, "Pred": r.overtake_prediction
    } for r in latest_rows]).sort_values("Speed", ascending=False).reset_index(drop=True)
    leaderboard_df.index += 1

    col_left, col_right = st.columns([1, 2.2])

    with col_left:
        st.subheader("📋 Live Pace Rank")
        st.caption("Ranked by current speed (not official race position)")

        for rank, row in leaderboard_df.iterrows():
            label = f"#{rank}  {row['Driver']}   {row['Speed']:.0f} km/h"
            if st.button(label, key=f"btn_{row['Driver']}"):
                st.session_state.selected_driver = row['Driver']

    with col_right:
        sel = st.session_state.selected_driver or leaderboard_df.iloc[0]['Driver']
        st.subheader(f"📊 Driver: {sel}")

        latest = next((r for r in latest_rows if r.driver == sel), None)
        hist = get_driver_history(db_session, sel)

        if latest:
            g1, g2, g3, g4 = st.columns(4)
            g1.plotly_chart(make_gauge(latest.speed, "SPEED", 350, "km/h"),
                             use_container_width=True, key=f"g_speed_{sel}")
            g2.plotly_chart(make_gauge(latest.throttle, "THROTTLE", 100, "%", "#00ff88"),
                             use_container_width=True, key=f"g_throttle_{sel}")
            g3.plotly_chart(make_gauge(latest.brake, "BRAKE", 100, "%", "#ff4d4d"),
                             use_container_width=True, key=f"g_brake_{sel}")
            g4.plotly_chart(make_gauge(latest.rpm, "RPM", 12000, "", "#ffaa00"),
                             use_container_width=True, key=f"g_rpm_{sel}")

            pred_label = "🟢 OVERTAKE LIKELY" if latest.overtake_prediction == 1 else "⚪ No overtake predicted"
            st.markdown(f"### {pred_label}")
            st.metric("Gap to Car Ahead", f"{latest.gap_to_ahead:.3f} s")
            st.metric("Estimated Battery SoC", f"{latest.estimated_soc:.1f} %")

        if not hist.empty:
            c1, c2 = st.columns(2)
            c1.plotly_chart(make_sparkline(hist, "Speed", "SPEED TRACE"),
                             use_container_width=True, key=f"sp_speed_{sel}")
            c2.plotly_chart(make_sparkline(hist, "SoC", "SoC TREND", "#00ff88"),
                             use_container_width=True, key=f"sp_soc_{sel}")

    st.divider()

    st.subheader("⚔️ Driver Comparison")
    compare_drivers = st.multiselect(
        "Select drivers to compare", drivers,
        default=drivers[:2] if len(drivers) >= 2 else drivers,
        key="compare_select"
    )

    if compare_drivers:
        fig = go.Figure()
        colors = ["#00d4ff", "#ff4d4d", "#00ff88", "#ffaa00", "#c77dff"]
        for i, d in enumerate(compare_drivers):
            dhist = get_driver_history(db_session, d)
            if not dhist.empty:
                fig.add_trace(go.Scatter(
                    x=dhist["Timestamp"], y=dhist["Speed"], mode='lines',
                    name=d, line=dict(color=colors[i % len(colors)], width=2)
                ))
        fig.update_layout(
            title="Speed Comparison",
            paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
            font={'color': '#e6ecf5'},
            xaxis={'showgrid': False, 'color': '#7a8699'},
            yaxis={'showgrid': True, 'gridcolor': '#1e2938', 'color': '#7a8699'},
            height=350
        )
        st.plotly_chart(fig, use_container_width=True, key="compare_chart")


live_dashboard()