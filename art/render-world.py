"""Sunburn XIII: offline authored geometry, baked light; no runtime 3D dependency.
Run: blender -b -t 6 -P art/render-world.py -- [asset name ...]
"""
import bpy, math, sys, os, json, random
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets','world');os.makedirs(OUT,exist_ok=True)
random.seed(13)
S=bpy.context.scene
S.render.engine='CYCLES';S.cycles.samples=40;S.cycles.use_denoising=False
S.render.image_settings.file_format='PNG';S.render.image_settings.color_mode='RGBA';S.render.film_transparent=True
S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast'
S.world.color=(.35,.35,.35)
metadata={}
def material(name,color,rough=.65,metal=0,texture=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if texture:
  tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=texture[0];tex.inputs['Detail'].default_value=2
  coord=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=texture[1];l.new(coord.outputs['Generated'],mapping.inputs[0]);l.new(mapping.outputs[0],tex.inputs['Vector'])
  ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.22;ramp.color_ramp.elements[0].color=(*(v*.78 for v in color),1);ramp.color_ramp.elements[1].position=.8;ramp.color_ramp.elements[1].color=(*(min(1,v*1.15) for v in color),1);l.new(tex.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],p.inputs['Base Color'])
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.025;l.new(tex.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
 return m
wood=material('honey oak',(.49,.29,.13),texture=(5,(1,14,2)))
woodlight=material('cut oak',(.68,.46,.23),texture=(7,(1,12,2)))
sage=material('sage paint',(.26,.43,.36),.4,texture=(22,(1,1,1)))
cream=material('warm ceramic',(.84,.85,.7),.22)
cloth=material('woven linen',(.49,.62,.51),texture=(100,(1,1,1)))
velvet=material('nook velvet',(.26,.38,.38),texture=(85,(1,1,1)))
gold=material('brushed brass',(.55,.39,.15),.3,.7)
iron=material('warm iron',(.10,.18,.18),.32,.7)
blue=material('enamel teal',(.23,.48,.54),.24,.25)
soil=material('damp soil',(.15,.10,.06),texture=(16,(1,1,1)))
leaf=material('leaf wax',(.19,.41,.21),.43,texture=(8,(1,1,1)))
pink=material('mushroom velvet',(.60,.24,.34),.45,texture=(8,(1,1,1)))
orange=material('orange rubber',(.86,.38,.09),.4)
ice=material('icy stone',(.29,.65,.70),.2,.17,texture=(4,(1,1,1)))
plaster=material('lime plaster',(.75,.77,.63),texture=(30,(1,1,1)))
def mat(o,m):o.data.materials.append(m);return o
def box(x,y,z,w,d,h,m,bevel=.05):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z));o=bpy.context.object;o.scale=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);mat(o,m)
 if bevel:mod=o.modifiers.new('soft edges','BEVEL');mod.width=bevel;mod.segments=3;o.modifiers.new('normals','WEIGHTED_NORMAL')
 return o
def ball(x,y,z,rx,ry,rz,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=(x,y,z));o=bpy.context.object;o.scale=(rx,ry,rz);mat(o,m)
 for p in o.data.polygons:p.use_smooth=True
 return o
