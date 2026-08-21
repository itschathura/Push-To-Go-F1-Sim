from curl_cffi import requests as curl_requests

r = curl_requests.get(
    "https://livetiming.formula1.com/signalr/negotiate",
    params={"clientProtocol": "1.5", "connectionData": '[{"name":"Streaming"}]'},
    impersonate="chrome124"
)
print(r.status_code)
print(r.text[:500])