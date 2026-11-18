#!/usr/bin/env python3
"""Placeholder UI SFX pack (synthesised, soft 'iOS-like' interface sounds).
Replace files with studio SFX of the same names: tap, pop, type, whoosh, swoosh, coins, riser, success, hit, tear.
usage: python3 make_sfx.py out_dir"""
import numpy as np, wave, sys, os
from scipy.signal import butter, sosfilt
SR = 48000
rnd = np.random.default_rng(3)
out = sys.argv[1] if len(sys.argv) > 1 else 'sfx'; os.makedirs(out, exist_ok=True)
def t(d): return np.arange(int(SR*d))/SR
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def env(n, a, d): e = np.exp(-np.arange(n)/SR/d); k = max(1, int(SR*a)); e[:k] *= np.linspace(0, 1, k); return e
def fade(x, ms=4): k = int(SR*ms/1000); x[-k:] *= np.linspace(1, 0, k); return x
def save(name, x, peak=0.7):
    x = fade(np.asarray(x, float)); x = x/(np.abs(x).max()+1e-9)*peak
    with wave.open(os.path.join(out, name+'.wav'), 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1)*32767).astype(np.int16).tobytes())

# tap — soft glassy click: very short band-passed transient + tiny low body (no pitch sweep)
T = t(0.06); n = len(T)
click = bp(rnd.normal(size=n), 2500, 7000)*env(n, .0003, .0025)
body = np.sin(2*np.pi*190*T)*env(n, .001, .012)*.5
save('tap', click*.9 + body, .45)
# pop — gentle "bloop": short sine with a small upward glide, rounded attack, warm
T = t(0.12); n = len(T); f = 520 + 160*(1-np.exp(-T/0.02))
ph = 2*np.pi*np.cumsum(f)/SR
x = (np.sin(ph) + .18*np.sin(2*ph))*env(n, .004, .035)
save('pop', lp(x, 3500), .38)
# type — key tick
T = t(0.03); n = len(T); save('type', bp(rnd.normal(size=n), 3000, 8000)*env(n, .0002, .003), .25)
# whoosh — airy band-passed noise swell
T = t(0.5); n = len(T); sh = np.sin(np.pi*T/T[-1])**2
x = np.zeros(n); seg = 2048
for i in range(0, n, seg):
    fc = 500 + 2200*(i/n); x[i:i+seg] = bp(rnd.normal(size=min(seg, n-i)+0), fc*.6, fc*1.6)[:min(seg, n-i)]
save('whoosh', lp(x*sh, 6000), .35)
T = t(0.26); n = len(T); sh = np.sin(np.pi*T/T[-1])**2
save('swoosh', bp(rnd.normal(size=n), 1200, 6000)*sh, .22)
# coins — light chimes
T = t(1.0); x = np.zeros(len(T))
for i in range(18):
    s = int(rnd.uniform(0, .75)*SR); tt = t(.18); fr = rnd.uniform(2600, 4600)
    seg = (np.sin(2*np.pi*fr*tt) + .35*np.sin(2*np.pi*fr*2.41*tt))*env(len(tt), .001, .05)*rnd.uniform(.3, 1)
    x[s:s+len(seg)] += seg[:len(x)-s]
save('coins', x, .35)
# riser — soft tonal swell
T = t(0.7); f = 400 + 500*(T/T[-1]); save('riser', np.sin(2*np.pi*np.cumsum(f)/SR)*(T/T[-1])**2*env(len(T), .0, 10), .2)
# success — two soft marimba-ish notes
T = t(0.6); x = np.zeros(len(T))
for fr, d in [(880, 0), (1318.5, .09)]:
    k = int(d*SR); tt = T[:len(T)-k]
    x[k:] += (np.sin(2*np.pi*fr*tt) + .25*np.sin(2*np.pi*fr*4*tt))*env(len(tt), .002, .12)
save('success', x, .35)
# hit — soft low thud
T = t(0.35); f = 70 + 60*np.exp(-T/0.03); save('hit', lp(np.sin(2*np.pi*np.cumsum(f)/SR)*env(len(T), .002, .09), 800), .5)
# tear — short paper rip: crackle of tiny filtered impulses over a noisy bed, ~0.22 s
T = t(0.24); n = len(T); x = np.zeros(n)
grains = np.sort(rnd.uniform(0, .19, 70))
for g in grains:
    s = int(g*SR); L = int(SR*.004); gg = rnd.normal(size=L)*np.exp(-np.arange(L)/SR/.0008)*rnd.uniform(.4, 1)
    x[s:s+L] += gg[:n-s]
bed = rnd.normal(size=n)*np.clip(np.sin(np.pi*np.clip(T/.2, 0, 1)), 0, 1)*.25
x = hp(bp(x + bed, 1500, 9000), 900)
save('tear', x*env(n, .002, .12), .5)
print('sfx →', out, sorted(os.listdir(out)))
