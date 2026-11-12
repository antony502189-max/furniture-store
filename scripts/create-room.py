"""Rebuild the original furniture showroom with Blender 4.5+.
blender --background --python scripts/create-room.py -- assets/models/room.glb
All geometry and materials are authored here; no external assets are required.
Blender coordinates (X,Y,Z) export to glTF (X,Z,-Y). Units are metres.
"""
import bpy, math, random, sys, os
from mathutils import Vector
random.seed(12)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for mesh in list(bpy.data.meshes):
    if mesh.users == 0: bpy.data.meshes.remove(mesh)
args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
output = os.path.abspath(args[0] if args else 'assets/models/room.glb')
os.makedirs(os.path.dirname(output),exist_ok=True)

def mat(name, color, rough=.65, metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    return m
wall=mat('Warm chalk plaster',(.82,.79,.70)); trim=mat('Ivory painted wood',(.93,.90,.82))
green=mat('Forest green woven fabric',(.13,.23,.18)); green2=mat('Soft sage fabric',(.35,.43,.33))
linen=mat('Natural linen',(.74,.66,.52)); clay=mat('Terracotta cushion',(.55,.27,.16))
wood=mat('Warm smoked oak',(.38,.22,.105),.42); woodLight=mat('Oak edge grain',(.55,.36,.19),.52)
black=mat('Powder coated charcoal',(.035,.043,.04),.38,.25); brass=mat('Brushed brass',(.64,.43,.17),.3,.75)
rug=mat('Wool rug oatmeal',(.70,.65,.54)); rugLine=mat('Rug woven border',(.40,.43,.35))
cream=mat('Ceramic cream',(.90,.84,.70),.30); terracotta=mat('Terracotta ceramic',(.57,.29,.19),.7)
leaf=mat('Olive leaves',(.13,.25,.11)); leafLight=mat('Sunlit leaves',(.29,.39,.18))
soil=mat('Potting soil',(.08,.055,.035)); sky=mat('Sky beyond window',(.60,.76,.79),1)
paper=mat('Book pages',(.91,.86,.72)); bookmat=[mat('Book sage',(.29,.37,.30)),mat('Book rust',(.55,.25,.13)),mat('Book ivory',(.79,.74,.62)),mat('Book navy',(.12,.20,.25))]
artblue=mat('Artwork dark blue',(.14,.26,.30)); artorange=mat('Artwork ochre',(.71,.45,.18)); artpink=mat('Artwork warm white',(.89,.80,.68))

current=None

def attach(o, material):
    if material:o.data.materials.append(material)
    if current:o.parent=current
    return o

def cube(name,loc,size,material,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc);o=bpy.context.object;o.name=name
    o.dimensions=size; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    attach(o,material)
    if bevel:
        m=o.modifiers.new('Soft crafted edges','BEVEL');m.width=bevel;m.segments=3
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
        n=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=n.name)
    return o

