# Draait op Kaggle (gratis GPU). Maakt filmische AI-beelden met het
# open-source model Wan 2.1 (1.3B, Apache-2.0) via diffusers.
# Deze file wordt door scripts/video/kaggle-beelden.js gevuld met de prompts
# (regel WENSEN) en met `kaggle kernels push` gestart; de MP4's komen in
# /kaggle/working en haalt GitHub Actions daarna op.
import json
import os
import subprocess
import sys
import time
import traceback

START = time.time()
MAX_SECONDEN = 10.5 * 3600  # Kaggle stopt na 12 uur; ruim op tijd klaar zijn
UIT = '/kaggle/working'
WENSEN = json.loads(r'''__WENSEN__''')
NEGATIEF = r'''__NEGATIEF__'''
MODEL = 'Wan-AI/Wan2.1-T2V-1.3B-Diffusers'
log = {'model': MODEL, 'klaar': [], 'mislukt': {}}


def schrijf_log():
    with open(os.path.join(UIT, 'log.json'), 'w') as f:
        json.dump(log, f, indent=1)


subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '-U', 'diffusers>=0.33', 'transformers', 'accelerate', 'ftfy', 'imageio', 'imageio-ffmpeg'], check=True)

import numpy as np  # noqa: E402
import torch  # noqa: E402
from diffusers import AutoencoderKLWan, WanPipeline  # noqa: E402
from diffusers.utils import export_to_video  # noqa: E402

gpu = torch.cuda.get_device_name(0)
# T4 en P100 kunnen geen bf16: dan fp16, en bij zwarte of kapotte beelden fp32
dtype = torch.bfloat16 if torch.cuda.get_device_capability(0)[0] >= 8 else torch.float16
log.update({'gpu': gpu, 'dtype': str(dtype)})
schrijf_log()

vae = AutoencoderKLWan.from_pretrained(MODEL, subfolder='vae', torch_dtype=torch.float32)
pipe = WanPipeline.from_pretrained(MODEL, vae=vae, torch_dtype=dtype)
pipe.enable_model_cpu_offload()


def maak(prompt, seed):
    g = torch.Generator(device='cpu').manual_seed(seed)
    return pipe(prompt=prompt, negative_prompt=NEGATIEF, height=480, width=832, num_frames=81,
                guidance_scale=5.0, num_inference_steps=30, generator=g).frames[0]


def kapot(frames):
    a = np.asarray(frames, dtype=np.float32)
    return (not np.isfinite(a).all()) or a.mean() < 0.02 or a.std() < 0.01


for i, w in enumerate(WENSEN):
    if time.time() - START > MAX_SECONDEN:
        log['mislukt'][w['naam']] = 'tijd op'
        continue
    try:
        t0 = time.time()
        frames = maak(w['prompt'], 1000 + i)
        if kapot(frames) and pipe.transformer.dtype != torch.float32:
            # fp16 gaf een zwart beeld: verder in fp32 (langzamer, wel goed)
            pipe.transformer.to(torch.float32)
            log['dtype'] = 'torch.float32 (na fp16-probleem)'
            frames = maak(w['prompt'], 1000 + i)
        if kapot(frames):
            raise RuntimeError('beeld is zwart of kapot')
        export_to_video(frames, os.path.join(UIT, f"{w['naam']}.mp4"), fps=16)
        log['klaar'].append({'naam': w['naam'], 'hash': w['hash'], 'seconden': round(time.time() - t0)})
    except Exception as e:  # noqa: BLE001
        log['mislukt'][w['naam']] = f'{type(e).__name__}: {e}'
        traceback.print_exc()
    schrijf_log()
    print(f"{w['naam']}: {'ok' if w['naam'] not in log['mislukt'] else log['mislukt'][w['naam']]}", flush=True)

log['totaal_seconden'] = round(time.time() - START)
schrijf_log()
