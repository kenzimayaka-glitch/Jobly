#!/usr/bin/env python3
"""
Transforme des vidéos de gestes de J'IA (fond NOIR) en clips prêts pour l'app.

Usage (depuis la racine du repo) :
    python3 tools/process_clips.py <dossier_de_videos> [tenue]

<tenue> est blue (défaut), white ou yellow — voir lib/jia/outfit.ts. Chaque vidéo doit porter
le nom du geste : welcome.mp4, reassure.mp4, present-chart.mp4, goodbye.mp4… (les 20 gestes de
/api/jia/predict, ou n'importe quel nom de mouvement du rig : scarf_touch.mp4…).

Pour chaque vidéo : détourage du fond noir, WebM transparent (360 px), MP4 fond blanc (Safari),
mesure du cadrage, puis mise à jour de public/jia/outfits/<tenue>/clips/ et
components/JIA/clipsManifest.<tenue>.json.
Prérequis : ffmpeg, python3, numpy, pillow, scipy.
"""
import json, subprocess, sys, tempfile, shutil
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
OUTFIT = sys.argv[2] if len(sys.argv) > 2 else "blue"
if OUTFIT not in ("blue", "white", "yellow"):
    sys.exit(f"tenue inconnue : {OUTFIT} (attendu : blue, white, yellow)")
CLIPS_DIR = ROOT / "public" / "jia" / "outfits" / OUTFIT / "clips"
MANIFEST = ROOT / "components" / "JIA" / f"clipsManifest.{OUTFIT}.json"
RIG_HAIR_WIDTH = 0.60      # largeur des cheveux du rig, en fraction du canvas
CLIP_WIDTH = 0.80          # largeur du clip dans le canvas (doit correspondre à FIT.width de clips.ts)
SIZE = 360
EXTS = {".mp4", ".mov", ".webm", ".m4v"}

def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

def bgmask(rgb, T=22, k=5):
    """Fond = zone sombre reliée au bord, en fermant les petites brèches du halo (cheveux sombres préservés)."""
    mx = rgb.max(axis=2)
    H = mx >= T
    st = ndi.generate_binary_structure(2, 2)
    H2 = ndi.binary_dilation(H, structure=st, iterations=k)
    lab, _ = ndi.label(~H2)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg2 = np.isin(lab, border[border != 0])
    return ndi.binary_dilation(bg2, structure=st, iterations=k) & (~H)

def key_frame(path):
    rgb = np.array(Image.open(path).convert("RGB"))
    fg = ~bgmask(rgb)
    lab, n = ndi.label(fg)
    if n > 1:
        sizes = ndi.sum(fg, lab, range(1, n + 1))
        fg = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 2500])
    fg = ndi.binary_fill_holes(fg)
    a = ndi.gaussian_filter(ndi.binary_erosion(fg, iterations=1).astype(float), 0.7)
    return rgb, a

def hair_width(alpha):
    h = alpha.shape[0]
    band = alpha[int(.05 * h):int(.30 * h)] > .5
    cols = np.where(band.any(axis=0))[0]
    return (cols[-1] - cols[0]) / alpha.shape[1] if len(cols) else None

def process(video: Path, name: str):
    tmp = Path(tempfile.mkdtemp(prefix="jia_"))
    try:
        (tmp / "raw").mkdir(); (tmp / "key").mkdir(); (tmp / "white").mkdir()
        run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-r", "24", "-vf", "scale=624:-2", str(tmp / "raw" / "f%04d.png")])
        frames = sorted((tmp / "raw").glob("f*.png"))
        if len(frames) < 12:
            raise RuntimeError("vidéo trop courte")
        first = np.array(Image.open(frames[0]).convert("RGB"))
        corner = float(np.mean([first[:8, :8].max(), first[:8, -8:].max()]))  # coins du haut (le buste occupe le bas)
        if corner > 40:
            raise RuntimeError(f"le fond n'est pas noir (luminosité des coins du haut : {corner:.0f}) — régénérer sur fond noir")
        widths = {}
        for i, f in enumerate(frames):
            rgb, a = key_frame(f)
            if i in (0, len(frames) - 1):
                widths[i] = hair_width(a)
            Image.fromarray(np.dstack([rgb, (a * 255).astype("uint8")]), "RGBA").save(tmp / "key" / f.name)
            bg = Image.new("RGBA", (rgb.shape[1], rgb.shape[0]), (255, 255, 255, 255))
            bg.alpha_composite(Image.open(tmp / "key" / f.name)); bg.convert("RGB").save(tmp / "white" / f.name)
        CLIPS_DIR.mkdir(parents=True, exist_ok=True)
        run(["ffmpeg", "-v", "error", "-y", "-framerate", "24", "-i", str(tmp / "key" / "f%04d.png"),
             "-vf", f"scale={SIZE}:{SIZE}:flags=lanczos,format=yuva420p", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
             "-b:v", "0", "-crf", "41", "-auto-alt-ref", "0", "-row-mt", "1", "-an", str(CLIPS_DIR / f"{name}.webm")])
        run(["ffmpeg", "-v", "error", "-y", "-framerate", "24", "-i", str(tmp / "white" / "f%04d.png"),
             "-vf", f"scale={SIZE}:{SIZE}:flags=lanczos", "-c:v", "libx264", "-crf", "30", "-preset", "slower",
             "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(CLIPS_DIR / f"{name}.mp4")])
        w0, w1 = widths[0], widths[len(frames) - 1]
        s_from = round(RIG_HAIR_WIDTH / (w0 * CLIP_WIDTH), 3) if w0 else 1.0
        s_to = round(RIG_HAIR_WIDTH / (w1 * CLIP_WIDTH), 3) if w1 else 1.0
        return {"duration": round(len(frames) / 24, 2), "scaleFrom": s_from, "scaleTo": s_to}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    videos = sorted(p for p in src.iterdir() if p.suffix.lower() in EXTS)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    ok, ko = [], []
    for v in videos:
        name = v.stem.strip().lower().replace(" ", "-")
        try:
            r = process(v, name)
            manifest[name] = {k: float(x) for k, x in r.items()}
            MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")  # sauvegarde après chaque clip
            ok.append(name); print(f"OK   {name:16s} {manifest[name]}", flush=True)
        except Exception as e:
            ko.append(name); print(f"ÉCHEC {name}: {e}", flush=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"\n{len(ok)} clip(s) traité(s), {len(ko)} en échec. Manifest : {MANIFEST.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
