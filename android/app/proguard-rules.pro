# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# PENTING: minifyEnabled dinonaktifkan di build.gradle untuk mencegah masalah printing
# File ini hanya digunakan jika minifyEnabled diaktifkan di masa depan

# Preserve line number information for debugging stack traces
-keepattributes SourceFile,LineNumberTable

# Keep WebView JavaScript interfaces
-keepclassmembers class fqcn.of.javascript.interface.for.webview {
   public *;
}

# Aturan khusus untuk mencegah masalah printing dengan angka acak

# Jangan obfuskasi library Bluetooth dan printing
-keep class com.github.anastaciocintra.** { *; }
-keep class com.github.danielfelgar.** { *; }
-keep class org.apache.commons.** { *; }
-keep class com.epson.** { *; }
-keep class com.zebra.** { *; }
-keep class cordova.plugin.** { *; }
-keep class org.apache.cordova.** { *; }

# Jangan obfuskasi plugin Bluetooth Serial
-keep class com.megster.cordova.** { *; }
-keep class nl.xservices.plugins.** { *; }

# Jangan obfuskasi Capacitor dan plugin-nya
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }

# Jangan obfuskasi kelas yang digunakan untuk serialisasi/deserialisasi JSON
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Jangan obfuskasi enum yang digunakan dalam JSON
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
