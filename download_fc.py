
import urllib.request
import os

headers = {"User-Agent": "Mozilla/5.0"}

urls = {
    "fc-high-raw.webp": "https://cdn1.codashop.com/images/1811_219b1202-df20-4fe8-bfcb-d2689d381d31_224713e22083a9e37572a9991d934d42_category/1761196983467_70a7f5cd-12a0-401c-8105-786d2bfb9a16.webp",
    "fc-mid-raw.jpg": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSS5B1_AezObjpY-sWBVBGTKehjihyRWqEg5uUnKoqgMw&s=10",
    "fc-520-raw.jpg": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTp_O0J_qHTYwPY0-WoN_A_BFRw06pTHjCUfoHD7Wap-w&s=10",
    "fc-100-raw.jpg": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRY8hZekSCTwFmWZkdaP8HJ4Yd2fDFE0A6umyTC4az9MQ&s=10",
}

for name, url in urls.items():
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as r:
            path = os.path.join("public/fcmobile", name)
            with open(path, "wb") as f:
                f.write(r.read())
            print(f"Downloaded {name}, size: {os.path.getsize(path)}")
    except Exception as e:
        print(f"Error downloading {name}: {e}")

