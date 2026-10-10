import urllib.request
import os

os.makedirs("public/bloodstrike", exist_ok=True)

headers = {"User-Agent": "Mozilla/5.0"}

url_low = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQVhGuXsvEL5pDjArRxtpD9_aOB44rbDNpXhAWuZGpJ3g&s=10"
req = urllib.request.Request(url_low, headers=headers)
with urllib.request.urlopen(req, timeout=10) as r:
    with open("public/bloodstrike/gold-low-raw.jpg", "wb") as f:
        f.write(r.read())
print("Downloaded gold-low-raw.jpg, size:", os.path.getsize("public/bloodstrike/gold-low-raw.jpg"))

url_high = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaQexDs58vfRTASqkVEP-ZnsY32bI2Et9fy-gEOe1oQQ&s"
req2 = urllib.request.Request(url_high, headers=headers)
with urllib.request.urlopen(req2, timeout=10) as r:
    with open("public/bloodstrike/gold-high-raw.jpg", "wb") as f:
        f.write(r.read())
print("Downloaded gold-high-raw.jpg, size:", os.path.getsize("public/bloodstrike/gold-high-raw.jpg"))
