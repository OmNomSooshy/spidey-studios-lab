package com.spideystudios.littlebob;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.hardware.*;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.webkit.*;
import android.widget.FrameLayout;
import android.widget.Toast;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Local-asset WebView shell. No controller, physics or artwork ownership lives here. */
public final class MainActivity extends Activity implements SensorEventListener {
    private static final String HOST="appassets.androidplatform.net";
    private static final String START="https://"+HOST+"/assets/game/index.html";
    private static final String IMPORT="com.spideystudios.littlebob.IMPORT_SAVE";
    private static final int MEDIA_PERMISSIONS=10, IMPORT_FILE=11;
    private WebView web;
    private boolean resumed, ready, qa, batteryRegistered, firstGravity=true;
    private PermissionRequest mediaRequest;
    private SensorManager sensors;
    private Sensor accelerometer, linearSensor, gyro, gravitySensor;
    private final float[] acceleration=new float[3], linear=new float[3], angular=new float[3], gravity=new float[3];
    private long delivered;
    private String pendingImport;
    private final Handler main=new Handler(Looper.getMainLooper());
    private final BroadcastReceiver batteryReceiver=new BroadcastReceiver(){
        @Override public void onReceive(Context c,Intent i){
            int level=i.getIntExtra(BatteryManager.EXTRA_LEVEL,100),scale=i.getIntExtra(BatteryManager.EXTRA_SCALE,100);
            boolean plugged=i.getIntExtra(BatteryManager.EXTRA_PLUGGED,0)!=0;
            script("battery({charging:"+plugged+",level:"+(scale>0?(double)level/scale:1)+"})");
        }
    };
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        qa=getIntent().getBooleanExtra("qa_probe",false);
        sensors=(SensorManager)getSystemService(SENSOR_SERVICE);
        accelerometer=sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        linearSensor=sensors.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION);
        gyro=sensors.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
        gravitySensor=sensors.getDefaultSensor(Sensor.TYPE_GRAVITY);
        FrameLayout root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(41,77,74));
        root.setOnApplyWindowInsetsListener((v,insets)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets a=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());v.setPadding(a.left,a.top,a.right,a.bottom);}
            else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        web=new WebView(this);web.setBackgroundColor(Color.rgb(239,231,216));
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);root.requestApplyInsets();
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);settings.setBuiltInZoomControls(false);settings.setDisplayZoomControls(false);
        settings.setGeolocationEnabled(false);settings.setSafeBrowsingEnabled(true);settings.setTextZoom(100);
        WebView.setWebContentsDebuggingEnabled(qa);
        web.addJavascriptInterface(new Bridge(),"LittleBobNative");
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri u=request.getUrl();String path=u.getPath();
                if(!"https".equals(u.getScheme())||!HOST.equals(u.getHost())||path==null||!path.startsWith("/assets/game/")||path.contains("..")||!"GET".equals(request.getMethod()))return response(403,"text/plain",new ByteArrayInputStream(new byte[0]));
                String local=path.substring("/assets/".length());
                try{return response(200,mime(local),getAssets().open(local));}
                catch(IOException error){android.util.Log.e("LittleBob","Missing packaged asset: "+local);return response(404,"text/plain",new ByteArrayInputStream(new byte[0]));}
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                Uri u=request.getUrl();return !"https".equals(u.getScheme())||!HOST.equals(u.getHost())||!u.getPath().startsWith("/assets/game/");
            }
            @Override public void onPageFinished(WebView view,String url){if(resumed)script("resume()");}
            @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail){
                // Android may reclaim the renderer. Disk saves remain intact; recreation starts the real game.
                android.util.Log.w("LittleBob","WebView renderer reclaimed");((android.view.ViewGroup)view.getParent()).removeView(view);view.destroy();web=null;ready=false;recreate();return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(PermissionRequest request){runOnUiThread(()->askMedia(request));}
            @Override public void onPermissionRequestCanceled(PermissionRequest request){if(mediaRequest==request)mediaRequest=null;}
            @Override public boolean onConsoleMessage(ConsoleMessage message){
                if(message.messageLevel()==ConsoleMessage.MessageLevel.ERROR||qa)android.util.Log.i("LittleBobWeb",message.message()+" @ "+message.lineNumber());return true;
            }
            @Override public boolean onJsAlert(WebView view,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setTitle("Little Bob").setMessage(message).setPositiveButton("OK",(d,w)->result.confirm()).setOnCancelListener(d->result.cancel()).show();return true;}
        });
        web.loadUrl(START+(qa?"?probe":""));
        if(IMPORT.equals(getIntent().getAction()))main.postDelayed(()->chooseSave(),600);
    }
    private static WebResourceResponse response(int status,String type,InputStream input){
        Map<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-store");headers.put("X-Content-Type-Options","nosniff");
        return new WebResourceResponse(type,type.startsWith("text/")||type.equals("application/javascript")||type.equals("application/json")?"UTF-8":null,status,status==200?"OK":status==404?"Not Found":"Forbidden",headers,input);
    }
    private static String mime(String path){
        if(path.endsWith(".html"))return "text/html";if(path.endsWith(".js"))return "application/javascript";if(path.endsWith(".css"))return "text/css";if(path.endsWith(".json"))return "application/json";
        if(path.endsWith(".png"))return "image/png";if(path.endsWith(".webp"))return "image/webp";if(path.endsWith(".jpg"))return "image/jpeg";if(path.endsWith(".svg"))return "image/svg+xml";return "application/octet-stream";
    }
    private void askMedia(PermissionRequest request){
        if(!"https".equals(request.getOrigin().getScheme())||!HOST.equals(request.getOrigin().getHost())){request.deny();return;}
        if(mediaRequest!=null){request.deny();return;}mediaRequest=request;
        ArrayList<String> missing=new ArrayList<>();
        for(String resource:request.getResources()){
            String permission=PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)?Manifest.permission.CAMERA:PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)?Manifest.permission.RECORD_AUDIO:null;
            if(permission==null){request.deny();mediaRequest=null;return;}
            if(checkSelfPermission(permission)!=PackageManager.PERMISSION_GRANTED)missing.add(permission);
        }
        if(missing.isEmpty())grantMedia();else requestPermissions(missing.toArray(new String[0]),MEDIA_PERMISSIONS);
    }
    private void grantMedia(){
        PermissionRequest request=mediaRequest;mediaRequest=null;if(request==null)return;
        ArrayList<String> allowed=new ArrayList<>();for(String resource:request.getResources()){
            String p=PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)?Manifest.permission.CAMERA:Manifest.permission.RECORD_AUDIO;
            if(checkSelfPermission(p)==PackageManager.PERMISSION_GRANTED)allowed.add(resource);
        }
        if(allowed.isEmpty())request.deny();else request.grant(allowed.toArray(new String[0]));
    }
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(code==MEDIA_PERMISSIONS)grantMedia();}
    private void script(String action){if(web!=null&&ready)web.evaluateJavascript("window.LittleBobLifecycle&&window.LittleBobLifecycle."+action,null);}
    @Override public void onResume(){
        super.onResume();resumed=true;if(web!=null){web.onResume();script("resume()");}
        firstGravity=true;delivered=0;
        if(accelerometer!=null)sensors.registerListener(this,accelerometer,SensorManager.SENSOR_DELAY_GAME);
        else if(gravitySensor!=null)sensors.registerListener(this,gravitySensor,SensorManager.SENSOR_DELAY_GAME);
        if(linearSensor!=null)sensors.registerListener(this,linearSensor,SensorManager.SENSOR_DELAY_GAME);
        if(gyro!=null)sensors.registerListener(this,gyro,SensorManager.SENSOR_DELAY_GAME);
        if(!batteryRegistered){registerReceiver(batteryReceiver,new IntentFilter(Intent.ACTION_BATTERY_CHANGED));batteryRegistered=true;}
    }
    @Override public void onPause(){
        resumed=false;sensors.unregisterListener(this);if(batteryRegistered){unregisterReceiver(batteryReceiver);batteryRegistered=false;}
        // A permission sheet is not an absence. Keep its in-flight getUserMedia request alive.
        if(mediaRequest==null&&web!=null){script("pause()");web.onPause();}
        super.onPause();
    }
    @Override public void onDestroy(){
        sensors.unregisterListener(this);if(batteryRegistered){unregisterReceiver(batteryReceiver);batteryRegistered=false;}
        if(mediaRequest!=null){mediaRequest.deny();mediaRequest=null;}
        if(web!=null){web.removeJavascriptInterface("LittleBobNative");((android.view.ViewGroup)web.getParent()).removeView(web);web.destroy();web=null;}
        super.onDestroy();
    }
    @Override public void onBackPressed(){
        if(web==null){super.onBackPressed();return;}
        web.evaluateJavascript("window.LittleBobLifecycle?window.LittleBobLifecycle.back():false",result->{if(!"true".equals(result))moveTaskToBack(true);});
    }
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);if(IMPORT.equals(intent.getAction()))chooseSave();}
    @Override public void onAccuracyChanged(Sensor sensor,int accuracy){}
    @Override public void onSensorChanged(SensorEvent event){
        if(!resumed)return;
        int type=event.sensor.getType();
        if(type==Sensor.TYPE_ACCELEROMETER||type==Sensor.TYPE_GRAVITY){
            System.arraycopy(event.values,0,acceleration,0,3);
            if(firstGravity){System.arraycopy(acceleration,0,gravity,0,3);firstGravity=false;}
            if(linearSensor==null){for(int i=0;i<3;i++){gravity[i]=.90f*gravity[i]+.10f*acceleration[i];linear[i]=acceleration[i]-gravity[i];}}
        }else if(type==Sensor.TYPE_LINEAR_ACCELERATION)System.arraycopy(event.values,0,linear,0,3);
        else if(type==Sensor.TYPE_GYROSCOPE)System.arraycopy(event.values,0,angular,0,3);
        long now=SystemClock.elapsedRealtimeNanos();if(!ready||firstGravity||now-delivered<33333333)return;
        double interval=delivered==0?33.333:(now-delivered)/1e6;delivered=now;
        String rotation=gyro==null?"null":"{alpha:"+Math.toDegrees(angular[2])+",beta:"+Math.toDegrees(angular[0])+",gamma:"+Math.toDegrees(angular[1])+"}";
        script("motion({accelerationIncludingGravity:{x:"+acceleration[0]+",y:"+acceleration[1]+",z:"+acceleration[2]+"},acceleration:{x:"+linear[0]+",y:"+linear[1]+",z:"+linear[2]+"},rotationRate:"+rotation+",interval:"+interval+"})");
    }
    public final class Bridge {
        @JavascriptInterface public boolean qaEnabled(){return qa;}
        @JavascriptInterface public boolean motionAvailable(){return accelerometer!=null||gravitySensor!=null;}
        @JavascriptInterface public void ready(){main.post(()->{ready=true;if(!resumed)script("pause()");else script("resume()");Intent sticky=registerReceiver(null,new IntentFilter(Intent.ACTION_BATTERY_CHANGED));if(sticky!=null)batteryReceiver.onReceive(MainActivity.this,sticky);if(pendingImport!=null)confirmImport();});}
        @JavascriptInterface public void importFinished(){main.post(()->Toast.makeText(MainActivity.this,"Saved progress brought to Little Bob",Toast.LENGTH_LONG).show());}
    }
    private void chooseSave(){Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.setType("application/json");intent.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(intent,IMPORT_FILE);}
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);if(request!=IMPORT_FILE||result!=RESULT_OK||data==null||data.getData()==null)return;
        try(InputStream in=getContentResolver().openInputStream(data.getData());ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){if(out.size()+n>2000000)throw new IOException("Save file is too large");out.write(buffer,0,n);}
            String text=new String(out.toByteArray(),StandardCharsets.UTF_8);JSONObject check=new JSONObject(text);
            if(!"little-bob-save-v1".equals(check.optString("format"))||!(check.opt("values") instanceof JSONObject))throw new IOException("Choose the save downloaded from Little Bob's transfer page");
            pendingImport=text;if(ready)confirmImport();
        }catch(Exception error){new AlertDialog.Builder(this).setTitle("Save stayed unchanged").setMessage(error.getMessage()).setPositiveButton("OK",null).show();}
    }
    private void confirmImport(){
        final String save=pendingImport;pendingImport=null;
        new AlertDialog.Builder(this).setTitle("Bring this saved home?").setMessage("This replaces Little Bob's saved progress in this app. The browser's save stays untouched.").setNegativeButton("Cancel",null).setPositiveButton("Bring save",(d,w)->web.evaluateJavascript("(()=>{try{return window.LittleBobLifecycle.importSave("+JSONObject.quote(save)+")}catch(e){alert(e.message);return false}})()",null)).show();
    }
}
