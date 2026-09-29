"""Objectieve metingen voor de echtheidskeuring van een pratend-hoofdvideo.

- scherpte: variantie van de Laplaciaan in het gezicht (hoger = scherper);
  een wazige, 'geplakte' mond is een van de duidelijkste nep-signalen;
- mondbeweging: gemiddelde beeldverandering rond de mond per frame;
- lipsync: correlatie tussen mondbeweging en de energie van de stem
  (rond 0 = mond beweegt niet mee met de stem; hoger = beter);
- stilstand: aandeel frames waarin het hele beeld vrijwel stilstaat.

    python scripts/video/metingen.py video.mp4 --gewichten .sadtalker/gfpgan/weights
"""
import argparse
import json
import os
import subprocess
import tempfile


def lees_video(pad):
    import cv2

    kap = cv2.VideoCapture(pad)
    fps = kap.get(cv2.CAP_PROP_FPS) or 25
    beelden = []
    while True:
        ok, b = kap.read()
        if not ok:
            break
        beelden.append(b)
    return beelden, fps


def stem_energie(pad, fps, n):
    import librosa
    import numpy as np

    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'a.wav')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', pad, '-ac', '1', '-ar', '16000', wav], check=True)
        y, sr = librosa.load(wav, sr=16000)
    stap = sr / fps
    return np.array([float(np.sqrt(np.mean(y[int(i * stap):int((i + 1) * stap)] ** 2) + 1e-12)) for i in range(n)])


def meet(pad, gewichten):
    import cv2
    import numpy as np
    import torch
    from facexlib.detection import init_detection_model

    beelden, fps = lees_video(pad)
    if len(beelden) < 10:
        return {'fout': 'te weinig beelden'}
    detector = init_detection_model('retinaface_resnet50', half=False, device='cpu', model_rootpath=gewichten)
    midden = beelden[len(beelden) // 2]
    with torch.no_grad():
        vakken = detector.detect_faces(midden, 0.9)
    if not len(vakken):
        return {'fout': 'geen gezicht gevonden'}
    x1, y1, x2, y2 = [int(v) for v in vakken[0][:4]]
    lm = vakken[0][5:15].reshape(5, 2)
    grijs = [cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32) for b in beelden]
    gezicht = grijs[len(grijs) // 2][max(y1, 0):y2, max(x1, 0):x2]
    scherpte = float(cv2.Laplacian(gezicht, cv2.CV_32F).var())
    # Mondvak tussen de mondhoeken, iets ruimer naar boven en onder
    mx1, mx2 = int(min(lm[3][0], lm[4][0])), int(max(lm[3][0], lm[4][0]))
    mb = mx2 - mx1
    my = int((lm[3][1] + lm[4][1]) / 2)
    vak = (slice(max(my - int(0.45 * mb), 0), my + int(0.55 * mb)), slice(max(mx1 - int(0.15 * mb), 0), mx2 + int(0.15 * mb)))
    mond = np.array([0.0] + [float(np.mean(np.abs(grijs[i][vak] - grijs[i - 1][vak]))) for i in range(1, len(grijs))])
    heel = np.array([0.0] + [float(np.mean(np.abs(grijs[i] - grijs[i - 1]))) for i in range(1, len(grijs))])
    energie = stem_energie(pad, fps, len(beelden))
    glad = lambda v: np.convolve(v, np.ones(3) / 3, mode='same')  # noqa: E731
    m, e = glad(mond), glad(energie)
    lipsync = float(np.corrcoef(m, e)[0, 1]) if m.std() > 0 and e.std() > 0 else 0.0
    return {
        'scherpte': round(scherpte, 1),
        'mondbeweging': round(float(mond.mean()), 2),
        'lipsync': round(lipsync, 3),
        'stilstand': round(float((heel < 0.15).mean()), 3),
        'frames': len(beelden),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--gewichten', required=True)
    a = ap.parse_args()
    print(json.dumps(meet(a.video, a.gewichten)))


if __name__ == '__main__':
    main()
