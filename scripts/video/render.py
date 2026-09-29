"""Rendert de clips van één persona: tekst → stem (Piper) → pratend hoofd met
lipsync (SadTalker, Apache 2.0) op het fictieve gezicht. Draait op de CPU.

Het gezicht wordt één keer geanalyseerd (3D-gezichtsmodel); daarna volgt per
clip alleen audio → gezichtsbewegingen → beeld. Uitvoer: <uit>/<segment>.ruw.mp4

    python scripts/video/render.py --opdracht opdracht.json --sadtalker .sadtalker

opdracht.json: {"persona", "gezicht", "stem": {model, spreker}, "uit",
                "verbeteren": bool, "clips": [{"segment", "tekst"}]}
"""
import argparse
import json
import os
import shutil
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from stemmen import spreek  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--opdracht', required=True)
    ap.add_argument('--sadtalker', required=True)
    ap.add_argument('--grootte', type=int, default=256)
    a = ap.parse_args()
    o = json.load(open(a.opdracht, encoding='utf-8'))
    gezicht = os.path.abspath(o['gezicht'])
    uit = os.path.abspath(o['uit'])
    werk = os.path.join(uit, '_werk')
    os.makedirs(werk, exist_ok=True)

    # SadTalker verwacht te draaien vanuit zijn eigen map (gewichten in ./checkpoints en ./gfpgan)
    os.chdir(a.sadtalker)
    sys.path.insert(0, a.sadtalker)
    import torch
    from src.facerender.animate import AnimateFromCoeff
    from src.generate_batch import get_data
    from src.generate_facerender_batch import get_facerender_data
    from src.test_audio2coeff import Audio2Coeff
    from src.utils.init_path import init_path
    from src.utils.preprocess import CropAndExtract

    torch.set_num_threads(os.cpu_count() or 4)
    apparaat = 'cpu'
    paden = init_path('./checkpoints', './src/config', a.grootte, False, 'full')
    voorbewerking = CropAndExtract(paden, apparaat)
    audio_naar_coeff = Audio2Coeff(paden, apparaat)
    animatie = AnimateFromCoeff(paden, apparaat)

    eerste = os.path.join(werk, 'gezicht')
    os.makedirs(eerste, exist_ok=True)
    coeff, crop_pic, crop_info = voorbewerking.generate(gezicht, eerste, 'full', source_image_flag=True, pic_size=a.grootte)
    if coeff is None:
        sys.exit(f'Geen gezicht gevonden in {gezicht}')

    for clip in o['clips']:
        t0 = time.time()
        map_ = os.path.join(werk, clip['segment'])
        os.makedirs(map_, exist_ok=True)
        wav = spreek(o['stem']['model'], o['stem']['spreker'], clip['tekst'], os.path.join(map_, 'stem.wav'), tempo=o['stem'].get('tempo', 1.0))
        batch = get_data(coeff, wav, apparaat, None, still=True)
        coeff_pad = audio_naar_coeff.generate(batch, map_, 0, None)
        data = get_facerender_data(coeff_pad, crop_pic, coeff, wav, 2, None, None, None, expression_scale=1.0, still_mode=True, preprocess='full', size=a.grootte)
        resultaat = animatie.generate(
            data, map_, gezicht, crop_info,
            enhancer='gfpgan' if o.get('verbeteren') else None,
            background_enhancer=None, preprocess='full', img_size=a.grootte,
        )
        doel = os.path.join(uit, f"{clip['segment']}.ruw.mp4")
        shutil.move(resultaat, doel)
        print(json.dumps({'segment': clip['segment'], 'klaar': doel, 'seconden': round(time.time() - t0)}), flush=True)
    shutil.rmtree(werk, ignore_errors=True)


if __name__ == '__main__':
    main()
