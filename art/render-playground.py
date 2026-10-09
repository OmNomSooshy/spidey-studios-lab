"""XIV offline playground geometry. Same materials, camera and light as XIII.
Blender -b -t 6 -P art/render-playground.py. No runtime mesh/lighting cost.
"""
from pathlib import Path
source=Path(__file__).with_name('render-world.py').read_text()
exec(source[:source.index("names=sys.argv[")],globals())
S.cycles.samples=24
# Retain the entire old garden's authored geometry. Only the obsolete interior
# fence at x=1200 opens into the new meadow; the original fallback asset stays.
terrain_source=source[source.index('def terrain():'):source.index('names=sys.argv[')]
terrain_source=terrain_source.replace('for side in [0,1200]:','for side in [0]:').replace("'terrain.png'","'terrain-xiv.png'").replace("metadata['terrain']","metadata['terrain-xiv']")
exec(terrain_source,globals());wanted=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [];
if not wanted or 'terrain-xiv' in wanted:terrain()

def bake(name,width,height,paint):
 clear();paint();light();look=Vector((0,0,0));direction=Vector((-20,20,17.4495))
 bpy.ops.object.camera_add(location=look+direction);cam=bpy.context.object;cam.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=max(width,height)/113.13708499;S.camera=cam
 S.render.resolution_x=round(width*(.8 if name=='play-meadow' else 1.2));S.render.resolution_y=round(height*(.8 if name=='play-meadow' else 1.2));S.render.resolution_percentage=100;S.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
 metadata[name]={'w':S.render.resolution_x,'h':S.render.resolution_y,'rect':[0,0,1,1],'display':[width,height],'pivot':[.5,.5],'source':'XIV offline geometry / XIII materials and baked light'}

def meadow():
 grass=material('play meadow',(.34,.49,.24),texture=(70,(1,1,1)))
 sand=material('play sand',(.62,.53,.35),texture=(22,(1,1,1)))
 box(0,0,-.05,10,12,.12,grass,.04)
 # Continuous broad path from the former garden edge to the equipment.
 box(.0,-1,.02,8.8,1.35,.025,sand,.3)
 for y in [-6,6]:
  for x in range(-5,6):box(x,y,.16,.05,.055,.33,woodlight,.015)
  line([(-5,y,.23),(5,y,.23)],.017,wood)
 for y in range(-6,7):box(-5,y,.16,.05,.055,.33,woodlight,.015)
 line([(-5,-6,.23),(-5,6,.23)],.017,wood)
 for i in range(140):
  x=random.uniform(-4.8,4.8);y=random.uniform(-5.8,5.8)
  if abs(y+1)<.75:continue
  line([(x,y,0),(x+.025,y,.07)],.008,leaf)

# Relative to deck centre (1610,370): x-world maps to negative Blender x.
def structure():
 for x in [-.8,.8]:
  for y in [-.55,.55]:box(x,y,.65,.13,.13,1.3,wood)
 box(0,0,1.30,1.6,1.1,.12,woodlight)
 for y in [-.59,.59]:
  for x in [-.7,.0,.7]:box(x,y,1.65,.07,.07,.7,sage)
  line([(-.8,y,1.97),(.8,y,1.97)],.045,sage)
 # Broad climbable ramp with intermediate landing and tactile cross-grips.
 for start,end,z1,z2 in [(2.,3.,.64,0),(.8,1.5,1.3,.64)]:
  length=math.hypot(end-start,z2-z1);o=box((start+end)/2,0,(z1+z2)/2,length,1.1,.10,woodlight);o.rotation_euler[1]=-math.atan2(z2-z1,end-start)
  for i in range(7):
   t=(i+.3)/7;x=start+(end-start)*t;z=z1+(z2-z1)*t+.07;box(x,0,z,.065,1.08,.045,sage,.018)
 box(1.75,0,.64,.5,1.1,.11,woodlight)
 # Slide is a curved-rim teal metal chute, not a flat backdrop.
 line([(-.8,-.6,1.33),(-3.6,-.6,.06)],.07,blue);line([(-.8,.6,1.33),(-3.6,.6,.06)],.07,blue)
 o=box(-2.2,0,.65,3.08,1.10,.09,blue);o.rotation_euler[1]=-math.atan2(1.3,2.8)
 for x,z in [(-.8,1.3),(-2.2,.65),(-3.6,.03)]:box(x,0,z/2,.10,.85,max(.07,z),iron)
 # Little post caps maintain the existing honey-oak/sage family.
 for x in [-.7,.7]:
  for y in [-.59,.59]:ball(x,y,1.98,.065,.065,.065,woodlight)

def swingframe():
 for x in [-.65,.65]:
  for y in [-.50,.50]:line([(x,y,0),(x,0,2.13)],.065,wood)
 line([(-.84,0,2.13),(.84,0,2.13)],.08,sage)
 for x in [-.35,.35]:ring(x,0,2.05,.035,.012,gold,(math.pi/2,0,0))

def swingseat():
 box(0,0,.04,.80,.47,.13,woodlight,.065)
 for y in [-.18,.18]:line([(-.35,y,.08),(.35,y,.08)],.025,sage)

def trampoline():
 for a in range(0,360,60):
  r=math.radians(a);line([(.57*math.cos(r),.57*math.sin(r),0),(.57*math.cos(r),.57*math.sin(r),.23)],.04,iron)
 cylinder(0,0,.2,.64,.06,blue);cylinder(0,0,.235,.51,.035,velvet);ring(0,0,.25,.59,.06,orange)
 for a in range(0,360,30):
  r=math.radians(a);line([(.51*math.cos(r),.51*math.sin(r),.26),(.56*math.cos(r),.56*math.sin(r),.26)],.018,cream)

for name,w,h,paint in [('play-meadow',1920,1152,meadow),('play-structure',760,560,structure),('play-swing',330,540,swingframe),('play-seat',120,90,swingseat),('play-bounce',210,160,trampoline)]:
 if not wanted or name in wanted:bake(name,w,h,paint)
mp=Path(OUT)/'frames.json';old=json.loads(mp.read_text());old.update(metadata);mp.write_text(json.dumps(old,indent=2))
