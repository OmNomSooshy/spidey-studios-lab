"""Offline deterministic authoring of the candidate catalogue; no runtime build dependency."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
items=[]
def add(cat,id,name,price,desc,shape,color=None,pattern=None):
    src=f'assets/cosmetics/{id}.svg'
    if id not in ('cloud-cap','plum-beanie'):
        (root/src).write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 80"><g stroke="#314640" stroke-width="2" stroke-linejoin="round">'+shape+'</g></svg>')
    items.append(dict(id=id,category=cat,name=name,price=price,description=desc,src=src,**({'color':color,'pattern':pattern} if color else {})))
add('head','cloud-cap','Cloud cap',5,'A little piece of the sky.','')
add('head','plum-beanie','Plum beanie',8,'For very serious loafing.','')
heads=[
('sunhat','Garden sunhat',6,'Room for all three tufts.','<path fill="#ddbc77" d="M12 62Q64 42 116 62Q111 78 15 74Z"/><path fill="#f2d28c" d="M33 60L39 23Q64 10 91 23L98 60Z"/><path fill="#6e927e" d="M35 49L96 49L98 60H33Z"/>'),
('captain','Captain Byte',9,'Captain of the bath.','<path fill="#ece9d8" d="M23 51L14 29Q64 0 115 29L105 51Z"/><path fill="#283e56" d="M22 48H105V61H22Z"/><path fill="#31465c" d="M28 61Q64 80 98 61Z"/><path stroke="#d9ba65" fill="none" d="M64 20V41M56 28H72M53 35Q64 49 76 35"/>'),
('crown','Cardboard king',7,'His completely legitimate title.','<path fill="#cda76b" d="M22 65L16 22L40 39L63 9L86 39L111 22L103 65Z"/><path fill="#efd09a" d="M22 56H103V67H22Z"/><circle fill="#87c5bf" cx="64" cy="48" r="7"/>'),
('rainhat','Puddle explorer',6,'A roof for a very small head.','<path fill="#e9bd4d" d="M20 62L35 42Q33 10 65 10Q95 10 93 42L109 62Z"/><path fill="#f6d269" d="M16 61Q64 50 112 61L106 73H22Z"/><path fill="none" stroke="#fff4c2" d="M48 19Q40 29 42 40"/>'),
('wizard','Pocket wizard',10,'Absolutely no additional powers.','<path fill="#595880" d="M27 65L55 7L77 25L94 65Z"/><path fill="#73759c" d="M13 66Q64 51 115 66L110 76H18Z"/><path stroke="#e4d99a" d="M60 22L63 33M56 28H67M76 45L79 55M74 50H83"/>'),
('frog-cap','Frog disguise',8,'Nobody suspects the spider.','<path fill="#75a87a" d="M25 63Q21 30 40 30Q43 7 56 24Q71 7 85 30Q104 35 102 63Z"/><circle fill="#ecedd5" cx="45" cy="26" r="11"/><circle fill="#ecedd5" cx="83" cy="26" r="11"/><circle fill="#334a41" cx="45" cy="26" r="4"/><circle fill="#334a41" cx="83" cy="26" r="4"/><path fill="#93b787" d="M21 62H108L102 73H26Z"/>'),
('beret','Artist beret',6,'The mess is deliberate.','<path fill="#a75e56" d="M20 44Q12 17 58 17Q105 8 111 38Q116 61 24 61Z"/><path fill="#713e3e" d="M27 58H99V69H27Z"/><path d="M65 18L71 7"/>'),
('explorer','Crystal explorer',9,'Already owns the route.','<path fill="#a49774" d="M25 57Q27 13 64 13Q104 13 104 57Z"/><path fill="#8d8064" d="M13 59H116V70H13Z"/><path fill="#c3dcd0" d="M46 27H83V45H46Z"/><path fill="#4b675c" d="M52 31H77V40H52Z"/>'),
('antenna','Tin-foil thoughts',7,'Reception: mischievous.','<path fill="#becac7" d="M27 66L41 25L68 14L93 37L102 66Z"/><path fill="none" stroke="#ecf3e9" d="M42 26L57 60L68 15L79 61L93 37"/><path d="M68 14L75 4"/><circle fill="#8fc7c3" cx="76" cy="5" r="4"/>'),
('flower','Daisy chain',5,'A garden around his thoughts.','<path fill="none" stroke="#64815d" stroke-width="5" d="M20 59Q64 30 109 59"/>'+''.join(f'<g transform="translate({x} {y})"><path fill="#eee9cc" d="M0-10Q9-12 5-3Q14 1 5 5Q5 15-2 7Q-13 12-7 2Q-15-7-5-5Q-7-14 0-10Z"/><circle fill="#d9b65d" r="4"/></g>' for x,y in [(26,55),(51,44),(77,45),(102,56)])),
('sleep-cap','Moon nightcap',6,'For important dream business.','<path fill="#6c809a" d="M23 67Q28 21 56 20Q75 4 100 42L91 49Q74 22 67 44L88 67Z"/><path fill="#d4dbc9" d="M23 60H89V72H23Z"/><circle fill="#d4dbc9" cx="95" cy="47" r="8"/><path fill="#ead8a2" d="M49 32Q38 39 50 46Q32 47 38 32Z"/>'),
('party','One-creature party',5,'An occasion all by himself.','<path fill="#cf8d77" d="M30 67L64 6L99 67Z"/><path fill="none" stroke="#ead69f" stroke-width="8" d="M40 47L78 28M32 64L90 45"/><circle fill="#e4d5ad" cx="64" cy="7" r="6"/>'),
]
for v in heads:add('head',*v)
eye=[
('round-specs','Bookish rounds',5,'He can read your intentions.','<g fill="none" stroke="#b5a36c" stroke-width="5"><circle cx="34" cy="43" r="22"/><circle cx="94" cy="43" r="22"/><path d="M56 42Q64 34 72 42M12 38L2 32M116 38L126 32"/></g>'),
('star-specs','Starry trouble',7,'Five points. Zero restraint.','<path fill="#84657966" stroke="#ba83a0" stroke-width="4" d="M33 12L42 29L61 32L48 46L51 66L33 56L15 66L18 46L4 32L24 29Z M95 12L104 29L123 32L110 46L113 66L95 56L77 66L80 46L66 32L86 29Z"/><path d="M58 40H70"/>'),
('goggles','Workshop goggles',7,'Safety before sabotage.','<path fill="#8ab9bf44" stroke="#8a7860" stroke-width="6" d="M9 25H56V60H9Z M72 25H119V60H72Z"/><path stroke="#6a6251" stroke-width="5" d="M56 42H72M2 41H9M119 41H126"/>'),
('sunglasses','Incognito',6,'You definitely did not see him.','<path fill="#2b424acc" stroke="#d9b77d" stroke-width="4" d="M8 25H58L53 59H17Z M70 25H120L111 59H75Z"/><path d="M58 35H70"/><path stroke="#b5d2ca" d="M18 32L36 48M78 32L96 48"/>'),
('monocle','Single suspicious lens',5,'A discerning little bastard.','<circle fill="#d6ebdf22" stroke="#c7ac72" stroke-width="5" cx="94" cy="42" r="24"/><path fill="none" stroke="#c7ac72" d="M115 53Q119 77 100 79"/>'),
('heart-specs','Love goggles',6,'Unreasonably fond of crime.','<path fill="#c7888055" stroke="#b66f75" stroke-width="4" d="M33 65Q-5 35 12 23Q27 12 33 29Q44 12 57 25Q68 40 33 65Z M95 65Q57 35 74 23Q89 12 95 29Q106 12 119 25Q130 40 95 65Z"/><path d="M58 37H70"/>'),
('visor','Bubble visor',8,'A whole view of the world.','<path fill="#a9d8d333" stroke="#718f93" stroke-width="4" d="M7 22Q64 5 121 22V57Q64 76 7 57Z"/><path stroke="#e1f6e5" fill="none" d="M17 28L49 19"/>')]
for v in eye:add('eyes',*v)
for id,name,col in [('lagoon','Lagoon contacts','#5bacb9'),('violet','Violet contacts','#a28bb6'),('moss','Moss contacts','#73a974'),('sunset','Sunset contacts','#d58167')]:
    add('contacts',id,name,4,'Same huge eyes. A different glint.',f'<circle fill="{col}" cx="36" cy="40" r="24"/><circle fill="{col}" cx="92" cy="40" r="24"/><circle fill="#263630" cx="36" cy="40" r="13"/><circle fill="#263630" cx="92" cy="40" r="13"/><circle fill="#fff6df" cx="29" cy="31" r="5"/><circle fill="#fff6df" cx="85" cy="31" r="5"/>',col,'iris')
for id,name,col,pat,desc in [
('sailor','Sailor stripes','#e2dac0','stripe','A landlocked sailor.'),('raincoat','Little raincoat','#dcb646','buttons','Professional puddle inspector.'),('night-sky','Night-sky hoodie','#5c637f','stars','Wears his dreams outside.'),('garden-smock','Garden smock','#82986b','pocket','For getting properly filthy.'),('patchwork','Patchwork jacket','#bd8069','patch','Made of very small adventures.'),('crystal-knit','Crystal knit','#75b9ba','diamond','The expedition came home.'),('skeletal','Tiny bones tee','#48504e','bones','Six legs. Many mysteries.'),('bee-jacket','Bumble hoodie','#d2af4d','bee','Buzzing with bad ideas.')]:
    decorations={'stripe':'<path stroke="#627c91" stroke-width="6" d="M29 38H100M25 51H103M30 64H99"/>','buttons':'<circle fill="#76643a" cx="65" cy="32" r="3"/><circle fill="#76643a" cx="65" cy="46" r="3"/><path fill="#eac85b" d="M32 46H48V61H32Z M80 46H96V61H80Z"/>','stars':'<path stroke="#ead5a2" d="M43 30V42M37 36H49M82 45V57M76 51H88"/>','pocket':'<path fill="#bac397" d="M40 38H88V64Q64 76 40 64Z"/>','patch':'<path fill="#819886" d="M34 31H61V48H34Z"/><path fill="#d3b277" d="M71 44H96V65H71Z"/>','diamond':'<path fill="none" stroke="#d8eada" stroke-width="3" d="M36 48L50 31L64 48L50 65Z M65 48L79 31L93 48L79 65Z"/>','bones':'<path fill="none" stroke="#d8decf" stroke-width="5" d="M41 35L86 61M86 35L41 61"/>','bee':'<path stroke="#504f40" stroke-width="9" d="M29 37H100M26 58H102"/>'}[pat]
    add('top',id,name,7,desc,f'<path fill="{col}" d="M36 9L18 27L5 46L27 56L32 39V72H99V39L104 56L124 46L111 27L91 9L75 20H52Z"/>'+decorations,col,pat)
for id,name,col,shape,desc in [
('scarf','Adventure scarf','#b97562','<path fill="#b97562" d="M14 20Q64 36 113 20L110 42Q67 56 17 42Z M74 42L105 70L86 78L58 48Z"/>','A flutter of audacity.'),
('bowtie','Dinner bow','#ab7790','<path fill="#ab7790" d="M63 40L29 17V67L63 45L97 67V17Z"/><circle fill="#c89cae" cx="63" cy="42" r="9"/>','One very important biscuit.'),
('bandana','Trail bandana','#719b94','<path fill="#719b94" d="M13 18Q64 36 115 18L64 74Z"/><path fill="none" stroke="#e2ddba" d="M29 30L64 60L100 30"/>','Finds the way home.'),
('medal','Cardboard medal','#c6ad66','<path fill="#b37665" d="M43 4L64 40L84 4H98L73 49H55L30 4Z"/><circle fill="#cfb96e" cx="64" cy="57" r="20"/><path fill="none" d="M56 56L62 63L73 49"/>','Awarded by himself.'),
('satchel','Pocket satchel','#9e7d58','<path fill="#9e7d58" d="M36 32H98V74H36Z"/><path fill="none" stroke="#cfb894" stroke-width="6" d="M10 4L87 50"/><path fill="#b8986c" d="M36 33H98V50H36Z"/><path d="M61 43H73V57H61Z"/>','Probably contains a rock.')]:add('accessory',id,name,5,desc,shape)
for id,name,price,desc,shape in [
('comet-ball','Comet ball',5,'Throw it. He will want it back.','<circle fill="#829db3" cx="64" cy="40" r="29"/><path fill="none" stroke="#f2d599" stroke-width="5" d="M38 25Q77 15 91 55M36 52Q73 70 88 25"/>'),
('pinwheel','Breeze wheel',6,'A swipe or a breath starts a small storm.','<path d="M64 40V78" stroke="#957757" stroke-width="6"/><path fill="#b77d6b" d="M64 40L34 5L68 11Z"/><path fill="#8ba59c" d="M64 40L105 17L95 51Z"/><path fill="#d9bc77" d="M64 40L89 76L55 71Z"/><path fill="#8499b2" d="M64 40L20 65L28 30Z"/><circle fill="#e4d5ab" cx="64" cy="40" r="6"/>'),
('frog-toy','Squish frog',7,'Hold down. Let go. BOING.','<path fill="#89a476" d="M28 60Q15 26 47 22Q64 9 84 23Q115 30 103 60Z"/><circle fill="#e5e5ba" cx="46" cy="23" r="12"/><circle fill="#e5e5ba" cx="85" cy="23" r="12"/><circle cx="46" cy="23" r="4"/><circle cx="85" cy="23" r="4"/><path fill="none" d="M46 49Q64 58 83 49"/>'),
('ring-toy','Rolling moon',6,'Roll it one way. He sends it back.','<circle fill="none" stroke="#b39ac0" stroke-width="15" cx="64" cy="40" r="28"/><path fill="none" stroke="#d9cce1" stroke-width="3" d="M45 20Q66 10 83 26"/>'),
('rattle','Pebble rattle',5,'Shake a rhythm. He answers.','<path stroke="#957c5e" stroke-width="12" d="M64 43V74"/><path fill="#c9a77b" d="M35 17Q64 0 94 17V46Q64 62 35 46Z"/><path fill="none" stroke="#e5d3a7" d="M35 28H94M35 37H94"/>')]:add('toy',id,name,price,desc,shape)
(root/'catalogue.js').write_text('/* Authored stocked catalogue. Cosmetic categories never own physics. */\nwindow.byteTreasures = '+json.dumps(items,indent=2)+';\n')
print(len(items),'items', {c:len([i for i in items if i['category']==c]) for c in set(i['category'] for i in items)})