def cylinder(name,loc,radius,depth,material,vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    o=bpy.context.object;o.name=name;attach(o,material)
    for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
    return o

def ball(name,loc,scale,material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale;attach(o,material)
    for p in o.data.polygons:p.use_smooth=True
    return o

def rod(name,a,b,r,material):
    a,b=Vector(a),Vector(b);o=cylinder(name,(a+b)/2,r,(b-a).length,material,16)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

def group(pid):
    global current
    current=bpy.data.objects.new('product-'+pid,None);bpy.context.collection.objects.link(current)
    current['productId']=pid
    current.location=(0,0,0); current.rotation_euler=(0,0,0); current.scale=(1,1,1)
    return current

def vase(name,x,y,z,r,h,material):
    # Lathed profile creates a real hollow-neck silhouette rather than a box.
    profile=[(0,0),(.80*r,0),(r,.15*h),(.95*r,.55*h),(.46*r,.82*h),(.43*r,h),(.33*r,h),(.33*r,.87*h)]
    verts=[]; faces=[]; n=32
    for radius,height in profile:
        for i in range(n):
            angle=2*math.pi*i/n;verts.append((x+radius*math.cos(angle),y+radius*math.sin(angle),z+height))
    for j in range(len(profile)-1):
        for i in range(n): faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);attach(o,material)
    for p in mesh.polygons:p.use_smooth=True
    return o

def plant(x,y,z,size=1):
    vase('Hand thrown planter',x,y,z,.21*size,.43*size,terracotta)
    cylinder('Soil',(x,y,z+.39*size),.17*size,.025*size,soil)
    for k in range(7):
        angle=k*2.399;length=(.60+.12*(k%3))*size
        end=(x+math.cos(angle)*.27*size,y+math.sin(angle)*.27*size,z+.39*size+length)
        rod('Plant stem',(x,y,z+.4*size),end,.012*size,wood)
        for t in [.35,.65,1]:
            p=(x+(end[0]-x)*t,y+(end[1]-y)*t,z+.4*size+(end[2]-z-.4*size)*t)
            o=ball('Olive leaf',p,(.11*size,.045*size,.23*size),leaf if k%2 else leafLight)
            o.rotation_euler=(.45*math.cos(angle),.6*math.sin(angle),angle)

# Architectural shell: two walls remain open for an unobstructed orbit view.
cube('Floor slab',(0,0,-.13),(6.2,5.2,.22),wood,.035)
for i in range(20):
    tone=.9+random.random()*.17
    m=mat('Oak board %02d'%i,(.51*tone,.36*tone,.21*tone),.65)
    for j in range(3):
        cube('Individual oak floorboard',(-2.85+i*.30,-1.67+j*1.67,.002),(.294,1.66,.045),m,.008)
cube('Back plaster wall',(0,2.55,1.45),(6.2,.16,2.95),wall,.018)
# Left wall has a genuine opening, revealing sky and window details.
cube('Left wall lower',(-3.05,0,.46),(.16,5.1,.96),wall,.018)
cube('Left wall upper',(-3.05,0,2.64),(.16,5.1,.57),wall,.018)
cube('Left wall rear pier',(-3.05,1.86,1.66),(.16,1.4,1.46),wall,.018)
cube('Left wall front pier',(-3.05,-1.87,1.66),(.16,1.4,1.46),wall,.018)
cube('View through window',(-3.16,0,1.65),(.018,2.31,1.5),sky)
for yy in [-1.16,0,1.16]:cube('Window vertical frame',(-3.01,yy,1.65),(.14,.055,1.55),trim,.008)
for zz in [.9,1.65,2.4]:cube('Window horizontal frame',(-3.01,0,zz),(.14,2.38,.055),trim,.008)
cube('Deep window sill',(-2.91,0,.90),(.38,2.5,.07),trim,.012)
cube('Back skirting',(0,2.43,.09),(6,.035,.16),trim,.005)
cube('Left skirting',(-2.94,0,.09),(.035,5,.16),trim,.005)
# Linen curtains frame the opening; folded strips give a fabric silhouette.
rod('Curtain rail',(-2.87,-1.5,2.56),(-2.87,1.5,2.56),.019,black)
for side in [-1,1]:
    for i in range(6):
        yy=side*(1.08+i*.064)
        cube('Linen curtain fold',(-2.87+(.018 if i%2 else -.018),yy,1.48),(.055,.073,2.06),linen,.026)
# Rug and subtle woven border, on top of floor.
cube('Rounded wool area rug',(-.10,-.32,.042),(3.85,2.60,.038),rug,.08)
for x in [-1.9,1.70]:cube('Rug border stripe',(x,-.32,.063),(.035,2.36,.006),rugLine,.008)
for y in [-1.49,.85]:cube('Rug border stripe',(-.1,y,.063),(3.62,.035,.006),rugLine,.008)
for i in range(36):
    for yy in [-1.66,1.02]:rod('Rug fringe',(-1.85+i*.1,yy,.045),(-1.85+i*.1,yy+(.09 if yy>0 else -.09),.045),.007,linen)
# Three-seater sofa, separate legs, rounded frame, cushions, piping and pillows.
group('sofa')
for x in [-1.36,1.04]:
    for y in [1.07,1.89]:cylinder('Sofa oak foot',(x,y,.15),.055,.25,wood)
cube('Sofa upholstered base',(-.16,1.47,.38),(2.78,1.12,.35),green,.13)
cube('Sofa back',(-.16,1.96,.82),(2.78,.24,.85),green,.11)
for x in [-1.47,1.15]:cube('Sofa rounded arm',(x,1.46,.68),(.26,1.10,.66),green,.12)
for x in [-.99,-.16,.67]:
    cube('Sofa seat cushion',(x,1.33,.61),(.80,.84,.20),green,.085)
    cube('Sofa back cushion',(x,1.77,.94),(.81,.22,.55),green,.075)
    rod('Cushion front seam',(x-.31,.899,.61),(x+.31,.899,.61),.006,green2)
for x,y,z,m,ang in [(-1.02,1.55,.94,linen,-.18),(.73,1.55,.94,clay,.18),(.25,1.50,.78,green2,-.12)]:
    o=cube('Loose woven throw pillow',(x,y,z),(.43,.19,.44),m,.085);o.rotation_euler=(.16,ang,ang*.3)
# Draped throw: folded fabric over the left sofa arm.
for j in range(5):cube('Soft throw fold',(-1.42+j*.054,1.21,.96),(.06,.55,.035),linen,.014)
cube('Throw hanging over arm',(-1.59,1.21,.69),(.035,.56,.53),linen,.015)
current=None
# Coffee table: rounded solid oak top, dark crossed supports and accessories.
group('coffee-table')
o=cylinder('Elliptical coffee table top',(-.10,-.30,.48),1,.085,woodLight,64);o.scale=(.73,.47,1)
for x in [-.57,.37]:
    rod('Table angled leg',(x,-.55,.08),(x*.75,-.3,.45),.035,black)
    rod('Table angled leg',(x,-.05,.08),(x*.75,-.3,.45),.035,black)
cube('Table lower crossbar',(-.1,-.30,.22),(.94,.045,.045),black,.008)
# Tabletop accessories are children of the movable coffee-table product.
for i in range(2):
    cube('Coffee table art book',(.09,-.32,.54+i*.044),(.34,.25,.038),bookmat[i],.008)
    cube('Visible book pages',(.09,-.326,.54+i*.044),(.32,.243,.027),paper,.003)
vase('Small ceramic vase',-.48,-.23,.525,.08,.18,cream)
rod('Dried stem',(-.48,-.23,.66),(-.48,-.23,.96),.006,wood)
for k in range(4):ball('Dried leaf',(-.48+(.035 if k%2 else -.035),-.23,.76+k*.045),(.045,.015,.035),linen)
cylinder('Ceramic bowl',(.34,-.52,.55),.095,.05,cream)
# Sculptural armchair with curved supports and upholstery.
group('modern-armchair')
chair=current
for x in [-2.12,-1.43]:
    for y in [-.49,.20]:rod('Armchair tapered oak leg',(x,y,.09),(x+(.03 if x<-1.8 else -.03),y,.45),.034,wood)
cube('Armchair seat',(-1.78,-.12,.48),(.85,.86,.20),linen,.1)
cube('Armchair back',(-1.78,.26,.84),(.85,.18,.77),linen,.11)
for x in [-2.20,-1.36]:
    cube('Armchair oak armrest',(x,-.10,.70),(.07,.83,.065),woodLight,.027)
    rod('Armchair arm support',(x,.19,.43),(x,.19,.70),.028,wood)
o=cube('Armchair accent pillow',(-1.78,.12,.78),(.42,.19,.42),green2,.09);o.rotation_euler.x=.10
# Rotate the furniture around its local centre toward the coffee table.
from mathutils import Matrix
pivot=Vector((-1.78,-.12,0)); rot=Matrix.Rotation(math.radians(-13),4,'Z')
for ob in chair.children:ob.matrix_world=Matrix.Translation(pivot)@rot@Matrix.Translation(-pivot)@ob.matrix_world
current=None
# A genuine alternative: a rounded upholstered tub chair, not a recolor.
# Both chair variants occupy the same anchor; the browser selects one root.
group('classic-armchair')
classic=current
boucle=mat('Sand boucle upholstery',(.66,.55,.43))
for x in [-2.08,-1.48]:
    for y in [-.41,.17]:cylinder('Classic chair tapered foot',(x,y,.13),.035,.20,wood)
cube('Classic chair upholstered foundation',(-1.78,-.12,.38),(1.03,.98,.35),boucle,.16)
cube('Classic chair deep seat cushion',(-1.78,-.21,.56),(.75,.73,.20),linen,.095)
# Extruded semicircular back with a low-to-high curved top and genuine thickness.
verts=[]; faces=[]; segments=40
for radius_x,radius_y in [(.54,.50),(.40,.36)]:
    for top in [False,True]:
        for i in range(segments+1):
            a=math.pi*i/segments
            z=(.73+.40*math.sin(a)) if top else .40
            verts.append((-1.78+radius_x*math.cos(a),-.12+radius_y*math.sin(a),z))
stride=segments+1
for i in range(segments):
    for a,b in [(0,1),(1,3),(3,2),(2,0)]:
        faces.append((a*stride+i,a*stride+i+1,b*stride+i+1,b*stride+i))
faces.extend([(0,stride,3*stride,2*stride),(segments,2*stride-1,4*stride-1,3*stride-1)])
mesh=bpy.data.meshes.new('Sculpted tub chair back');mesh.from_pydata(verts,[],faces);mesh.update()
o=bpy.data.objects.new('Classic rounded upholstered shell',mesh);bpy.context.collection.objects.link(o);attach(o,boucle)
bevel=o.modifiers.new('Soft continuous upholstered edge','BEVEL');bevel.width=.035;bevel.segments=3
bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
for face in o.data.polygons:face.use_smooth=True
for x in [-2.24,-1.32]:
    cube('Classic chair padded arm',(x,-.22,.66),(.18,.67,.26),boucle,.085)
pillow=cube('Classic chair loose pillow',(-1.78,.13,.80),(.43,.17,.43),green2,.085);pillow.rotation_euler.x=.16
pivot=Vector((-1.78,-.12,0));rot=Matrix.Rotation(math.radians(-13),4,'Z')
for ob in classic.children:ob.matrix_world=Matrix.Translation(pivot)@rot@Matrix.Translation(-pivot)@ob.matrix_world
current=None
# Sideboard against the back wall.
group('nightstand')
for x in [1.64,2.57]:
    for y in [1.70,2.17]:cylinder('Cabinet foot',(x,y,.13),.027,.22,black)
cube('Oak sideboard case',(2.1,1.96,.53),(1.20,.62,.65),wood,.025)
for x in [1.81,2.39]:
    cube('Sideboard door',(x,1.635,.53),(.56,.025,.57),woodLight,.01)
    for i in range(9):cube('Door fluted oak detail',(x-.245+i*.061,1.61,.53),(.018,.024,.53),wood,.007)
    cylinder('Brass pull',(x,1.59,.55),.023,.03,brass,16).rotation_euler.x=math.pi/2
cube('Sideboard top',(2.1,1.96,.88),(1.24,.66,.055),woodLight,.016)
# Display accessories move and hide together with the nightstand.
vase('Terracotta display vase',2.37,1.98,.91,.11,.27,terracotta)
vase('Ivory display vase',2.08,1.98,.91,.08,.19,cream)
for i in range(3):cube('Sideboard books',(1.73,1.94,.94+i*.045),(.25,.30,.04),bookmat[i],.005)
# A wider, lower sideboard with three doors and its own display accessories.
group('sideboard')
for x in [1.40,2.80]:
    for y in [1.74,2.18]:
        rod('Wide sideboard angled foot',(x,y,.065),(x+(.035 if x<2.1 else -.035),y,.25),.030,black)
cube('Wide sideboard oak case',(2.1,1.96,.49),(1.60,.60,.56),wood,.045)
cube('Wide sideboard rounded top',(2.1,1.96,.80),(1.64,.65,.07),woodLight,.032)
for x in [1.57,2.10,2.63]:
    cube('Wide sideboard inset door',(x,1.648,.49),(.50,.026,.49),woodLight,.020)
    cube('Wide sideboard woven panel',(x,1.629,.49),(.40,.015,.38),linen,.012)
    for k in range(10):
        cube('Woven door vertical reed',(x-.183+k*.0407,1.617,.49),(.009,.012,.37),wood,.003)
    for k in range(7):
        cube('Woven door horizontal reed',(x,1.608,.322+k*.056),(.39,.009,.007),woodLight,.002)
    pull=cylinder('Wide sideboard brass handle',(x+.20,1.59,.55),.018,.035,brass,16);pull.rotation_euler.x=math.pi/2
vase('Wide sideboard tall vase',2.66,2.03,.835,.105,.28,terracotta)
vase('Wide sideboard small vase',2.40,2.03,.835,.075,.18,cream)
for i in range(3):cube('Wide sideboard stacked book',(1.58,1.96,.86+i*.043),(.31,.25,.035),bookmat[i],.005)
current=None
# Floor lamp: warm brass arc and cream fabric shade.
group('floor-lamp')
cylinder('Lamp heavy base',(-2.05,1.60,.09),.21,.08,black)
rod('Lamp brass stem',(-2.05,1.60,.12),(-2.05,1.60,1.95),.018,brass)
rod('Lamp angled arm',(-2.05,1.60,1.95),(-1.78,1.60,2.04),.017,brass)
bpy.ops.mesh.primitive_cone_add(vertices=48,radius1=.28,radius2=.18,depth=.36,location=(-1.78,1.60,1.87))
attach(bpy.context.object,linen);bpy.context.object.name='Fabric lampshade'
cylinder('Lamp diffuser',(-1.78,1.60,1.688),.26,.009,cream)
current=None
# Original framed geometric artwork above sofa.
for x,w,z,h in [(-.78,.68,1.97,.85),(.12,.88,2.02,1.00)]:
    cube('Oak art frame',(x,2.435,z),(w,.055,h),woodLight,.018)
    cube('Art paper',(x,2.40,z),(w-.07,.012,h-.07),artpink)
    cube('Abstract artwork block',(x-.10,2.388,z-.14),(.26,.009,.35),artblue,.035)
    disk=cylinder('Abstract artwork sun',(x+.11,2.375,z+.16),.13,.012,artorange,40);disk.rotation_euler.x=math.pi/2
# Architectural shelf and small studio details.
cube('Floating wall shelf',(1.97,2.36,1.71),(1.43,.27,.045),woodLight,.012)
for i in range(5):cube('Shelf upright book',(1.46+i*.055,2.36,1.85),(.047,.15,.24+random.random()*.06),bookmat[i%4],.003)
vase('Shelf ceramic',2.23,2.34,1.735,.07,.16,cream)
plant(2.33,-1.51,.03,1.2)
plant(-2.78,-1.76,.03,.72)
vase('Windowsill pot',-2.88,.68,.94,.085,.13,cream)
for k in range(6):
    a=k*math.pi/3;rod('Small sprig',(-2.88,.68,1.03),(-2.88+math.cos(a)*.09,.68+math.sin(a)*.09,1.32),.006,leaf)
    ball('Small sprig leaf',(-2.88+math.cos(a)*.09,.68+math.sin(a)*.09,1.32),(.035,.05,.09),leafLight)
# Merge static primitives by material and selectable product for low draw-call cost.
# Product roots remain intact so Three.js can walk parents to extras.productId.
from collections import defaultdict
batches=defaultdict(list)
for ob in list(bpy.context.scene.objects):
    if ob.type == 'MESH':
        batches[(ob.parent.name if ob.parent else '', ob.data.materials[0].name)].append(ob)
for (root,material),objects in batches.items():
    if len(objects) < 2: continue
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects: ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    bpy.context.object.name=(root or 'room')+' / '+material
# Bake all mesh transforms as well. Besides identity product roots, this keeps
# child bounds aligned to room axes for reliable browser Box3 hit/collision bounds.
bpy.ops.object.select_all(action='DESELECT')
meshes=[ob for ob in bpy.context.scene.objects if ob.type=='MESH']
for ob in meshes: ob.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# Export no camera or lights; the browser owns illumination and navigation.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',export_extras=True,export_cameras=False,export_lights=False,export_yup=True,export_apply=True)
print('ROOM_EXPORTED',output,os.path.getsize(output))
# Only default variants appear in the optional preview. The GLB above contains
# all seven roots with identity transforms and all meshes; browser owns visibility.
for pid in ['classic-armchair','sideboard']:
    root=bpy.data.objects['product-'+pid]
    root.hide_render=True
    for child in root.children_recursive:
        child.hide_render=True
        child.hide_set(True)
# Optional third argument saves an editable source file at an explicit location.
if len(args)>2:
    source=os.path.abspath(args[2]);os.makedirs(os.path.dirname(source),exist_ok=True)
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=source)

# Optional source scene and preview, outside of the shipped asset directory.
if len(args)>1:
    preview=os.path.abspath(args[1]);os.makedirs(os.path.dirname(preview),exist_ok=True)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True
    scene.world.color=(.65,.65,.65)
    scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.70,.77,.84,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
    def area(name,loc,energy,size,target):
        bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.name=name;l.data.energy=energy;l.data.shape='DISK';l.data.size=size
        l.rotation_euler=(Vector(target)-l.location).to_track_quat('-Z','Y').to_euler()
    area('Soft window light',(-2.5,-.3,3.8),550,4,(0,0,0))
    area('Large studio fill',(2,-3,5),800,5,(0,.5,.5))
    bpy.ops.object.camera_add(location=(7.0,-8.0,6.0));cam=bpy.context.object
    cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=8.4;scene.camera=cam
    scene.render.resolution_x=1100;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=preview
    scene.view_settings.view_transform='AgX'
    bpy.context.preferences.filepaths.save_version=0
    source=os.path.abspath(args[2]) if len(args)>2 else os.path.splitext(preview)[0]+'.blend'
    bpy.ops.wm.save_as_mainfile(filepath=source);bpy.ops.render.render(write_still=True)
