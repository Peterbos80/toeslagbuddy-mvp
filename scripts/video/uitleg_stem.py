"""Voice-over voor de uitlegvideo's met een open-source Nederlandse Piper-stem.

    python scripts/video/uitleg_stem.py --teksten teksten.json --map ~/.cache/piper --uit stem/

teksten.json: {"<video>-<scene>": "tekst", ...} (gemaakt door uitleg.js --teksten).
Schrijft <uit>/<video>-<scene>.wav en <uit>/stem.json met de gekozen stem.
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stemmen import BRON, haal, spreek  # noqa: E402

REFERENTIE = 'Goedemiddag. Ik leg je rustig uit hoe het werkt. Je beantwoordt een paar vragen, en daarna zie je meteen wat je kunt doen, en vóór wanneer.'

# Eerste die bestaat wint. Rustige, duidelijke Nederlandse stemmen.
VOORKEUR = ['nl_NL-ronnie-medium', 'nl_NL-pim-medium', 'nl_NL-mls-medium', 'nl_BE-nathalie-medium']


def kies_stem(map_):
    lijst = json.load(open(haal(BRON + 'voices.json', os.path.join(map_, 'voices.json')), encoding='utf-8'))
    for sleutel in VOORKEUR:
        v = lijst.get(sleutel)
        if not v:
            continue
        for f in v['files']:
            if f.endswith('.onnx') or f.endswith('.onnx.json'):
                haal(BRON + f, os.path.join(map_, os.path.basename(f)))
        return sleutel, os.path.join(map_, sleutel + '.onnx'), (0 if v.get('num_speakers', 1) > 1 else None)
    sys.exit('Geen Nederlandse stem gevonden')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--teksten', required=True)
    ap.add_argument('--map', required=True)
    ap.add_argument('--uit', required=True)
    ap.add_argument('--tempo', type=float, default=1.05, help='length_scale: >1 is langzamer')
    a = ap.parse_args()
    teksten = json.load(open(a.teksten, encoding='utf-8'))
    os.makedirs(a.uit, exist_ok=True)
    sleutel, model, spreker = kies_stem(a.map)
    for naam, tekst in teksten.items():
        spreek(model, spreker, tekst, os.path.join(a.uit, naam + '.wav'), tempo=a.tempo)
        print('✓', naam, flush=True)
    # Referentie voor Chatterbox (natuurlijke stem): ± 10 seconden rustige tekst
    spreek(model, spreker, REFERENTIE, os.path.join(a.uit, 'referentie.wav'), tempo=a.tempo)
    json.dump({'stem': sleutel, 'spreker': spreker}, open(os.path.join(a.uit, 'stem.json'), 'w'))


if __name__ == '__main__':
    main()
