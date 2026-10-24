package studios.spidey.lightsaber;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.database.Cursor;
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
import android.os.HandlerThread;
import android.os.Looper;
import android.os.Process;
import android.provider.DocumentsContract;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipInputStream;

public final class MainActivity extends Activity implements SensorEventListener {
    static { System.loadLibrary("lightsaber"); }
    private static final int PICK_FONT = 41;
    private static final int PICK_FONT_FOLDER = 42;
    private static final int RATE = 44100, FRAMES = 128;
    private static final long MAX_IMPORT_BYTES = 256L * 1024 * 1024;
    private SensorManager sensors;
    private Sensor gyro;
    private HandlerThread sensorThread;
    private volatile boolean audioRunning;
    private AudioTrack track;
    private Thread audioThread;
    private TextView status;
    private TextView diagnostic;
    private Button ignite;
    private File loadedFont;
    private boolean bladeOn;
    private volatile boolean audioReady;
    private volatile int audioBufferFrames;
    private volatile int audioUnderruns;
    private volatile long queuedAudioFrames;
    private final AtomicLong submittedAudioFrames = new AtomicLong();
    private final AtomicInteger audioGeneration = new AtomicInteger();
    private long lastMotionNs;
    private final Handler diagnosticsHandler = new Handler(Looper.getMainLooper());
    private final Runnable diagnosticsTick = new Runnable() {
        @Override public void run() {
            if (diagnostic != null) {
                String state = nativeDiagnostics().replace(";", " · ");
                diagnostic.setText("audio=" + (audioReady ? "ready" : "off") + " · app_queue≈" + (queuedAudioFrames * 1000 / RATE) + "ms · buffer=" + audioBufferFrames + "f · underruns=" + audioUnderruns + " · " + state);
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
        ArrayList<File> savedFonts = new ArrayList<>();
        collectFontRoots(saved, 0, savedFonts);
        if (!savedFonts.isEmpty()) loadFont(savedFonts.get(0));
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(28, 36, 28, 28); root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setBackgroundColor(0xff10151d);
        TextView title = new TextView(this); title.setText("PROJECT LIGHTSABER"); title.setTextSize(22); title.setTextColor(0xfff4f6fa);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));
        status = new TextView(this); status.setText("Load a sound-font ZIP or choose an existing font folder."); status.setTextColor(0xffc5ced8); status.setTextSize(15);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(-1, -2); sp.setMargins(0, 24, 0, 24); root.addView(status, sp);
        diagnostic = new TextView(this); diagnostic.setText("Waiting for font and sensors"); diagnostic.setTextColor(0xff91c8ae); diagnostic.setTextSize(12); root.addView(diagnostic, fullWidth());
        Button choose = new Button(this); choose.setText("LOAD SOUND FONT ZIP"); choose.setOnClickListener(v -> chooseFont()); root.addView(choose, fullWidth());
        Button chooseFolder = new Button(this); chooseFolder.setText("CHOOSE SOUND FONT FOLDER"); chooseFolder.setOnClickListener(v -> chooseFontFolder()); root.addView(chooseFolder, fullWidth());
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
    private void chooseFontFolder() {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(i, PICK_FONT_FOLDER);
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if ((request != PICK_FONT && request != PICK_FONT_FOLDER) || result != RESULT_OK || data == null || data.getData() == null) return;
        if (request == PICK_FONT) importZipAsync(data.getData());
        else importFolderAsync(data.getData(), data.getFlags());
    }
    private File beginImport() throws IOException {
        File root = new File(getFilesDir(), "font");
        deleteTree(root);
        if (!root.mkdirs() && !root.isDirectory()) throw new IOException("Could not create private font storage.");
        return root;
    }
    private void importZipAsync(Uri uri) {
        status.setText("Importing selected ZIP…");
        new Thread(() -> {
            try {
                File root = beginImport();
                unzip(uri, root);
                ArrayList<File> fonts = new ArrayList<>(); collectFontRoots(root, 0, fonts);
                runOnUiThread(() -> chooseExtractedFont(fonts));
            } catch (ArchiveTooLargeException e) {
                runOnUiThread(() -> status.setText("Archive exceeds 256 MB extraction limit."));
            } catch (ZipException e) {
                runOnUiThread(() -> status.setText("Invalid or unsupported font structure: ZIP archive is damaged or unsafe."));
            } catch (SecurityException e) {
                runOnUiThread(() -> status.setText("Archive access failed: Android did not grant read access."));
            } catch (Exception e) {
                runOnUiThread(() -> status.setText("ZIP import failed: " + messageOf(e)));
            }
        }, "LightsaberZipImport").start();
    }
    private static final class ArchiveTooLargeException extends Exception {}
    private static final class FolderCopyException extends Exception {
        FolderCopyException(String message) { super(message); }
        FolderCopyException(String message, Throwable cause) { super(message, cause); }
    }
    private static String messageOf(Exception e) {
        return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
    }
    private void importFolderAsync(Uri treeUri, int grantFlags) {
        status.setText("Copying selected font folder…");
        new Thread(() -> {
            try {
                int readFlags = grantFlags & Intent.FLAG_GRANT_READ_URI_PERMISSION;
                getContentResolver().takePersistableUriPermission(treeUri, readFlags);
                File root = beginImport();
                String documentId = DocumentsContract.getTreeDocumentId(treeUri);
                Uri documentUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, documentId);
                File destination = new File(root, safeChildName(queryDocumentName(documentUri)));
                if (!destination.mkdirs() && !destination.isDirectory()) throw new FolderCopyException("Could not create private font storage.");
                copyDocumentFolder(treeUri, documentId, destination, new HashSet<>(), new long[]{0}, 0);
                ArrayList<File> fonts = new ArrayList<>(); collectFontRoots(root, 0, fonts);
                runOnUiThread(() -> chooseExtractedFont(fonts));
            } catch (Exception e) {
                runOnUiThread(() -> status.setText("Folder access failed: " + messageOf(e)));
            }
        }, "LightsaberFolderImport").start();
    }
    private String queryDocumentName(Uri documentUri) throws FolderCopyException {
        try (Cursor cursor = getContentResolver().query(documentUri,
                new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME}, null, null, null)) {
            if (cursor == null || !cursor.moveToFirst()) throw new FolderCopyException("The selected folder is no longer available.");
            String name = cursor.getString(0);
            return name == null || name.isEmpty() ? "SelectedFont" : name;
        } catch (FolderCopyException e) { throw e; }
        catch (Exception e) { throw new FolderCopyException("Could not read the selected folder name.", e); }
    }
    private static String safeChildName(String name) throws FolderCopyException {
        if (name == null || name.isEmpty() || name.equals(".") || name.equals("..") || name.contains("/") || name.contains("\\"))
            throw new FolderCopyException("Folder provider returned an unsafe name.");
        return name;
    }
    private void copyDocumentFolder(Uri treeUri, String documentId, File destination, Set<String> visited, long[] copied, int depth) throws FolderCopyException {
        if (depth > 16) throw new FolderCopyException("Selected folder nesting is deeper than 16 levels.");
        if (!visited.add(documentId)) throw new FolderCopyException("Folder provider returned a recursive directory.");
        Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, documentId);
        String[] columns = {DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_MIME_TYPE};
        try (Cursor cursor = getContentResolver().query(childrenUri, columns, null, null, null)) {
            if (cursor == null) throw new FolderCopyException("Folder provider returned no directory listing.");
            while (cursor.moveToNext()) {
                String childId = cursor.getString(0);
                String name = safeChildName(cursor.getString(1));
                String mime = cursor.getString(2);
                File target = new File(destination, name);
                if (!target.getCanonicalPath().startsWith(destination.getCanonicalPath() + File.separator))
                    throw new FolderCopyException("Folder contains an unsafe path.");
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    if (!target.mkdirs() && !target.isDirectory()) throw new FolderCopyException("Could not create a copied subfolder.");
                    copyDocumentFolder(treeUri, childId, target, visited, copied, depth + 1);
                } else {
                    Uri childUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, childId);
                    copyDocumentFile(childUri, target, copied);
                }
            }
        } catch (FolderCopyException e) { throw e; }
        catch (Exception e) { throw new FolderCopyException("Could not list or copy the selected folder.", e); }
    }
    private void copyDocumentFile(Uri source, File target, long[] copied) throws FolderCopyException {
        try (InputStream in = getContentResolver().openInputStream(source)) {
            if (in == null) throw new FolderCopyException("Folder provider could not open a selected file.");
            try (FileOutputStream out = new FileOutputStream(target)) {
                byte[] buffer = new byte[32768]; int n;
                while ((n = in.read(buffer)) != -1) {
                    copied[0] += n;
                    if (copied[0] > MAX_IMPORT_BYTES) throw new FolderCopyException("Selected font folder exceeds the 256 MB copy limit.");
                    out.write(buffer, 0, n);
                }
            }
        } catch (FolderCopyException e) { throw e; }
        catch (Exception e) { throw new FolderCopyException("Could not read a file from the selected folder.", e); }
    }
    private void unzip(Uri uri, File root) throws Exception {
        long total = 0; byte[] buffer = new byte[32768];
        InputStream raw=getContentResolver().openInputStream(uri);
        if(raw==null)throw new ZipException("Cannot read selected ZIP");
        try (ZipInputStream zip = new ZipInputStream(raw)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                String name = entry.getName().replace('\\', '/');
                if (name.startsWith("/") || name.contains("../") || name.equals("..")) throw new ZipException("Unsafe ZIP path");
                File out = new File(root, name); if (!out.getCanonicalPath().startsWith(root.getCanonicalPath() + File.separator)) throw new ZipException("Unsafe ZIP path");
                if (entry.isDirectory()) { out.mkdirs(); continue; }
                File parent = out.getParentFile(); if (parent != null) parent.mkdirs();
                try (FileOutputStream file = new FileOutputStream(out)) { int n; while ((n=zip.read(buffer)) > 0) { total += n; if (total > MAX_IMPORT_BYTES) throw new ArchiveTooLargeException(); file.write(buffer,0,n); } }
            }
        }
    }
    private void collectFontRoots(File directory, int depth, ArrayList<File> found) {
        if (looksLikeFontRoot(directory)) { found.add(directory); return; }
        if (depth < 8) { File[] children=directory.listFiles(File::isDirectory); if(children!=null) for(File child:children)collectFontRoots(child,depth+1,found); }
    }
    private boolean looksLikeFontRoot(File directory) {
        String[] files = {"hum.wav", "humm.wav", "out.wav", "poweron.wav", "swingl.wav", "lswing.wav"};
        for (String file : files) if (new File(directory, file).isFile()) return true;
        String[] folders = {"swingl", "swingh", "lswing", "hswing"};
        for (String folder : folders) if (new File(directory, folder).isDirectory()) return true;
        return false;
    }
    private void chooseExtractedFont(ArrayList<File> fonts) {
        if(fonts.isEmpty()){status.setText("Invalid or unsupported font structure: no Proffie sound-font WAV directories were found.");return;}
        if(fonts.size()==1){loadFont(fonts.get(0));return;}
        String[] names=new String[fonts.size()];for(int i=0;i<names.length;i++){String path=fonts.get(i).getAbsolutePath();String base=new File(getFilesDir(),"font").getAbsolutePath()+File.separator;names[i]=path.startsWith(base)?path.substring(base.length()):fonts.get(i).getName();}
        new AlertDialog.Builder(this).setTitle("Choose sound font").setItems(names,(d,which)->loadFont(fonts.get(which))).setNegativeButton("Cancel",null).show();
    }
    private void loadFont(File directory) {
        status.setText("Loading " + directory.getName() + "…"); ignite.setEnabled(false);
        if (bladeOn) { nativeRetract(); bladeOn=false; ignite.setText("IGNITE"); }
        stopAudio();
        new Thread(() -> {
            String[] error = new String[1]; boolean ok=nativeLoadFont(directory.getAbsolutePath(), error);
            runOnUiThread(() -> {
                if (!ok) { loadedFont=null; status.setText("Font load failed: " + error[0]); return; }
                loadedFont=directory;
                if (gyro == null) { status.setText("Font imported and loaded: " + directory.getName() + ". This phone has no gyroscope."); return; }
                ignite.setEnabled(true); startAudio();
                status.setText(audioReady ? "Font imported and loaded; audio ready: " + directory.getName() : "Font imported and loaded, but audio output failed: " + directory.getName());
            });
        }, "LightsaberFontLoader").start();
    }
    private void startAudio() {
        if (audioRunning) return;
        try {
            int min = AudioTrack.getMinBufferSize(RATE, AudioFormat.CHANNEL_OUT_STEREO, AudioFormat.ENCODING_PCM_16BIT);
            if (min < 0) throw new IllegalStateException("Android rejected 44.1 kHz stereo PCM output.");
            int size = Math.max(min, FRAMES*4*2);
            AudioTrack candidate = new AudioTrack.Builder().setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                    .setAudioFormat(new AudioFormat.Builder().setSampleRate(RATE).setEncoding(AudioFormat.ENCODING_PCM_16BIT).setChannelMask(AudioFormat.CHANNEL_OUT_STEREO).build())
                    .setBufferSizeInBytes(size).setTransferMode(AudioTrack.MODE_STREAM).setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY).build();
            if (candidate.getState() != AudioTrack.STATE_INITIALIZED) { candidate.release(); throw new IllegalStateException("AudioTrack did not initialize."); }
            track=candidate; audioBufferFrames=track.getBufferSizeInFrames(); audioUnderruns=track.getUnderrunCount(); queuedAudioFrames=0; submittedAudioFrames.set(0); track.play(); audioReady=true; audioRunning = true;
            int generation=audioGeneration.incrementAndGet();
            AudioTrack output=track;
            audioThread = new Thread(() -> {
                Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO);
                short[] audio=new short[FRAMES*2];
                while(audioRunning&&audioGeneration.get()==generation){ nativeRender(audio,FRAMES,RATE); int n=output.write(audio,0,audio.length,AudioTrack.WRITE_BLOCKING); if(n<0){if(audioGeneration.get()==generation){audioRunning=false;audioReady=false;runOnUiThread(()->status.setText("Audio output stopped: AudioTrack.write returned " + n));}break;} submittedAudioFrames.addAndGet(n/2); long played=Integer.toUnsignedLong(output.getPlaybackHeadPosition()); queuedAudioFrames=Math.max(0,submittedAudioFrames.get()-played); audioUnderruns=output.getUnderrunCount(); }
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
    @Override protected void onResume(){super.onResume();lastMotionNs=0;if(gyro!=null){sensorThread=new HandlerThread("LightsaberSensors",Process.THREAD_PRIORITY_MORE_FAVORABLE);sensorThread.start();sensors.registerListener(this,gyro,5000,0,sensorThread.getLooper());}if(loadedFont!=null&&gyro!=null)startAudio();}
    @Override protected void onPause(){sensors.unregisterListener(this);if(sensorThread!=null){sensorThread.quitSafely();try{sensorThread.join(500);}catch(InterruptedException e){Thread.currentThread().interrupt();}sensorThread=null;}stopAudio();super.onPause();}
    @Override protected void onDestroy(){diagnosticsHandler.removeCallbacks(diagnosticsTick);super.onDestroy();}
    private static void deleteTree(File f){if(!f.exists())return;File[] c=f.listFiles();if(c!=null)for(File x:c)deleteTree(x);f.delete();}
}
