"""Kiest per persona een Nederlandse Piper-stem (open source) en spreekt teksten uit.

De Nederlandse Piper-stemmen hebben geen label voor man of vrouw. Daarom
meten we de toonhoogte (F0) van elke spreker en kiezen we op basis daarvan:
vrouwenstemmen rond 170-260 Hz, mannenstemmen rond 85-145 Hz. Binnen die groep
bepaalt 'toon' (0 = laag, 1 = hoog) welke spreker een persona krijgt; elke
persona krijgt een andere spreker. Deterministisch: elke run kiest hetzelfde.

    python scripts/video/stemmen.py --map ~/.cache/piper --uit stemkeuze.json
"""
import argparse
import json
import os
import sys
import urllib.request
import wave

HIER = os.path.dirname(os.path.abspath(__file__))
BRON = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/'
PROEFZIN = 'Hallo! Ik leg je in een paar zinnen uit hoe de toeslagen werken en wat je nu kunt doen.'


def haal(url, doel):
    if os.path.exists(doel) and os.path.getsize(doel) > 0:
        return doel
    os.makedirs(os.path.dirname(doel), exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as r, open(doel + '.deel', 'wb') as f:
        f.write(r.read())
    os.replace(doel + '.deel', doel)
    return doel


def nederlandse_stemmen(map_):
    """Alle nl_NL-stemmen (medium of low) uit de officiële lijst, lokaal gedownload."""
    lijst = json.load(open(haal(BRON + 'voices.json', os.path.join(map_, 'voices.json')), encoding='utf-8'))
    stemmen = []
    for sleutel, v in sorted(lijst.items()):
        if v.get('language', {}).get('code') != 'nl_NL' or v.get('quality') not in ('medium', 'low'):
            continue
        bestanden = [f for f in v['files'] if f.endswith('.onnx') or f.endswith('.onnx.json')]
        for f in bestanden:
            haal(BRON + f, os.path.join(map_, os.path.basename(f)))
        stemmen.append({'sleutel': sleutel, 'model': os.path.join(map_, sleutel + '.onnx'), 'sprekers': v.get('num_speakers', 1)})
    if not stemmen:
        sys.exit('Geen Nederlandse Piper-stemmen gevonden')
    return stemmen


_geladen = {}


def laad(model):
    from piper import PiperVoice

    if model not in _geladen:
        _geladen[model] = PiperVoice.load(model)
    return _geladen[model]


def spreek(model, spreker, tekst, uit, tempo=1.0):
    """Tekst → wav. Werkt met piper-tts 1.3 (synthesize_wav) en ouder (synthesize)."""
    stem = laad(model)
    with wave.open(uit, 'wb') as wf:
        try:
            from piper import SynthesisConfig

            stem.synthesize_wav(tekst, wf, syn_config=SynthesisConfig(speaker_id=spreker, length_scale=tempo))
        except ImportError:
            stem.synthesize(tekst, wf, speaker_id=spreker, length_scale=tempo)
    return uit


def toonhoogte(wav):
    import librosa
    import numpy as np

    y, sr = librosa.load(wav, sr=16000)
    f0, stem, _ = librosa.pyin(y, fmin=60, fmax=400, sr=sr)
    f0 = f0[stem & ~np.isnan(f0)]
    return float(np.median(f0)) if len(f0) else 0.0


def kies(metingen, personas):
    """metingen: [{sleutel, model, spreker, f0}] → {persona: stem}. Pure functie (getest)."""
    groepen = {
        'v': sorted([m for m in metingen if 170 <= m['f0'] <= 280], key=lambda m: (m['f0'], m['sleutel'], m['spreker'])),
        'm': sorted([m for m in metingen if 80 <= m['f0'] <= 145], key=lambda m: (m['f0'], m['sleutel'], m['spreker'])),
    }
    bezet, keuze = set(), {}
    # Vaste volgorde, zodat de keuze niet afhangt van welke persona toevallig eerst komt
    for naam, p in sorted(personas.items()):
        groep = groepen[p['stem']['geslacht']] or groepen['v'] + groepen['m']
        if not groep:
            raise SystemExit('Geen bruikbare stemmen gemeten')
        start = round(p['stem']['toon'] * (len(groep) - 1))
        for stap in range(len(groep)):
            # Zoek vanaf de gewenste toon afwisselend omhoog en omlaag naar een vrije spreker
            for i in (start + stap, start - stap):
                if 0 <= i < len(groep) and (groep[i]['sleutel'], groep[i]['spreker']) not in bezet:
                    keuze[naam] = groep[i]
                    bezet.add((groep[i]['sleutel'], groep[i]['spreker']))
                    break
            if naam in keuze:
                break
        else:
            keuze[naam] = groep[start]  # meer persona's dan stemmen: delen
    return keuze


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--map', required=True, help='cachemap voor de stemmodellen')
    ap.add_argument('--uit', required=True, help='json met de stemkeuze per persona')
    ap.add_argument('--tmp', default='/tmp/stemproef')
    a = ap.parse_args()
    personas = json.load(open(os.path.join(HIER, 'personas.json'), encoding='utf-8'))['personas']
    os.makedirs(a.tmp, exist_ok=True)
    metingen = []
    for s in nederlandse_stemmen(a.map):
        for spreker in range(s['sprekers']):
            wav = spreek(s['model'], spreker if s['sprekers'] > 1 else None, PROEFZIN, os.path.join(a.tmp, f"{s['sleutel']}-{spreker}.wav"))
            metingen.append({'sleutel': s['sleutel'], 'model': s['model'], 'spreker': spreker if s['sprekers'] > 1 else None, 'f0': round(toonhoogte(wav), 1)})
    keuze = kies(metingen, personas)
    json.dump(keuze, open(a.uit, 'w', encoding='utf-8'), indent=2)
    for naam, k in keuze.items():
        print(f"{naam}: {k['sleutel']} spreker {k['spreker']} ({k['f0']} Hz)", flush=True)


if __name__ == '__main__':
    main()
