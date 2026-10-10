from PIL import Image, ImageFilter
import numpy as np

def make_transparent(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    
    # In both images, background is white (R, G, B > 240)
    # Let us compute distance from white [255, 255, 255]
    diff = 255.0 - np.minimum(np.minimum(arr[:,:,0], arr[:,:,1]), arr[:,:,2])
    
    # If diff == 0, pure white -> alpha = 0
    # If diff > 30, definitely foreground -> alpha = 255
    # In between, linear ramp
    alpha = np.clip(diff / 25.0 * 255.0, 0, 255).astype(np.uint8)
    
    # However, gold highlights might have high brightness, but gold is yellow (R high, G high, B lower).
    # Only pixels where ALL R, G, B are high is white!
    # In pure white background, R > 245, G > 245, B > 245 and diff_rg < 10, diff_rb < 10
    is_white_bg = (arr[:,:,0] > 235) & (arr[:,:,1] > 235) & (arr[:,:,2] > 235) & (np.abs(arr[:,:,0] - arr[:,:,1]) < 15) & (np.abs(arr[:,:,0] - arr[:,:,2]) < 15)
    
    # Floodfill / connected component from corners to ensure internal white reflections in gold are not erased
    # Or simple flood from borders:
    h, w = arr.shape[:2]
    from collections import deque
    mask = np.zeros((h, w), dtype=bool)
    q = deque()
    for y in range(h):
        for x in [0, w-1]:
            if is_white_bg[y, x]:
                mask[y, x] = True
                q.append((y, x))
    for x in range(w):
        for y in [0, h-1]:
            if is_white_bg[y, x] and not mask[y, x]:
                mask[y, x] = True
                q.append((y, x))
                
    while q:
        cy, cx = q.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w:
                if not mask[ny, nx] and is_white_bg[ny, nx]:
                    mask[ny, nx] = True
                    q.append((ny, nx))
                    
    # Now mask is True for outer white background only!
    # Soften mask borders for smooth anti-aliased edge
    mask_img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))
    mask_arr = np.array(mask_img, dtype=np.float32) / 255.0
    
    final_alpha = np.clip((1.0 - mask_arr) * 255.0, 0, 255).astype(np.uint8)
    arr[:,:,3] = final_alpha
    
    res = Image.fromarray(arr.astype(np.uint8))
    # Crop transparent borders
    bbox = res.getbbox()
    if bbox:
        res = res.crop(bbox)
    res.save(output_path, "PNG")
    print(f"Saved {output_path}, size: {res.size}")

make_transparent("public/bloodstrike/gold-low-raw.jpg", "public/bloodstrike/gold-low.png")
make_transparent("public/bloodstrike/gold-high-raw.jpg", "public/bloodstrike/gold-high.png")
