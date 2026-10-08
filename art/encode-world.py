"""Storage-only WebP encoding; baked geometry, framing, pixels and body geometry stay authored."""
from pathlib import Path
import subprocess,sys,os
p=Path(__file__).resolve().parent.parent/'assets/world'
for source in ([p/(name+'.png') for name in sys.argv[1:]] or sorted(p.glob('*.png'))):
 subprocess.run(['magick',str(source),'-quality','90','-define','webp:method=6',str(source.with_suffix('.webp'))],check=True,env={**os.environ,'MAGICK_THREAD_LIMIT':'2'})
print('PNG source bytes:',sum(f.stat().st_size for f in p.glob('*.png')))
print('Runtime WebP bytes:',sum(f.stat().st_size for f in p.glob('*.webp')))
