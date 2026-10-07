"""Normalize the approved candidate performances into the existing body reference frame."""
from pathlib import Path
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parents[1]
source=root/'art/sunburn-viii-possession-source.png'
im=Image.open(source).convert('RGBA')
for name,box,scale,pivot in [('rummaging',(0,0,950,im.height),.24,485),('expectant',(950,0,im.width,im.height),.27,1341)]:
    crop=im.crop(box);a=np.array(crop);a[a[:,:,3]<12]=0;crop=Image.fromarray(a)
    bounds=crop.getchannel('A').getbbox();small=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
    frame=Image.new('RGBA',(214,264));frame.alpha_composite(small,(round(107+(box[0]-pivot)*scale),round(260-bounds[3]*scale)))
    frame.save(root/'assets/hq'/f'{name}.png',optimize=True)
