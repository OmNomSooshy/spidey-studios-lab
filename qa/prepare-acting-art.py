"""Offline extraction of the authored transparent master; no runtime/build dependency.

One common scale retains head size. Pose-specific body centers and a shared foot
baseline normalize the 214x264 reference frame; none of these bounds enter physics.
The generated master already has transparency; its invisible RGB is not a backdrop.
"""
from pathlib import Path
from PIL import Image

repo = Path(__file__).resolve().parents[1]
master = Image.open(repo / 'art/sunburn-vi-acting-source.png')
poses = [
    ('drowsy', (31, 9, 512, 517), 277),
    ('asleep', (567, 73, 970, 506), 788),
    ('waking', (1023, 19, 1505, 520), 1270),
    ('refusal', (27, 513, 508, 1002), 280),
    ('satisfied', (539, 516, 1037, 997), 791),
]
for name, box, pivot in poses:
    crop = master.crop(box)
    bounds = crop.getchannel('A').point(lambda value: 255 if value > 20 else 0).getbbox()
    bottom = box[1] + bounds[3]
    scale = .403
    small = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS)
    frame = Image.new('RGBA', (214, 264))
    frame.alpha_composite(small, (round(107 + (box[0] - pivot) * scale), round(260 + (box[1] - bottom) * scale)))
    frame.save(repo / 'assets/hq' / (name + '.png'), optimize=True)
