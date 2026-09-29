"""Natuurlijke Nederlandse stem met Chatterbox Multilingual (Resemble AI, MIT).

Chatterbox neemt de klankkleur over van een kort referentiefragment. Als
referentie gebruiken we de Piper-stem die bij de persona hoort (Piper-stemmen
zijn getraind op vrijgegeven voorleesopnames, MLS: CC BY 4.0); Chatterbox
maakt er vloeiende, menselijke intonatie van. Chatterbox zet ook een
onhoorbaar watermerk in de audio (AI-markering).

Draait in een eigen omgeving (andere torch-versie dan SadTalker):

    python scripts/video/stem_natuurlijk.py --opdracht stemmen.json

stemmen.json: [{"tekst", "referentie": "ref.wav", "uit": "clip.wav"}]
Schrijft per clip ook een naturelijkheidsscore (UTMOS, 1-5) naar <uit>.json.
"""
import argparse
import json
import os
import sys


def cpu_laden():
    """Checkpoints die op een GPU zijn opgeslagen, op de CPU laden."""
    import torch

    oud = torch.load

    def laden(*args, **kwargs):
        kwargs.setdefault('map_location', 'cpu')
        return oud(*args, **kwargs)

    torch.load = laden


def mos_model():
    """UTMOS22 (MIT): voorspelt hoe natuurlijk spraak klinkt, 1 (robot) tot 5 (mens)."""
    import torch

    try:
        return torch.hub.load('tarepan/SpeechMOS:v1.2.0', 'utmos22_strong', trust_repo=True)
    except Exception as e:  # meten is nuttig, maar mag het maken niet blokkeren
        print(f'UTMOS niet beschikbaar: {e}', file=sys.stderr)
        return None


def mos(model, pad):
    if model is None:
        return None
    import librosa
    import torch

    y, sr = librosa.load(pad, sr=16000)
    with torch.no_grad():
        return round(float(model(torch.from_numpy(y).unsqueeze(0), 16000)), 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--opdracht', required=True)
    ap.add_argument('--expressie', type=float, default=0.45, help='0.25-1.0: hoe levendig')
    ap.add_argument('--cfg', type=float, default=0.4, help='lager = rustiger tempo')
    a = ap.parse_args()
    cpu_laden()
    import torch
    import torchaudio
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    torch.set_num_threads(os.cpu_count() or 4)
    torch.manual_seed(7)
    model = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
    beoordelaar = mos_model()
    for clip in json.load(open(a.opdracht, encoding='utf-8')):
        wav = model.generate(
            clip['tekst'], language_id='nl', audio_prompt_path=clip['referentie'],
            exaggeration=clip.get('expressie', a.expressie), cfg_weight=clip.get('cfg', a.cfg),
        )
        os.makedirs(os.path.dirname(os.path.abspath(clip['uit'])), exist_ok=True)
        torchaudio.save(clip['uit'], wav, model.sr)
        score = {'mos': mos(beoordelaar, clip['uit']), 'mos_referentie': mos(beoordelaar, clip['referentie'])}
        json.dump(score, open(clip['uit'] + '.json', 'w'))
        print(json.dumps({'uit': clip['uit'], **score}), flush=True)


if __name__ == '__main__':
    main()
