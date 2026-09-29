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


# Afkortingen letter voor letter (zoals een Nederlander ze uitspreekt)
AFKORTINGEN = {'AOW': 'A O W', 'SVB': 'S V B', 'UWV': 'U W V', 'DUO': 'D U O', 'DigiD': 'Digi D', 'zzp': 'zet zet pee', 'zzp\'er': 'zet zet pee-er'}
EENHEDEN = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf',
            'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien']
TIENTALLEN = ['', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig']


def getal_als_woord(n):
    """Nederlandse telwoorden tot 9999 (genoeg voor leeftijden en bedragen in de teksten)."""
    if n < 20:
        return EENHEDEN[n]
    if n < 100:
        t, e = divmod(n, 10)
        if not e:
            return TIENTALLEN[t]
        koppel = 'ën' if EENHEDEN[e].endswith('e') else 'en'
        return f'{EENHEDEN[e]}{koppel}{TIENTALLEN[t]}'
    if n < 1000:
        h, r = divmod(n, 100)
        return ('honderd' if h == 1 else f'{EENHEDEN[h]}honderd') + (getal_als_woord(r) if r else '')
    if n < 10000:
        d, r = divmod(n, 1000)
        return ('duizend' if d == 1 else f'{getal_als_woord(d)}duizend') + (f' {getal_als_woord(r)}' if r else '')
    return str(n)


def uitspraak(tekst):
    import re

    for kort, lang in AFKORTINGEN.items():
        tekst = re.sub(rf'\b{re.escape(kort)}\b', lang, tekst)
    tekst = re.sub(r'\b\d{1,4}\b', lambda m: getal_als_woord(int(m.group())), tekst)
    return tekst


def verwachte_duur(tekst):
    """Ruwe schatting: ± 14 tekens per seconde in rustig Nederlands."""
    return len(tekst) / 14


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
        tekst = uitspraak(clip['tekst'])
        os.makedirs(os.path.dirname(os.path.abspath(clip['uit'])), exist_ok=True)
        # Chatterbox kapt soms te vroeg af of hapert: dan opnieuw (andere seed), beste MOS houden
        beste = None
        for poging in range(3):
            torch.manual_seed(7 + poging)
            wav = model.generate(
                tekst, language_id='nl', audio_prompt_path=clip['referentie'],
                exaggeration=clip.get('expressie', a.expressie), cfg_weight=clip.get('cfg', a.cfg),
            )
            duur = wav.shape[-1] / model.sr
            kort = duur < verwachte_duur(tekst) * 0.7
            tijdelijk = f"{clip['uit']}.{poging}.wav"
            torchaudio.save(tijdelijk, wav, model.sr)
            score = mos(beoordelaar, tijdelijk) or 0
            print(json.dumps({'poging': poging + 1, 'duur': round(duur, 1), 'te_kort': kort, 'mos': score}), flush=True)
            if not kort and (beste is None or score > beste[1]):
                beste = (tijdelijk, score)
            if not kort and score >= 3.8:
                break
        if beste is None:
            sys.exit(f"Geen volledige uitspraak voor: {clip['tekst']}")
        os.replace(beste[0], clip['uit'])
        for poging in range(3):
            if os.path.exists(f"{clip['uit']}.{poging}.wav"):
                os.remove(f"{clip['uit']}.{poging}.wav")
        score = {'mos': beste[1], 'mos_referentie': mos(beoordelaar, clip['referentie']), 'uitgesproken': tekst}
        json.dump(score, open(clip['uit'] + '.json', 'w'))
        print(json.dumps({'uit': clip['uit'], **score}), flush=True)


if __name__ == '__main__':
    main()
