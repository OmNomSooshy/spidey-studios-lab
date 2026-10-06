import math,random,wave,struct,pathlib
import os,tempfile
root=pathlib.Path(os.environ.get('BYTE_QA_OUTPUT',str(pathlib.Path(tempfile.gettempdir())/'byte-glass-qa')));root.mkdir(parents=True,exist_ok=True);rng=random.Random(440)
rate=48000;low=0
with wave.open(str(root/'room.wav'),'wb') as w:
 w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate)
 samples=bytearray()
 for i in range(rate*30):
  t=i/rate; low+=(rng.uniform(-1,1)-low)*.08
  v=0
  if 1<t<3: v=.023*math.sin(2*math.pi*220*t)+.008*math.sin(2*math.pi*440*t)+.004*math.sin(2*math.pi*660*t)
  if 3<t<3.065: v=rng.uniform(-.55,.55)
  if 5<t<8: v=low*1.15
  samples+=struct.pack('<h',round(max(-.99,min(.99,v))*32767))
 w.writeframes(samples)
w,h=160,120
with open(root/'room.y4m','wb') as f:
 f.write(b'YUV4MPEG2 W160 H120 F10:1 Ip A1:1 C420jpeg\n')
 for frame in range(300):
  t=frame/10;ys=bytearray()
  for y in range(h):
   for x in range(w):
    if 8<t<21: value=18
    else:
     value=65
     left=10 if t<4 else 100
     if left<x<left+45 and 15<y<115: value=235
    ys.append(value)
  f.write(b'FRAME\n');f.write(ys);f.write(bytes([128])*(w*h//2))
print('Fixtures ready')
