"""Maakt een fotorealistisch, fictief gezicht per persona (Stable Diffusion 1.5,
Realistic Vision; licentie CreativeML OpenRAIL-M) en houdt alleen een foto
waarop precies één gezicht recht in de camera kijkt. Draait op de CPU.

    python scripts/video/gezichten.py --persona henk --uit public/video/gezichten \
        --gewichten .sadtalker/gfpgan/weights

Schrijft <persona>.jpg (512x768) en <persona>.json (model, seed, prompt).
"""
import argparse
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
# Eerst het fotorealistische model; lukt dat niet, dan het basismodel (beide OpenRAIL-M)
MODELLEN = [
    ('SG161222/Realistic_Vision_V5.1_noVAE', 'stabilityai/sd-vae-ft-mse'),
    ('stable-diffusion-v1-5/stable-diffusion-v1-5', None),
]


def laad_pipeline():
    import torch
    from diffusers import AutoencoderKL, DPMSolverMultistepScheduler, StableDiffusionPipeline

    fouten = []
    for model, vae_id in MODELLEN:
        try:
            extra = {'vae': AutoencoderKL.from_pretrained(vae_id, torch_dtype=torch.float32)} if vae_id else {}
            pipe = StableDiffusionPipeline.from_pretrained(
                model, torch_dtype=torch.float32, safety_checker=None, requires_safety_checker=False, **extra
            )
            pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True)
            pipe.set_progress_bar_config(disable=True)
            return pipe, model
        except Exception as e:  # volgende model proberen
            fouten.append(f'{model}: {e}')
    sys.exit('Geen beeldmodel te laden:\n' + '\n'.join(fouten))


def recht_gezicht(detector, beeld):
    """Precies één gezicht, groot genoeg, gecentreerd en recht naar voren."""
    import cv2
    import numpy as np
    import torch

    bgr = cv2.cvtColor(np.array(beeld), cv2.COLOR_RGB2BGR)
    with torch.no_grad():
        vakken = detector.detect_faces(bgr, 0.97)
    if len(vakken) != 1:
        return False, f'{len(vakken)} gezichten'
    x1, y1, x2, y2 = vakken[0][:4]
    lm = vakken[0][5:15].reshape(5, 2)  # ogen, neus, mondhoeken
    breedte, hoogte = beeld.size
    b = (x2 - x1) / breedte
    if not 0.22 <= b <= 0.6:
        return False, f'gezicht {b:.0%} van de breedte'
    if abs((x1 + x2) / 2 - breedte / 2) > 0.12 * breedte or y1 < 0.05 * hoogte or y2 > 0.8 * hoogte:
        return False, 'gezicht niet goed in beeld'
    ogen = abs(lm[1][0] - lm[0][0])
    if ogen < 0.1 * (x2 - x1) or abs(lm[2][0] - (lm[0][0] + lm[1][0]) / 2) > 0.12 * ogen:
        return False, 'kijkt niet recht in de camera'
    return True, 'ok'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--persona', required=True)
    ap.add_argument('--uit', required=True)
    ap.add_argument('--gewichten', required=True, help='map met detection_Resnet50_Final.pth (facexlib)')
    ap.add_argument('--pogingen', type=int, default=4)
    ap.add_argument('--stappen', type=int, default=30)
    a = ap.parse_args()

    import torch
    from facexlib.detection import init_detection_model

    cfg = json.load(open(os.path.join(HIER, 'personas.json'), encoding='utf-8'))
    p = cfg['personas'][a.persona]
    prompt = f"{p['beschrijving']}, {cfg['algemeen']['prompt']}"
    torch.set_num_threads(os.cpu_count() or 4)
    pipe, model = laad_pipeline()
    detector = init_detection_model('retinaface_resnet50', half=False, device='cpu', model_rootpath=a.gewichten)
    os.makedirs(a.uit, exist_ok=True)
    for i in range(a.pogingen):
        seed = p['seed'] + i
        beeld = pipe(
            prompt,
            negative_prompt=cfg['algemeen']['negatief'],
            width=512,
            height=768,
            num_inference_steps=a.stappen,
            guidance_scale=6.0,
            generator=torch.Generator('cpu').manual_seed(seed),
        ).images[0]
        ok, reden = recht_gezicht(detector, beeld)
        print(json.dumps({'persona': a.persona, 'seed': seed, 'ok': ok, 'reden': reden}), flush=True)
        if ok:
            beeld.save(os.path.join(a.uit, f'{a.persona}.jpg'), quality=92)
            meta = {'persona': a.persona, 'model': model, 'seed': seed, 'prompt': prompt, 'licentie': 'CreativeML OpenRAIL-M', 'fictief': True}
            json.dump(meta, open(os.path.join(a.uit, f'{a.persona}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
            return
    sys.exit(f'Geen bruikbaar gezicht voor {a.persona} na {a.pogingen} pogingen')


if __name__ == '__main__':
    main()
