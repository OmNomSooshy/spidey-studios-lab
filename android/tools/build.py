#!/usr/bin/env python3
"""Small dependency-free APK build using official Android SDK tools and Java's compiler module.
No Gradle, native engine, server, or downloaded runtime dependency is needed by the app.
Signing material belongs outside Git and is reused for every update.
"""
import argparse,hashlib,json,os,secrets,shutil,subprocess,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--sdk',required=True);p.add_argument('--work',required=True);p.add_argument('--output',required=True);p.add_argument('--signing',required=True);a=p.parse_args()
repo=Path(__file__).resolve().parents[2];sdk=Path(a.sdk);work=Path(a.work);out=Path(a.output);sign=Path(a.signing);tools=sdk/'build-tools/35.0.0';platform=sdk/'platforms/android-35/android.jar'
if work.exists():shutil.rmtree(work)
for d in [work/'assets/game',work/'classes',work/'gen',work/'dex',out,sign]:d.mkdir(parents=True,exist_ok=True)
def run(args):subprocess.run([str(v) for v in args],check=True,cwd=repo)
assets=[]
for f in repo.iterdir():
 if f.is_file() and f.suffix in ['.html','.js','.css']:
  dest=work/'assets/game'/f.name;shutil.copyfile(f,dest);assets.append(f.name)
for folder in ['hq','cosmetics','world']:
 for f in (repo/'assets'/folder).iterdir():
  if f.is_file() and (folder!='world' or f.suffix in ['.json','.webp']):
   rel=Path('assets')/folder/f.name;dest=work/'assets/game'/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(f,dest);assets.append(str(rel))
run([tools/'aapt2','compile','--dir',repo/'android/res','-o',work/'resources.zip'])
run([tools/'aapt2','link','-o',work/'base.apk','-I',platform,'--manifest',repo/'android/AndroidManifest.xml','--java',work/'gen','--auto-add-overlay','-A',work/'assets',work/'resources.zip'])
java=list((repo/'android/src').rglob('*.java'))+list((work/'gen').rglob('*.java'))
run(['java','com.sun.tools.javac.Main','-source','8','-target','8','-classpath',platform,'-d',work/'classes',*java])
with zipfile.ZipFile(work/'classes.jar','w') as z:
 for f in (work/'classes').rglob('*.class'):z.write(f,f.relative_to(work/'classes'))
run([tools/'d8','--lib',platform,'--min-api','26','--output',work/'dex',work/'classes.jar'])
with zipfile.ZipFile(work/'base.apk','a') as z:
 for f in (work/'dex').glob('*.dex'):z.write(f,f.name)
run([tools/'zipalign','-P','16','-f','4',work/'base.apk',work/'aligned.apk'])
password=sign/'password.txt';key=sign/'little-bob-release.p12'
if not key.exists():
 password.write_text(secrets.token_urlsafe(48)+'\n');password.chmod(0o600)
 run(['keytool','-genkeypair','-keystore',key,'-storetype','PKCS12','-alias','little-bob','-keyalg','RSA','-keysize','4096','-validity','10000','-dname','CN=Little Bob, OU=Spidey Studios, O=Spidey Studios','-storepass:file',password,'-keypass:file',password]);key.chmod(0o600)
manifest=ET.parse(repo/'android/AndroidManifest.xml').getroot();ns='{http://schemas.android.com/apk/res/android}'
version=manifest.attrib[ns+'versionName'];code=int(manifest.attrib[ns+'versionCode']);package=manifest.attrib['package']
apk=out/('little-bob-'+version+'.apk')
run([tools/'apksigner','sign','--ks',key,'--ks-key-alias','little-bob','--ks-pass','file:'+str(password),'--out',apk,work/'aligned.apk'])
run([tools/'apksigner','verify','--verbose','--print-certs',apk]);run([tools/'zipalign','-c','-P','16','4',apk])
with zipfile.ZipFile(apk) as z:
 assert z.testzip() is None
 for rel in assets:assert z.read('assets/game/'+rel)==(work/'assets/game'/rel).read_bytes(),rel
 assert 'classes.dex' in z.namelist() and 'AndroidManifest.xml' in z.namelist()
meta={'version':version,'version_code':code,'package':package,'baseline':'545192c328912cd41633dc3f22598e1f046523b8','apk':apk.name,'bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'runtime_assets':len(assets),'runtime_assets_sha256':{rel:hashlib.sha256((work/'assets/game'/rel).read_bytes()).hexdigest() for rel in assets},'signed':True,'offline_local_asset_origin':'https://appassets.androidplatform.net/assets/game/index.html','source_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'source_branch':subprocess.check_output(['git','branch','--show-current'],cwd=repo,text=True).strip()}
(out/'build-evidence.json').write_text(json.dumps(meta,indent=2)+'\n');print(json.dumps({k:v for k,v in meta.items() if k!='runtime_assets_sha256'},indent=2))
