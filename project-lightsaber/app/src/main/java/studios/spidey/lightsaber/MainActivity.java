package studios.spidey.lightsaber;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public final class MainActivity extends Activity implements SensorEventListener {
    static { System.loadLibrary("lightsaber"); }
    private static final int PICK_FONT = 41;
    private static final int RATE = 44100, FRAMES = 256;
    private SensorManager sensors;
    private Sensor gyro;
    private volatile boolean audioRunning;
    private AudioTrack track;
    private Thread audioThread;
    private TextView status;
    private TextView diagnostic;
    private Button ignite;
    private File loadedFont;
    private boolean bladeOn;
    private volatile boolean audioReady;
    private final AtomicInteger audioGeneration = new AtomicInteger();
    private long lastMotionNs;
    private final Handler diagnosticsHandler = new Handler(Looper.getMainLooper());
    private final Runnable diagnosticsTick = new Runnable() {
        @Override public void run() {
            if (diagnostic != null) {
                String state = nativeDiagnostics().replace(";", " · ");
                diagnostic.setText("audio=" + (audioReady ? "ready" : "off") + " · " + state);
            }
            diagnosticsHandler.postDelayed(this, 250);
        }
    };

    private static native boolean nativeLoadFont(String path, String[] error);
    private static native void nativeMotion(float yDps, float zDps, long timestampNs);
    private static native void nativeIgnite();
    private static native void nativeRetract();
    private static native void nativeRender(short[] stereo, int frames, int sampleRate);
    private static native String nativeDiagnostics();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        sensors = (SensorManager)getSystemService(SENSOR_SERVICE);
        gyro = sensors.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
        buildUi();
        diagnosticsHandler.post(diagnosticsTick);
        if (gyro == null) status.setText("This phone does not report a gyroscope.");
        File saved = new File(getFilesDir(), "font");
        if (new File(saved, "hum.wav").isFile()) loadFont(saved);
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(28, 36, 28, 28); root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setBackgroundColor(0xff10151d);
        TextView title = new TextView(this); title.setText("PROJECT LIGHTSABER"); title.setTextSize(22); title.setTextColor(0xfff4f6fa);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));
        status = new TextView(this); status.setText("Load a Proffie sound-font ZIP to begin."); status.setTextColor(0xffc5ced8); status.setTextSize(15);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(-1, -2); sp.setMargins(0, 24, 0, 24); root.addView(status, sp);
        diagnostic = new TextView(this); diagnostic.setText("Waiting for font and sensors"); diagnostic.setTextColor(0xff91c8ae); diagnostic.setTextSize(12); root.addView(diagnostic, fullWidth());
        Button choose = new Button(this); choose.setText("LOAD SOUND FONT ZIP"); choose.setOnClickListener(v -> chooseFont()); root.addView(choose, fullWidth());
        ignite = new Button(this); ignite.setText("IGNITE"); ignite.setEnabled(false); ignite.setOnClickListener(v -> { if (bladeOn) { nativeRetract(); bladeOn=false; ignite.setText("IGNITE"); } else { nativeIgnite(); bladeOn=true; ignite.setText("RETRACT"); } });
        LinearLayout.LayoutParams ip = fullWidth(); ip.setMargins(0, 18, 0, 0); root.addView(ignite, ip);
        TextView hint = new TextView(this); hint.setText("Hold the phone like a hilt and swing it. Keep the screen awake while testing. Use headphones at a safe volume."); hint.setTextColor(0xff99a4b2); hint.setTextSize(14);
        LinearLayout.LayoutParams hp = new LinearLayout.LayoutParams(-1, -2); hp.setMargins(0, 30, 0, 0); root.addView(hint, hp);
        setContentView(root);
    }
    private LinearLayout.LayoutParams fullWidth() { return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT); }

    private void chooseFont() {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT); i.setType("application/zip"); i.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(i, PICK_FONT);
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != PICK_FONT || result != RESULT_OK || data == null || data.getData() == null) return;
        status.setText("Importing font…");
        new Thread(() -> {
            try { File root = new File(getFilesDir(), "font"); deleteTree(root); if (!root.mkdirs() && !root.isDirectory()) throw new Exception("Could not create font folder");
                unzip(data.getData(), root);
                ArrayList<File> fonts = new ArrayList<>(); collectFontRoots(root, 0, fonts);
                runOnUiThread(() -> chooseExtractedFont(fonts));
            } catch (Exception e) { runOnUiThread(() -> status.setText("Font import failed: " + e.getMessage())); }
        }).start();
    }
    private void unzip(Uri uri, File root) throws Exception {
        long total = 0; byte[] buffer = new byte[32768];
        InputStream raw=getContentResolver().openInputStream(uri);
        if(raw==null)throw new Exception("Cannot read selected ZIP");
        try (ZipInputStream zip = new ZipInputStream(raw)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                String name = entry.getName().replace('\\', '/');
                if (name.startsWith("/") || name.contains("../") || name.equals("..")) throw new Exception("Unsafe ZIP path");
                File out = new File(root, name); if (!out.getCanonicalPath().startsWith(root.getCanonicalPath() + File.separator)) throw new Exception("Unsafe ZIP path");
                if (entry.isDirectory()) { out.mkdirs(); continue; }
                File parent = out.getParentFile(); if (parent != null) parent.mkdirs();
                try (FileOutputStream file = new FileOutputStream(out)) { int n; while ((n=zip.read(buffer)) > 0) { total += n; if (total > 256L*1024*1024) throw new Exception("Font ZIP expands beyond 256 MB"); file.write(buffer,0,n); } }
            }
        }
    }
    private void collectFontRoots(File directory, int depth, ArrayList<File> found) {
        if (new File(directory,"hum.wav").isFile()) { found.add(directory); return; }
        if (depth < 4) { File[] children=directory.listFiles(File::isDirectory); if(children!=null) for(File child:children)collectFontRoots(child,depth+1,found); }
    }
    private void chooseExtractedFont(ArrayList<File> fonts) {
        if(fonts.isEmpty()){status.setText("No Proffie font folder found. ZIP must contain hum.wav and paired swingl/swingh files.");return;}
        if(fonts.size()==1){loadFont(fonts.get(0));return;}
        String[] names=new String[fonts.size()];for(int i=0;i<names.length;i++)names[i]=fonts.get(i).getName();
        new AlertDialog.Builder(this).setTitle("Choose sound font").setItems(names,(d,which)->loadFont(fonts.get(which))).setNegativeButton("Cancel",null).show();
    }
    private void loadFont(File directory) {
        status.setText("Loading " + directory.getName() + "…"); ignite.setEnabled(false);
        if (bladeOn) { nativeRetract(); bladeOn=false; ignite.setText("IGNITE"); }
        stopAudio();
        new Thread(() -> {
            String[] error = new String[1]; boolean ok=nativeLoadFont(directory.getAbsolutePath(), error);
            runOnUiThread(() -> {
                if (!ok) { loadedFont=null; status.setText("Font not ready: " + error[0]); return; }
                loadedFont=directory;
                if (gyro == null) { status.setText("Loaded " + directory.getName() + "; this phone has no gyroscope."); return; }
                status.setText("Loaded " + directory.getName() + "; check the diagnostics, then ignite."); ignite.setEnabled(true); startAudio();
            });
        }, "LightsaberFontLoader").start();
    }
    private void startAudio() {
        if (audioRunning) return;
        try {
            int min = AudioTrack.getMinBufferSize(RATE, AudioFormat.CHANNEL_OUT_STEREO, AudioFormat.ENCODING_PCM_16BIT);
            if (min < 0) throw new IllegalStateException("Android rejected 44.1 kHz stereo PCM output.");
            int size = Math.max(min, FRAMES*4*4);
            AudioTrack candidate = new AudioTrack.Builder().setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                    .setAudioFormat(new AudioFormat.Builder().setSampleRate(RATE).setEncoding(AudioFormat.ENCODING_PCM_16BIT).setChannelMask(AudioFormat.CHANNEL_OUT_STEREO).build())
                    .setBufferSizeInBytes(size).setTransferMode(AudioTrack.MODE_STREAM).setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY).build();
            if (candidate.getState() != AudioTrack.STATE_INITIALIZED) { candidate.release(); throw new IllegalStateException("AudioTrack did not initialize."); }
            track=candidate; track.play(); audioReady=true; audioRunning = true;
            int generation=audioGeneration.incrementAndGet();
            AudioTrack output=track;
            audioThread = new Thread(() -> {
                short[] audio=new short[FRAMES*2];
                while(audioRunning&&audioGeneration.get()==generation){ nativeRender(audio,FRAMES,RATE); int n=output.write(audio,0,audio.length,AudioTrack.WRITE_BLOCKING); if(n<0){if(audioGeneration.get()==generation){audioRunning=false;audioReady=false;runOnUiThread(()->status.setText("Audio output stopped: AudioTrack.write returned " + n));}break;} }
            }, "LightsaberAudio"); audioThread.setPriority(Thread.MAX_PRIORITY); audioThread.start();
        } catch (RuntimeException e) { audioReady=false; status.setText("Audio output failed: " + e.getMessage()); }
    }
    private void stopAudio() {
        audioRunning=false; audioReady=false; audioGeneration.incrementAndGet(); AudioTrack output=track;
        if(output!=null){try{output.stop();}catch(RuntimeException ignored){}}
        if(audioThread!=null){try{audioThread.join(500);}catch(InterruptedException e){Thread.currentThread().interrupt();}audioThread=null;}
        if(output!=null){try{output.release();}catch(RuntimeException ignored){}} track=null;
    }
    @Override public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType()!=Sensor.TYPE_GYROSCOPE) return;
        // Android gyro is radians/s. Map phone screen X/Z onto Proffie's Y/Z
        // swing plane, leaving the screen-longitudinal Y axis out of the speed.
        final float k=57.29578f, x=event.values[0]*k, z=event.values[2]*k;
        lastMotionNs=event.timestamp;
        nativeMotion(x,z,event.timestamp);
    }
    @Override public void onAccuracyChanged(Sensor sensor,int accuracy) {}
    @Override protected void onResume(){super.onResume();lastMotionNs=0;if(gyro!=null)sensors.registerListener(this,gyro,SensorManager.SENSOR_DELAY_GAME);if(loadedFont!=null&&gyro!=null)startAudio();}
    @Override protected void onPause(){sensors.unregisterListener(this);stopAudio();super.onPause();}
    @Override protected void onDestroy(){diagnosticsHandler.removeCallbacks(diagnosticsTick);super.onDestroy();}
    private static void deleteTree(File f){if(!f.exists())return;File[] c=f.listFiles();if(c!=null)for(File x:c)deleteTree(x);f.delete();}
}
