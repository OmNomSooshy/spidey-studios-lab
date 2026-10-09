"""Detect clipped fixture framing independently of game screenshots."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]/'assets/world';result=[]
for name in ['play-structure','play-swing','play-seat','play-bounce','play-meadow']:
 im=Image.open(root/(name+'.png'));box=im.getchannel('A').getbbox();margin=min(box[0],box[1],im.width-box[2],im.height-box[3]);assert margin>=8,(name,im.size,box)
 frames=json.loads((root/'frames.json').read_text());assert frames[name]['w']==im.width and frames[name]['h']==im.height
 result.append({'name':name,'pixels':im.size,'visibleBounds':box,'minimumTransparentMargin':margin})
print(json.dumps({'status':'PASS','method':'Rendered alpha-boundary framing, plus metadata agreement. Runtime captures separately inspect actual placement.','assets':result},indent=2))
