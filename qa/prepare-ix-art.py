"""Technical extraction: four connected full-body performances, same 214x264 reference."""
from pathlib import Path
from PIL import Image
from scipy.ndimage import label,find_objects,binary_dilation
import numpy as np
root=Path(__file__).resolve().parents[1]
a=np.array(Image.open(root/'art/sunburn-ix-acting-source.png').convert('RGBA'))
labs,_=label(a[:,:,3]>20);parts=[]
for i,s in enumerate(find_objects(labs),1):
 if s is not None and (labs[s]==i).sum()>100000:parts.append((i,s))
parts.sort(key=lambda v:(v[1][0].start//600,v[1][1].start))
assert len(parts)==4
for name,(i,s) in zip(['anticipation','sour','proud','fresh'],parts):
 mask=binary_dilation(labs==i,iterations=2);b=a.copy();b[~mask]=0;b[b[:,:,3]<12]=0
 im=Image.fromarray(b);bounds=im.getchannel('A').getbbox();crop=im.crop(bounds)
 scale=min(210/crop.width,216/crop.height);small=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
 frame=Image.new('RGBA',(214,264));frame.alpha_composite(small,((214-small.width)//2,260-small.height));frame.save(root/'assets/hq'/f'{name}.png',optimize=True)
 print(name,bounds,small.size)
