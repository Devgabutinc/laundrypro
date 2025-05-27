# Aturan ProGuard untuk LaundryPro

# Aturan umum
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# Aturan untuk Capacitor
-keep class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin

# Aturan untuk Bluetooth Serial
-keep class com.megster.cordova.** { *; }

# Aturan untuk Google Services
-keep class com.google.android.gms.** { *; }
-keep class com.google.firebase.** { *; }

# Jangan obfuskasi nama kelas native
-keepnames class * implements android.os.Parcelable
-keepnames class * implements java.io.Serializable

# Aturan untuk JSON
-keep class org.json.** { *; }

# Aturan untuk WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Aturan untuk ReactiveX
-dontwarn io.reactivex.**
-keep class io.reactivex.** { *; }

# Aturan untuk Retrofit dan OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Aturan untuk Supabase
-keep class io.supabase.** { *; }
-keep class com.supabase.** { *; }

# Aturan untuk model data
-keep class com.laundrypro.app.models.** { *; }

# Aturan untuk mencegah obfuskasi kode printing
-keep class com.sunmi.** { *; }
-keep class com.epson.** { *; }
-keep class org.apache.commons.** { *; }
-keep class com.github.anastaciocintra.** { *; }
-keep class com.github.escposjava.** { *; }

# Aturan untuk ESC/POS printing
-keep class escpos.** { *; }
-keep class com.github.anastaciocintra.escpos.** { *; }

# Aturan tambahan untuk Bluetooth printing
-keep class android.bluetooth.** { *; }
-keep class * implements android.bluetooth.BluetoothProfile { *; }
-keep class com.megster.cordova.BluetoothSerialService { *; }
