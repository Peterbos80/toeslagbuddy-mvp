"""Maakt per persona een referentiefragment met de gekozen Piper-stem (voor
Chatterbox) en, ter vergelijking, de tekst zelf in Piper.

    python scripts/video/stem_referentie.py --persona henk --tekst "..." \
        --map ~/.cache/piper --keuze stemkeuze.json --uit uit/stem
"""
import argparse
import json
import os
import subprocess
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from stemmen import spreek  # noqa: E402

# Neutrale, gevarieerde zin van ± 10 seconden: genoeg klank voor het overnemen van de stem
REFERENTIE = (
    'Goedemorgen. Vandaag is het een rustige dag, dus ik heb even de tijd om alles op een rijtje te zetten. '
    'Eerst koffie, dan de post, en daarna bel ik mijn zus.'
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--persona', required=True)
    ap.add_argument('--tekst', required=True)
    ap.add_argument('--map', required=True)
    ap.add_argument('--keuze', required=True)
    ap.add_argument('--uit', required=True)
    a = ap.parse_args()
    if not os.path.exists(a.keuze):
        subprocess.run([sys.executable, os.path.join(HIER, 'stemmen.py'), '--map', a.map, '--uit', a.keuze], check=True)
    stem = json.load(open(a.keuze, encoding='utf-8'))[a.persona]
    os.makedirs(a.uit, exist_ok=True)
    spreek(stem['model'], stem['spreker'], REFERENTIE, os.path.join(a.uit, 'referentie.wav'))
    spreek(stem['model'], stem['spreker'], a.tekst, os.path.join(a.uit, 'piper.wav'))
    json.dump(stem, open(os.path.join(a.uit, 'stem.json'), 'w'), indent=2)
    print(json.dumps(stem))


if __name__ == '__main__':
    main()