def cylinder(x,y,z,r,h,m,vertices=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=(x,y,z));o=bpy.context.object;mat(o,m);mod=o.modifiers.new('rolled rim','BEVEL');mod.width=min(.035,h*.15);mod.segments=3;o.modifiers.new('normals','WEIGHTED_NORMAL');return o
def line(points,r,m):
 c=bpy.data.curves.new('rounded extrusion','CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;c.resolution_u=16
 sp=c.splines.new('POLY');sp.points.add(len(points)-1)
 for p,co in zip(sp.points,points):p.co=(*co,1)
 o=bpy.data.objects.new('rounded extrusion',c);bpy.context.collection.objects.link(o);mat(o,m);return o
def ring(x,y,z,r,thick,m,rotation=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=thick,major_segments=40,minor_segments=8,location=(x,y,z),rotation=rotation);return mat(bpy.context.object,m)
def fixture(name):
 if name.endswith('-yellow') or name.endswith('-blue'):
  name,color=name.rsplit('-',1);color={'yellow':(.92,.64,.15),'blue':(.30,.58,.82)}[color]
 else:color=(.60,.24,.34)
 pink.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*color,1)
 ramp=next(n for n in pink.node_tree.nodes if n.type=='VALTORGB').color_ramp
 ramp.elements[0].color=(*(v*.78 for v in color),1);ramp.elements[1].color=(*(min(1,v*1.15) for v in color),1)
 if name=='bench':
  for x in [-.65,.65]:box(x,0,.24,.12,.55,.48,wood);box(x,.19,.65,.12,.1,.8,wood)
  for y in [-.16,.05,.25]:box(0,y,.48,1.55,.18,.10,woodlight)
  for z in [.76,.96]:box(0,.24,z,1.6,.09,.15,woodlight)
 elif name=='can':
  cylinder(0,0,.27,.29,.5,blue);ring(0,0,.54,.25,.025,gold)
  line([(-.22,0,.47),(-.45,0,.49),(-.52,0,.27),(-.43,0,.06),(-.23,0,.10)],.038,blue)
  line([(.22,0,.18),(.52,0,.45),(.64,0,.50)],.065,blue);ball(.65,0,.52,.10,.095,.05,gold)
  cylinder(0,0,.50,.23,.025,iron)
 elif name=='lantern':
  for x in [-.12,.12]:for_y=[-.12,.12];[line([(x,y,.08),(x,y,.55)],.023,iron) for y in for_y]
  box(0,0,.08,.34,.34,.08,iron);box(0,0,.54,.34,.34,.10,iron);ball(0,0,.62,.22,.21,.09,iron);ring(0,0,.74,.09,.02,iron,(math.pi/2,0,0));cylinder(0,0,.3,.055,.24,cream)
 elif name=='pot':
  bpy.ops.mesh.primitive_cone_add(vertices=40,radius1=.21,radius2=.31,depth=.35,location=(0,0,.19));mat(bpy.context.object,material('terracotta',(.52,.24,.14),texture=(25,(1,1,1))))
  ring(0,0,.36,.29,.035,woodlight);cylinder(0,0,.345,.255,.03,soil)
  for i in range(7):
   a=i*2.4;o=ball(math.sin(a)*.16,math.cos(a)*.16,.6+(i%3)*.09,.075,.16,.23,leaf);o.rotation_euler=(.3*math.sin(a),.5*math.cos(a),a)
 elif name=='mushroom':
  cylinder(0,0,.15,.095,.32,cream);ball(0,0,.34,.43,.43,.19,pink);ball(0,0,.275,.41,.41,.045,cream)
  for i in range(7):a=i*2.4;ball(math.cos(a)*(.14 if i%2 else .26),math.sin(a)*(.14 if i%2 else .26),.47-(i%2)*.035,.055,.055,.015,cream)
 elif name=='hoop':ring(0,0,.05,.37,.045,gold)
 elif name=='seed':
  box(0,0,.12,.28,.055,.30,cloth);box(0,-.036,.13,.19,.012,.17,cream)
  for i in range(5):a=i*6.28/5;ball(math.sin(a)*.043,-.047,.15+math.cos(a)*.043,.035,.01,.025,pink)
  ball(0,-.06,.15,.024,.01,.024,gold)
 elif name=='ball':
  ball(0,0,.22,.22,.22,.22,orange)
  ring(0,0,.22,.219,.014,cream,(math.pi/2,0,0));ring(0,0,.22,.219,.014,blue,(0,math.pi/2,0))
 elif name in ['bed0','bed1','bed2','bed3']:
  stage=int(name[-1]);ball(0,0,.025,.45,.32,.075,wood);ball(0,0,.065,.40,.275,.045,soil)
  for i in range(12):a=i*2.4;ball(math.cos(a)*.3,math.sin(a)*.19,.084,.018,.022,.012,woodlight)
  if stage:
   line([(0,0,.09),(0,0,.15+stage*.18)],.024,leaf)
   for j in range(stage):
    for side in [-1,1]:o=ball(side*.08,0,.16+j*.11,.1,.032,.04,leaf);o.rotation_euler[1]=side*-.4
  if stage>=2:
   z=.15+stage*.18
   for i in range(7):a=i*6.28/7;ball(math.cos(a)*.12,math.sin(a)*.12,z,.09,.055,.035,pink)
   ball(0,0,z+.027,.063,.063,.035,gold)
 elif name=='tree':
  cylinder(0,0,.5,.16,1,wood);[ball(math.cos(i*2.4)*.4,math.sin(i*2.4)*.35,1.0+i%3*.2,.6,.6,.55,leaf) for i in range(7)]
 elif name=='wardrobe':
  box(0,0,.72,1.12,.35,1.40,sage,.08);box(0,-.19,.76,1.02,.065,1.18,woodlight)
  for x in [-.265,.265]:box(x,-.236,.76,.46,.05,1.06,sage);box(x,-.269,.77,.33,.013,.84,cloth,.04)
  for x in [-.07,.07]:ball(x,-.31,.67,.025,.025,.04,gold)
  box(0,0,1.48,1.22,.43,.11,woodlight);box(0,0,.08,1.19,.4,.10,woodlight)
 elif name=='chest':
  box(0,0,.28,1.20,.65,.48,wood,.09)
  for x in [-.43,.43]:box(x,-.345,.28,.08,.04,.40,gold,.02)
  box(0,-.36,.33,.13,.025,.13,gold,.025);box(0,0,.55,1.28,.71,.12,sage,.06)
 elif name=='chest-open':
  box(0,0,.28,1.20,.65,.48,wood,.09);box(0,0,.525,1.0,.51,.025,iron)
  lid=box(0,.24,.87,1.28,.12,.65,sage,.05);lid.rotation_euler[0]=-.16
  for x in [-.43,.43]:box(x,-.345,.28,.08,.04,.40,gold,.02)
  box(0,-.36,.33,.13,.025,.13,gold,.025)
 elif name=='cabinet':
  for x in [-.43,.43]:box(x,0,.44,.13,.36,.86,woodlight)
  for z in [.06,.85]:box(0,0,z,1.0,.36,.12,woodlight)
  box(0,.18,.45,.8,.05,.72,blue,.02);box(0,0,.055,1.1,.42,.09,woodlight)
 elif name=='nook':
  for x in [-.64,.64]:box(x,.0,.51,.18,.36,.92,wood)
  for i in range(12):
   a=i*math.pi/11;o=box(math.cos(a)*.63,0,.95+math.sin(a)*.49,.18,.38,.20,woodlight,.05);o.rotation_euler[1]=a-math.pi/2
  box(0,.16,.71,1.20,.08,1.23,velvet,.3);ball(0,-.14,.10,.62,.32,.12,cloth)
  for i in range(3):ball(-.3+i*.3,-.17,.22,.20,.14,.12,velvet)
 elif name=='mat':ball(0,0,.045,.8,.3,.055,cloth)
 elif name=='ladder':
  for x in [-.29,.29]:box(x,0,1.9,.09,.16,3.8,woodlight,.04)
  for i in range(11):cylinder(0,0,.17+i*.34,.045,.62,wood).rotation_euler[1]=math.pi/2
 elif name=='hatch':
  box(0,0,.08,1.60,.80,.12,wood,.05);box(0,-.02,.15,1.28,.61,.02,iron)
  for x in [-.53,.53]:box(x,0,.2,.07,.62,.08,woodlight)
 elif name=='beam':box(0,0,.10,2.6,.25,.25,woodlight,.065)
 elif name in ['window','round-window']:
  if name=='round-window':
   cylinder(0,0,.55,.48,.10,blue).rotation_euler[0]=math.pi/2;ring(0,-.065,.55,.49,.055,woodlight,(math.pi/2,0,0))
  else:
   box(0,0,.60,.9,.08,1.16,blue,.18)
   for x in [-.44,.44]:box(x,-.055,.60,.08,.1,1.13,woodlight)
   for z in [.04,1.16]:box(0,-.055,z,.94,.12,.09,woodlight)
  box(0,-.08,.60,.045,.04,1.07,cream,.01);box(0,-.08,.60,.82,.04,.045,cream,.01);box(0,-.01,.015,1.0,.27,.07,woodlight)
 elif name=='shelf':
  box(0,0,.34,1.6,.50,.12,woodlight,.06)
  for x in [-.56,.56]:line([(x,.14,.31),(x,.14,.04),(x,-.12,.31)],.045,wood)
 elif name=='pantry':
  box(0,0,.12,1.45,.45,.20,sage,.05);box(0,.20,.46,1.43,.10,.57,sage,.045)
  for x in [-.7,.7]:box(x,0,.3,.07,.42,.37,sage)
  box(0,0,.226,1.30,.33,.012,iron,.01)
 elif name=='table':
  for x in [-.73,.73]:box(x,0,.2,.11,.3,.38,wood)
  box(0,0,.44,1.7,.56,.14,woodlight,.07)
  ball(-.1,-.045,.52,.42,.20,.022,cloth);ball(.53,-.04,.53,.20,.15,.032,cream)
 elif name=='tub':
  for x in [-.73,.73]:ball(x,0,.065,.1,.17,.07,iron)
  box(0,.22,.5,1.65,.16,.84,cream,.18)
  for x in [-.8,.8]:box(x,0,.5,.13,.55,.83,cream,.065)
  box(0,0,.09,1.65,.65,.13,cream,.065)
  for y in [-.28,.28]:line([(-.74,y,.92),(.74,y,.92)],.052,cream)
 elif name=='tap':
  line([(0,0,0),(0,0,.34),(.02,0,.41),(.14,0,.44),(.25,0,.41),(.25,0,.32)],.038,gold)
  cylinder(0,0,.23,.052,.07,gold);line([(-.11,0,.25),(.11,0,.25)],.019,gold)
 elif name=='shower':
  ball(0,0,.12,.23,.09,.045,blue);box(0,.01,.045,.38,.15,.06,gold,.04)
  for i in range(7):ball(-.15+i*.05,-.078,.072,.009,.005,.008,iron)
 elif name=='dish':ball(0,0,.04,.3,.2,.045,cream)
 elif name=='sponge':
  m=material('porous sponge',(.89,.64,.19),texture=(28,(1,1,1)));box(0,0,.09,.55,.34,.17,m,.07)
  for i in range(9):ball(math.sin(i*2.4)*.21,math.cos(i*2.4)*.1,.17,.016,.02,.004,wood)
 elif name=='towel':
  box(0,0,.3,.48,.08,.61,cloth,.04)
  for i in range(8):line([(-.23+i*.065,-.055,.045),(-.23+i*.065,-.055,.09)],.01,cream)
 elif name in ['jam-star','sour-moon','fizz-berry','honey-knot','pink-cloud','carrot-curl']:
  if name=='jam-star':
   vertices=[(math.cos(i*math.pi/5)*(.3 if i%2==0 else .15),math.sin(i*math.pi/5)*(.3 if i%2==0 else .15),z) for z in [.015,.11] for i in range(10)]
   mesh=bpy.data.meshes.new('star biscuit');mesh.from_pydata(vertices,[],[list(range(10)),list(range(10,20))]+[[i,(i+1)%10,(i+1)%10+10,i+10] for i in range(10)]);o=bpy.data.objects.new('star biscuit',mesh);bpy.context.collection.objects.link(o);mat(o,woodlight);b=o.modifiers.new('baked edges','BEVEL');b.width=.018;b.segments=3
   cylinder(0,0,.117,.11,.025,pink)
  elif name=='sour-moon':
   cylinder(0,0,.07,.28,.12,woodlight);cylinder(.03,-.01,.139,.20,.012,material('lemon icing',(.95,.73,.18),.27))
  elif name=='fizz-berry':
   for i in range(7):a=i*2.4;ball(math.cos(a)*.10,math.sin(a)*.09,.09+i%3*.08,.095,.095,.095,material('berry skin '+str(i),(.20,.14,.35),.23))
   ball(0,0,.34,.14,.07,.018,leaf)
  elif name=='honey-knot':
   for i in range(3):o=ring((i-1)*.11,0,.10,.13,.045,woodlight);o.rotation_euler[1]=.25*(i-1)
  elif name=='pink-cloud':
   cylinder(0,0,.11,.22,.20,woodlight)
   for i in range(7):a=i*2.4;ball(math.cos(a)*.10,math.sin(a)*.10,.26+i%2*.06,.115,.115,.08,pink)
   ball(0,0,.38,.043,.043,.043,orange)
  elif name=='carrot-curl':
   for i in range(5):o=ball(math.sin(i*.9)*.07,math.cos(i*.9)*.07,.04+i*.045,.12,.05,.035,orange);o.rotation_euler[2]=i*.9
   ball(0,0,.32,.09,.025,.11,leaf)
 elif name=='biscuit':
  m=material('baked biscuit',(.66,.36,.13),texture=(24,(1,1,1)));cylinder(0,0,.07,.3,.12,m);ring(0,0,.135,.25,.011,woodlight)
  for i in range(12):a=i*2.4;ball(math.sin(a)*.19,math.cos(a)*.19,.13,.017,.02,.008,wood)
 elif name=='broccoli':
  line([(0,0,.03),(0,0,.32)],.063,leaf)
  for i in range(8):a=i*2.4;ball(math.cos(a)*.14,math.sin(a)*.14,.32+i%2*.07,.12,.12,.10,leaf)
 elif name=='stone':
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.35,location=(0,0,.28));o=bpy.context.object;o.scale=(.75,.6,1.3);mat(o,ice)
  line([(-.07,-.22,.14),(.08,-.19,.31),(0,-.08,.58)],.009,cream)
 elif name=='spring':
  box(0,0,.12,1.4,.55,.13,woodlight,.06)
  for x in [-.50,.50]:line([(x,-.2,.03),(x+.08,-.2,.1),(x-.06,-.2,.19)],.018,gold)
 elif name=='ledge':
  box(0,0,.14,1.4,.40,.20,ice,.025)
  for x in [-.53,.44]:o=box(x,.20,.15,.25,.22,.42,ice,.03);o.rotation_euler[1]=.3
  line([(-.4,-.22,.2),(-.1,-.23,.1),(.26,-.23,.23)],.007,cream)
 elif name=='frog-toy':
  ball(0,0,.12,.30,.22,.13,leaf)
  for x in [-.17,.17]:ball(x,-.12,.28,.10,.09,.10,leaf);ball(x,-.199,.28,.062,.024,.068,cream);ball(x,-.221,.28,.028,.016,.04,iron)
  for x in [-.25,.25]:ball(x,-.04,.025,.12,.12,.025,leaf)
 elif name=='rattle':
  line([(-.22,0,.04),(.03,0,.25)],.043,woodlight);ball(.11,0,.30,.20,.12,.20,orange)
  for a in range(4):ball(.11+math.cos(a*1.6)*.1,-.112,.30+math.sin(a*1.6)*.1,.023,.01,.022,cream)
 elif name=='ring-toy':ring(0,0,.08,.26,.06,orange)
 elif name=='pinwheel':
  for i in range(4):
   a=i*math.pi/2;ball(math.cos(a)*.14,0,.3+math.sin(a)*.14,.16,.045,.07,[orange,blue,pink,leaf][i]).rotation_euler[1]=-a
  ball(0,-.06,.3,.035,.02,.035,gold)
 elif name=='picture':box(0,0,.35,1,.10,.68,woodlight);box(0,-.06,.35,.84,.014,.52,cloth);line([(-.30,-.08,.15),(-.17,-.08,.5),(0,-.08,.22),(.17,-.08,.45),(.31,-.08,.15)],.015,blue)
 elif name=='wall':
  box(0,0,2,3.2,.25,4,plaster,.04)
  for x in [-1.5,-1.,-.5,0,.5,1,1.5]:box(x,-.15,.38,.47,.09,.71,sage,.018)
  box(0,-.18,.77,3.3,.14,.08,woodlight);box(0,-.18,.04,3.3,.12,.08,woodlight)
 elif name=='floor':
  for i in range(8):box(0,i*.17,.04,3,.16,.08,woodlight,.013)
 elif name=='tiles':
  for x in range(7):
   for z in range(10):box((x-3)*.27,0,z*.27+.14,.255,.08,.255,cream,.028)
 elif name=='passage':
  box(0,0,.62,.24,.20,1.22,woodlight);box(0,-.12,.61,.15,.035,1.10,iron)
  box(.025,-.15,.59,.025,.01,.99,gold,.006)
 elif name=='cloud':
  for i,(x,z,r) in enumerate([(-.6,.24,.35),(-.2,.4,.42),(.27,.34,.36),(.61,.19,.28)]):ball(x,0,z,r,.27,r*.72,cream)
  ball(0,0,.09,.88,.26,.12,cream)
 elif name=='ice-relief':
  for i in range(13):
   x=math.sin(i*2.4)*.75;z=.25+(i%4)*.52
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.65,location=(x,0,z));o=bpy.context.object;o.scale=(.85,.14,.85);mat(o,ice)
 elif name=='house':
  box(0,0,.6,2,.135+1.2,1.2,plaster,.08)
  for x in [-1.02,1.02]:box(x,0,.63,.09,1.38,1.22,wood)
  for x in [-.42,.42]:box(x,-.703,.58,.40,.06,.50,blue,.06)
  box(.18,-.72,.45,.5,.055,.85,sage,.07);ball(.35,-.76,.44,.025,.014,.025,gold)
  for side in [-1,1]:
   o=box(side*.57,0,1.37,1.36,1.70,.14,wood,.05);o.rotation_euler[1]=side*.52
   for j in range(6):
    for i in range(4):
     x=side*(.12+i*.28);o=box(x,-.7+j*.27,1.70-abs(x)*.57,.3,.29,.045,pink,.025);o.rotation_euler[1]=side*.52
  box(0,-.79,.04,.85,.40,.08,woodlight)
 else:raise ValueError(name)

