CREATE KEYSPACE IF NOT EXISTS f1_live WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': '1'};

CREATE TABLE IF NOT EXISTS f1_live.live_telemetry (
    driver text,
    timestamp timestamp,
    speed float,
    throttle float,
    brake float,
    rpm int,
    drs int,
    estimated_soc float,
    gap_to_ahead float,
    distance_to_ahead float,
    overtake_prediction int,
    session_id text,
    PRIMARY KEY (driver, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);
