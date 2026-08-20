# import pandas as pd

# df = pd.read_csv("data/processed/f1_2026_training_layer1.csv")

# print("Estimated_SoC stats:")
# print(df["Estimated_SoC"].describe())
# print()
# print("% of rows stuck at SoC=0:", (df["Estimated_SoC"] == 0.0).mean() * 100, "%")
# print("% of rows at SoC=100:", (df["Estimated_SoC"] == 100.0).mean() * 100, "%")


# import pandas as pd
# df = pd.read_csv("data/raw/f1_2026_R1_R_raw_telemetry.csv")
# print("DRS unique values:", df["DRS"].unique())
# print("DRS value counts:")
# print(df["DRS"].value_counts())

# import fastf1
# import matplotlib.pyplot as plt
# import pandas as pd

# # 1. Session එක Load කරගන්න
# session = fastf1.get_session(2023, 'Monaco', 'R')
# session.load()

# # 2. Verstappen ගේ වේගවත්ම ලැප් එකේ ටෙලිමට්‍රි ලබාගන්න
# lap = session.laps.pick_drivers('VER').pick_fastest()
# telemetry = lap.get_telemetry()

# # 3. ට්‍රැක් සිතියම ඇඳීම (X සහ Y ඛණ්ඩාංක භාවිතයෙන්)
# fig, ax = plt.subplots(figsize=(10, 10))
# ax.plot(
#     telemetry['X'], telemetry['Y'], color='red', linewidth=2, label='Track Path'
# )

# # 4. සෑම තත්පර 10කටම වතාවක් දත්ත තෝරාගැනීම
# telemetry['Seconds'] = telemetry['SessionTime'].dt.total_seconds()
# start_time = telemetry['Seconds'].iloc[0]

# time_intervals = range(
#     int(start_time), int(telemetry['Seconds'].iloc[-1]), 10
# )
# sampled_data = []

# for t in time_intervals:
#   closest_row = telemetry.iloc[(telemetry['Seconds'] - t).abs().argsort()[:1]]
#   sampled_data.append(closest_row)

# sampled_df = pd.concat(sampled_data)

# # 5. කළු තිත් ලකුණු කර, එක් එක් ලක්ෂ්‍යය අසල X සහ Y අගයන් ප්‍රස්ථාරයේ ලිවීම
# print('--- Every 10s X, Y Coordinates ---')
# for index, row in sampled_df.iterrows():
#   x_val = row['X']
#   y_val = row['Y']
#   time_sec = row['Seconds']

#   # කොන්සෝල් එකට Print කිරීම
#   print(f"Time: {time_sec}s -> X: {x_val:.2f}, Y: {y_val:.2f}")

#   # ප්‍රස්ථාරය මත අදාළ X, Y අගයන් පෙන්වීම (Text)
#   ax.text(
#       x_val,
#       y_val,
#       f'({x_val:.0f}, {y_val:.0f})',
#       fontsize=8,
#       color='blue',
#       ha='right',
#   )

# # කළු තිත් (Black points) මඟින් ස්ථාන සලකුණු කිරීම
# ax.scatter(
#     sampled_df['X'],
#     sampled_df['Y'],
#     color='black',
#     s=50,
#     zorder=5,
#     label='Every 10s Position',
# )

# # ප්‍රස්ථාරය සකස් කිරීම
# ax.set_title(
#     'Max Verstappen - Track Positions & X,Y Coordinates (Every 10s)',
#     fontsize=14,
#     pad=10,
# )
# ax.set_xlabel('X Coordinate (Meters)')
# ax.set_ylabel('Y Coordinate (Meters)')
# ax.legend()
# plt.gca().set_aspect('equal', adjustable='box')
# plt.show()


# inspect_livef1_topics.py
import livef1

session = livef1.get_session(
    season=2026,
    meeting_identifier="Hungarian",
    session_identifier="Race"
)

for topic in ["CarData.z", "Position.z", "TimingData"]:
    try:
        data = session.get_data(dataNames=topic)
        print(f"\n===== {topic} =====")
        print(data.columns.tolist())
        print(data.head(3))
    except Exception as e:
        print(f"{topic} failed: {e}")  #im tired