def clear():
 for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)

def light():
 w=S.world;w.use_nodes=True;w.node_tree.nodes['Background'].inputs[0].default_value=(.68,.75,.88,1);w.node_tree.nodes['Background'].inputs[1].default_value=.45
 for pos,power,size in [((-3,-4,7),650,4),((4,1,4),180,5)]:
  bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.4))-o.location).to_track_quat('-Z','Y').to_euler()

def render(name):
 clear();fixture(name)
 bpy.context.view_layer.update()
 obs=[o for o in S.objects if o.type in ['MESH','CURVE']];points=[o.matrix_world@Vector(c) for o in obs for c in o.bound_box]
 lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));center=(lo+hi)/2
 # Garden objects use the exact ground-plane family, interiors nearly front-on.
 garden=name.split('-')[0] in ['bed2','bed3','seed'] or name in ['bench','can','lantern','pot','mushroom','hoop','seed','bed0','bed1','bed2','bed3','tree','house']
 direction=Vector((8,-8,7)) if garden else Vector((.5,-12,4.1))
 bpy.ops.object.camera_add(location=center+direction);cam=bpy.context.object;cam.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';S.camera=cam
 bpy.context.view_layer.update()
 inv=cam.matrix_world.inverted();pp=[inv@p for p in points];width=max(p.x for p in pp)-min(p.x for p in pp);height=max(p.y for p in pp)-min(p.y for p in pp)
 # Preserve geometry aspect; framing and ground pivot recorded independently from image bounds.
 side=max(width,height)*1.15;cam.data.ortho_scale=side
 S.render.resolution_x=384;S.render.resolution_y=384;S.render.resolution_percentage=100
 light();S.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
 pivot=inv@Vector((0,0,0));metadata[name]={'w':384,'h':384,'pivot':[.5+pivot.x/side,.5-pivot.y/side],'extent':[width/side,height/side],'rect':[.5+min(p.x for p in pp)/side,.5-max(p.y for p in pp)/side,width/side,height/side],'source':'offline rounded geometry / baked area light'}
 print('ASSET',name,flush=True)

