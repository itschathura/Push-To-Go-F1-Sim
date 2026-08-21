from livef1.adapters import RealF1Client

client = RealF1Client(
    topics=["CarData.z", "Position.z"],
    log_file_name="race_data.json"
)

@client.callback("telemetry_handler")
async def handle_data(records):
    for record in records:
        print(record)

client.run()