import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import streamlit as st
import pandas as pd
import time

from cassandra.cluster import Cluster
from cassandra.io.asyncioreactor import AsyncioConnection
from cassandra.policies import AddressTranslator


class DockerLocalTranslator(AddressTranslator):
    def translate(self, addr):
        return '127.0.0.1'


st.set_page_config(
    page_title="F1 Live Overtake & SoC Dashboard",
    page_icon="🏎️",
    layout="wide"
)

REFRESH_INTERVAL = 2


@st.cache_resource
def get_db_session():
    cluster = Cluster(
        ['127.0.0.1'],
        port=9042,
        connection_class=AsyncioConnection,
        address_translator=DockerLocalTranslator()
    )
    session = cluster.connect('f1_live')
    return session


def fetch_latest_telemetry(session, limit_per_driver=1):
    all_drivers_query = "SELECT DISTINCT driver FROM live_telemetry"
    driver_rows = session.execute(all_drivers_query)
    drivers = [row.driver for row in driver_rows]

    query = """
        SELECT driver, timestamp, speed, throttle, brake, rpm,
               estimated_soc, gap_to_ahead, overtake_prediction, session_id
        FROM live_telemetry
        WHERE driver = %s
        LIMIT %s
    """

    records = []
    for drv in drivers:
        rows = session.execute(query, (drv, limit_per_driver))
        for row in rows:
            records.append({
                "Driver": row.driver,
                "Speed (km/h)": row.speed,
                "Throttle (%)": row.throttle,
                "Brake (%)": row.brake,
                "RPM": row.rpm,
                "SoC (%)": row.estimated_soc,
                "Gap to Ahead (s)": row.gap_to_ahead,
                "Overtake Prediction": "🟢 Yes" if row.overtake_prediction == 1 else "⚪ No",
                "Session": row.session_id,
                "Timestamp": row.timestamp
            })
    return pd.DataFrame(records)


st.title("🏎️ Push to Go — F1 Live Overtake & SoC Dashboard")
st.caption("Real-time telemetry, battery SoC estimation, and overtake prediction")

placeholder = st.empty()
session = get_db_session()

while True:
    df = fetch_latest_telemetry(session)

    with placeholder.container():
        if df.empty:
            st.warning("⚠️ No live data yet. Waiting for telemetry stream...")
        else:
            col1, col2, col3 = st.columns(3)
            col1.metric("Active Drivers", len(df))
            col2.metric("Avg SoC", f"{df['SoC (%)'].mean():.1f}%")
            col3.metric("Overtakes Predicted", (df['Overtake Prediction'] == "🟢 Yes").sum())

            st.divider()

            st.subheader("📊 Live Driver Telemetry")
            st.dataframe(
                df.sort_values("SoC (%)", ascending=False),
                use_container_width=True,
                hide_index=True
            )

            st.divider()

            chart_col1, chart_col2 = st.columns(2)
            with chart_col1:
                st.subheader("🔋 Battery SoC by Driver")
                st.bar_chart(df.set_index("Driver")["SoC (%)"])

            with chart_col2:
                st.subheader("📏 Gap to Car Ahead")
                st.bar_chart(df.set_index("Driver")["Gap to Ahead (s)"])

    time.sleep(REFRESH_INTERVAL)