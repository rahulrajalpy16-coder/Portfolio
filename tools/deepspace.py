import numpy as np, sys
from PIL import Image, ImageFilter

N = 1600
rs = np.random.default_rng(7)
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32) / N

def fbm(seed, beta=3.2, n=N):
    r = np.random.default_rng(seed)
    f = np.fft.fftfreq(n)
    k = np.sqrt(f[:, None] ** 2 + f[None, :] ** 2)
    k[0, 0] = 1
    amp = k ** (-beta / 2)
    amp[0, 0] = 0
    ph = np.exp(2j * np.pi * r.random((n, n)))
    z = np.real(np.fft.ifft2(amp * ph))
    z = (z - z.mean()) / z.std()
    return z.astype(np.float32)

def warp(img, dx, dy, s):
    ix = np.clip((xx + dx * s) * (N - 1), 0, N - 1).astype(np.int32)
    iy = np.clip((yy + dy * s) * (N - 1), 0, N - 1).astype(np.int32)
    return img[iy, ix]

def norm(a, lo, hi):
    return np.clip((a - lo) / (hi - lo), 0, 1)

# domain-warped turbulence for filamentary gas
w1, w2 = fbm(1, 3.0), fbm(2, 3.0)
gasA = warp(fbm(3, 2.6), w1, w2, .05)
gasB = warp(fbm(4, 2.4), w2, -w1, .07)
gasC = warp(fbm(5, 2.9), -w1, w2, .04)
dust = warp(fbm(6, 2.2), w1, w2, .03)
fine = warp(fbm(8, 1.9), w2, w1, .02)

# a diagonal glowing lane of gas, curved like a cosmic river, plus a bright star-forming heart
cx, cy = .5, .5
d = (yy - cy) - .35 * np.sin((xx - cx) * 3.2) - (xx - cx) * .25
band = np.exp(-(d / .23) ** 2)
r = np.sqrt((xx - .56) ** 2 + (yy - .46) ** 2)
heart = np.exp(-(r / .13) ** 2)
vign = np.clip(1.15 - np.sqrt((xx - .5) ** 2 + (yy - .5) ** 2) * 1.3, 0, 1)

img = np.zeros((N, N, 3), np.float32)
img += np.array([.010, .012, .030])  # deep blue-black base

def add(mask, col, k):
    global img
    img += mask[..., None] * np.array(col, np.float32) * k

teal = norm(gasA, -.3, 2.2) ** 1.6 * (band * .9 + .12) * vign
mag = norm(gasB, -.1, 2.4) ** 1.7 * (band * .8 + heart * .6 + .08) * vign
amber = norm(gasC, .2, 2.6) ** 2.0 * (heart * 1.4 + band * .35) * vign
blue = norm(fbm(9, 3.4), -.5, 2.5) ** 2 * .5 * vign
add(blue, (.10, .18, .55), .55)
add(teal, (.08, .75, .85), .75)
add(mag, (.85, .18, .65), .8)
add(amber, (1.0, .55, .18), .95)
add(heart * norm(fine, -1, 2) , (1.0, .80, .60), .55)
# fine wisps that read as glowing filaments
fil = np.exp(-np.abs(fine) * 6) * (band * .7 + .1) * vign
add(fil, (.55, .70, 1.0), .35)

# dark dust: lanes that cut through the light
dl = norm(dust, .3, 1.6) ** 1.3 * (band * .9 + .2)
lanes = np.exp(-np.abs(warp(fbm(10, 2.7), w1, w2, .04)) * 3.5) * band * .8
absorb = np.clip(dl * .85 + lanes * .55, 0, .93)
img *= (1 - absorb)[..., None]
# rim light on dust edges (bright where dust thins next to the heart)
edge = np.clip(dl * (1 - dl) * 4, 0, 1) * (heart * 1.2 + band * .25)
add(edge, (1.0, .62, .35), .25)

# soft bloom of the gas
im = Image.fromarray((np.clip(img, 0, 1) ** (1 / 1.15) * 255).astype(np.uint8))
bloom = np.asarray(im.filter(ImageFilter.GaussianBlur(28)), np.float32) / 255
img = img + bloom * .35

# stars: many faint, clustered toward the band, a few big ones with halos and spikes
stars = np.zeros((N, N), np.float32)
tint = np.zeros((N, N, 3), np.float32)
dens = (band * .7 + heart * 1.5 + .25).ravel()
dens /= dens.sum()
def star_colour(t):
    if t < .15: return (1.0, .78, .55)
    if t < .45: return (.75, .85, 1.0)
    return (1.0, 1.0, 1.0)
cnt = 9000
idx = rs.choice(N * N, cnt, p=dens)
for i in idx:
    y, x = divmod(int(i), N)
    b = rs.random() ** 3.5 * .9 + .08
    c = star_colour(rs.random())
    tint[y, x] += np.array(c) * b
    if b > .45 and 0 < x < N - 1 and 0 < y < N - 1:
        for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
            tint[y + dy, x + dx] += np.array(c) * b * .35
# uniform background stars
for _ in range(5000):
    x, y = rs.integers(0, N, 2)
    tint[y, x] += np.array(star_colour(rs.random())) * (rs.random() ** 4 * .7 + .05)
st = Image.fromarray((np.clip(tint, 0, 1) * 255).astype(np.uint8))
glow = np.asarray(st.filter(ImageFilter.GaussianBlur(2.2)), np.float32) / 255
img += tint + glow * 1.6

# hero stars with halos and four point diffraction spikes
def big_star(x, y, size, col):
    global img
    rr = np.sqrt((xx * N - x) ** 2 + (yy * N - y) ** 2)
    halo = np.exp(-(rr / (size * 1.0)) ** 2) * 1.6 + np.exp(-rr / (size * 6)) * .35
    ax = np.abs(xx * N - x); ay = np.abs(yy * N - y)
    spike = (np.exp(-ay / 1.2) * np.exp(-ax / (size * 7)) + np.exp(-ax / 1.2) * np.exp(-ay / (size * 7))) * .9
    img += (halo + spike)[..., None] * np.array(col, np.float32)

big_star(.56 * N, .46 * N, 9, (1.0, .9, .78))
big_star(.31 * N, .62 * N, 5, (.75, .85, 1.0))
big_star(.74 * N, .30 * N, 4.5, (1.0, .82, .6))
big_star(.42 * N, .33 * N, 3.5, (.8, .9, 1.0))
big_star(.66 * N, .68 * N, 3.8, (1.0, 1.0, 1.0))

# a small distant spiral galaxy, tilted, in the dark upper left
gx, gy = .24 * N, .26 * N
ang = .6
X = (xx * N - gx); Y = (yy * N - gy)
Xr = X * np.cos(ang) + Y * np.sin(ang); Yr = (-X * np.sin(ang) + Y * np.cos(ang)) / .42
R = np.sqrt(Xr ** 2 + Yr ** 2) + 1e-3
th = np.arctan2(Yr, Xr)
arms = (np.cos(2 * th - np.log(R) * 3.2) * .5 + .5) ** 3
gal = (np.exp(-R / 40) * arms * 1.0 + np.exp(-(R / 10) ** 2) * 1.6) * (R < 200)
img += gal[..., None] * np.array([.9, .85, 1.0], np.float32) * .7

# tone map, gentle contrast, deep blacks
img = 1 - np.exp(-img * 1.7)
img = np.clip(img, 0, 1) ** 1.05
out = Image.fromarray((img * 255).astype(np.uint8))
out.save(sys.argv[1], 'WEBP', quality=86, method=6)
out.resize((480, 480)).save(sys.argv[2], 'PNG')
print('ok')
