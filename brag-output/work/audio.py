"""Soundtrack for the UET Attendance demo: one piece in A major, ~100 BPM, SFX tuned to the key."""
import json, wave, pathlib
import numpy as np

HERE = pathlib.Path(__file__).parent
C = json.load(open(HERE / 'cues.json'))
T = C['T']
SR = 44100
DUR = T['end']
N = int(SR * DUR) + SR
rng = np.random.default_rng(7)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(d): return np.arange(int(d * SR)) / SR

def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * g, len(x))

music = np.zeros((N, 2)); sfx = np.zeros((N, 2))
def add(buf, start, sig, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N or i + len(sig) <= 0: return
    sig = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(sig), 0] += sig * gain * l * 1.414
    buf[i:i + len(sig), 1] += sig * gain * r * 1.414

# ---------- instruments ----------
def pad_note(m, d, att=.6, rel=.9):
    t = tt(d + rel)
    s = sum(np.sin(2 * np.pi * hz(m) * (1 + det) * t + ph) for det, ph in [(-.003, 0), (.0, 1.3), (.004, 2.1)])
    s += .35 * np.sin(2 * np.pi * hz(m) * 2.001 * t)
    env = np.minimum(1, t / att) * np.where(t > d, np.exp(-(t - d) / (rel / 3)), 1)
    return s * env / 3

def pluck(m, d=.9):
    t = tt(d)
    s = np.sin(2 * np.pi * hz(m) * t) + .3 * np.sin(2 * np.pi * hz(m) * 2 * t) * np.exp(-t * 18) + .12 * np.sin(2 * np.pi * hz(m) * 3 * t) * np.exp(-t * 30)
    return s * np.exp(-t * 6.5) * np.minimum(1, t / .004)

def bell(m, d=2.2):
    t = tt(d)
    s = np.sin(2 * np.pi * hz(m) * t) + .4 * np.sin(2 * np.pi * hz(m) * 2.76 * t) * np.exp(-t * 5) + .2 * np.sin(2 * np.pi * hz(m) * 5.4 * t) * np.exp(-t * 9)
    return s * np.exp(-t * 2.6) * np.minimum(1, t / .003)

def kick():
    t = tt(.35); f = 48 + 70 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

def hat():
    t = tt(.06); n = rng.standard_normal(len(t))
    n = np.diff(n, prepend=0)
    return n * np.exp(-t * 70) * .5

def click(m):
    t = tt(.08)
    return (.6 * np.sin(2 * np.pi * hz(m) * t) * np.exp(-t * 60) + .25 * rng.standard_normal(len(t)) * np.exp(-t * 220))

def swell(d=.7):
    n = fft_filter(rng.standard_normal(int(d * SR)), lo=300, hi=2500)
    t = tt(d); env = np.sin(np.pi * np.minimum(1, t / d)) ** 2
    return n / (np.abs(n).max() + 1e-9) * env

# ---------- harmony: A  F#m  D  E  (bar = 4 beats @ 100 bpm) ----------
BEAT = 0.6; BAR = 4 * BEAT
CHORDS = [[57, 61, 64], [54, 57, 61], [50, 54, 57], [52, 56, 59]]
ARP = [[69, 73, 76, 81], [66, 69, 73, 78], [62, 66, 69, 74], [64, 68, 71, 76]]

# pad through the whole piece (louder on dark brand cards)
b = 0
while b * BAR < DUR:
    ch = CHORDS[b % 4]; st = b * BAR
    for m in ch: add(music, st, pad_note(m, BAR, att=.5 if b else 1.2), .09)
    add(music, st, pad_note(ch[0] - 12, BAR), .08)
    b += 1

# plucked arpeggio from the intro on, drops out under the outro chord
s = T['s2']; k = 0
while s < T['s7'] - .05:
    bar = int(s // BAR) % 4
    m = ARP[bar][[0, 1, 2, 1, 3, 2, 1, 2][k % 8]]
    add(music, s, pluck(m), .10 if k % 2 == 0 else .07, pan=-.25 if k % 2 else .25)
    s += BEAT / 2; k += 1

# light drums for the tour
s = T['s3']
while s < T['s7'] - .05:
    beat_i = round((s - T['s3']) / BEAT)
    if beat_i % 2 == 0: add(music, s, kick(), .32)
    add(music, s + BEAT / 2, hat(), .05, pan=.3)
    s += BEAT

# outro: A major resolve
for i, m in enumerate([69, 73, 76, 81]): add(music, T['s7'] + .15 + i * .09, bell(m, 3.5), .09, pan=(i - 1.5) * .2)
for m in [45, 57, 61, 64]: add(music, T['s7'], pad_note(m, 3.4, att=.4, rel=1.5), .10)

# ---------- SFX (all in A major pentatonic) ----------
PENTA = [69, 71, 73, 76, 78, 81, 83, 85, 88]
for i, tt_ in enumerate(C['tiles']):                       # hook tiles land
    add(sfx, tt_ - .05, pluck(PENTA[i], .8), .16, pan=-.5 + i * .2)
add(sfx, C['tilesGreen'], bell(81, 2.5), .10)              # tiles turn green
for m in [57, 61, 64, 69]: add(sfx, C['tilesGreen'], pad_note(m, 1.6, att=.05, rel=1.0), .06)
for c in C['clicks']: add(sfx, c, click(81), .16)          # cursor clicks
for c in C['taps']: add(sfx, c, click(76), .14)            # phone taps
for c in C['numKeys'] + C['codeKeys']: add(sfx, c, click(88) * .5, .07, pan=.15)
add(sfx, C['rowIn'], pluck(85, .6), .12); add(sfx, C['rowIn'] + .09, pluck(88, .6), .10)
for i, m in enumerate([69, 73, 76, 81]): add(sfx, C['success'] + i * .07, bell(m, 2.0), .11)
for i, p in enumerate(C['pops']):                          # live check-ins
    g = .12 * (1 - i / 26)
    add(sfx, p, pluck(PENTA[i % 6 + 2], .5), g, pan=.35 if i % 2 else -.35)
for sc in C['scenes']: add(sfx, sc - .45, swell(.8), .035)

# ---------- mix ----------
def reverb(x, secs=2.0, mix=.22):
    L = int(secs * SR); t = np.arange(L) / SR
    out = np.zeros_like(x)
    for ch in range(2):
        ir = rng.standard_normal(L) * np.exp(-t * 3.2); ir = fft_filter(ir, hi=5000); ir /= np.sqrt((ir ** 2).sum())
        n = len(x) + L
        wet = np.fft.irfft(np.fft.rfft(x[:, ch], n) * np.fft.rfft(ir, n), n)[:len(x)]
        out[:, ch] = x[:, ch] * (1 - mix) + wet * mix * 1.6
    return out

for ch in range(2):
    music[:, ch] = fft_filter(music[:, ch], lo=30, hi=9000)
    sfx[:, ch] = fft_filter(sfx[:, ch], lo=120, hi=7000)
mix = reverb(music + sfx * .85)
mix = mix[: int(DUR * SR)]
t = np.arange(len(mix)) / SR
mix *= np.minimum(1, t / .08)[:, None] * np.clip((DUR - t) / 1.0, 0, 1)[:, None] ** 1.5
mix = np.tanh(mix / np.abs(mix).max() * 1.15) / np.tanh(1.15) * 10 ** (-1.5 / 20)

with wave.open(str(HERE / 'soundtrack.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', len(mix) / SR, 's')