def terrain():
 clear()
 grass=material('soft meadow',(.34,.49,.24),texture=(70,(1,1,1)))
 pathmat=material('sandy paving',(.62,.53,.35),texture=(22,(1,1,1)))
 box(-6,6,-.05,12,12,.12,grass,.04)
 path_layer=[0]
 def polygon(points,m):
  path_layer[0]+=1
  mesh=bpy.data.meshes.new('ground path');mesh.from_pydata([(-x/100,y/100,.018+path_layer[0]*.005) for x,y in points],[],[list(range(len(points)))]);o=bpy.data.objects.new('ground path',mesh);bpy.context.collection.objects.link(o);mat(o,m)
 polygon([[95,100],[265,100],[570,530],[485,660]],pathmat)
 polygon([[430,515],[820,740],[965,890],[900,975],[490,625]],pathmat)
 polygon([[260,185],[340,140],[385,220],[260,315]],pathmat)
 # Scaled objects share the screen/world projection; bounded static dressing only.
 def place(name,x,y,scale):
  before=set(bpy.data.objects);fixture(name);parts=set(bpy.data.objects)-before
  parent=bpy.data.objects.new('world placement',None);bpy.context.collection.objects.link(parent);parent.location=(-x/100,y/100,0);parent.scale=(scale,scale,scale)
  if name=='house':parent.rotation_euler[2]=math.pi
  for o in parts:o.parent=parent
 place('house',125,95,1.05)
 place('mushroom',855,455,.80)
 place('hoop',880,690,.68)
 for x,y in [(1050,170),(180,1030),(1060,1100)]:place('tree',x,y,.85)
 for side in [0,1200]:
  for y in range(0,1201,65):
   box(-side/100,y/100,.16,.05,.055,.33,woodlight,.015)
  line([(-side/100,0,.23),(-side/100,12,.23)],.017,wood)
 for x in range(0,1201,65):box(-x/100,12,.16,.05,.055,.33,woodlight,.015)
 line([(0,12,.23),(-12,12,.23)],.017,wood)
 # A few actual blades/pebbles supply tactile close-up detail baked once.
 for i in range(300):
  x=random.random()*12;y=random.random()*12
  if i%4==0:ball(-x,y,.025,.025,.035,.02,woodlight)
  else:line([(-x,y,.014),(-x+.025,y,.06)],.006,leaf)
 light()
 look=Vector((-5.119047619,5.119047619,0));direction=Vector((-20,20,17.4495))
 bpy.ops.object.camera_add(location=look+direction);cam=bpy.context.object;cam.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2100/113.13708499;S.camera=cam
 S.render.resolution_x=1680;S.render.resolution_y=1024;S.render.resolution_percentage=100;S.cycles.samples=32;S.render.filepath=os.path.join(OUT,'terrain.png');bpy.ops.render.render(write_still=True)
 metadata['terrain']={'w':1680,'h':1024,'display':[2100,1280],'groundOrigin':[1050,210],'projection':[.8,.42]}
 print('ASSET terrain',flush=True)

names=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
allnames=['bench','can','lantern','pot','mushroom','hoop','seed','ball','bed0','bed1','bed2','bed3','tree','house','wardrobe','chest','chest-open','cabinet','nook','mat','ladder','hatch','beam','window','round-window','shelf','pantry','table','tub','tap','shower','dish','sponge','towel','biscuit','broccoli','stone','spring','ledge','frog-toy','rattle','ring-toy','pinwheel','picture','wall','floor','tiles','passage','terrain','bed2-yellow','bed3-yellow','bed2-blue','bed3-blue','seed-yellow','seed-blue','jam-star','sour-moon','fizz-berry','honey-knot','pink-cloud','carrot-curl','cloud','ice-relief']
for name in names or allnames:
 if name=='terrain':terrain()
 else:render(name)
mp=os.path.join(OUT,'frames.json');old=json.load(open(mp)) if os.path.exists(mp) else {};old.update(metadata);json.dump(old,open(mp,'w'),indent=2)
