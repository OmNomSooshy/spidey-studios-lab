"""Index the actual opaque pixel footprint; no source pixels or body geometry changed."""
from PIL import Image
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent/'assets/world'
frames=json.loads((root/'frames.json').read_text())
for file in root.glob('*.png'):
 im=Image.open(file);w,h=im.size
 bbox=im.getchannel('A').point(lambda a:255 if a>6 else 0).getbbox() or (0,0,w,h)
 if file.stem=='terrain':bbox=(0,0,w,h)
 x,y,x1,y1=bbox
 frames.setdefault(file.stem,{}).update(w=w,h=h,rect=[x/w,y/h,(x1-x)/w,(y1-y)/h],source='offline rounded geometry / baked area light')
(root/'frames.json').write_text(json.dumps(frames,indent=2)+'\n')
print(len(frames),'authored frames indexed')
