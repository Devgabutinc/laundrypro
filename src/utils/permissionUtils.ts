import { Capacitor } from '@capacitor/core';
import { Toast } from '@capacitor/toast';
import { Filesystem, Directory, FilesystemEncoding } from '@capacitor/filesystem';

/**
 * Saves a file using the appropriate method based on Android version
 * For Android 11+ (API 30+), we use a different approach due to scoped storage restrictions
 */
export const saveFile = async (
  fileName: string,
  data: string,
  directory: Directory = Directory.Documents,
  mimeType: string = 'application/octet-stream'
): Promise<{ success: boolean; uri?: string; error?: string }> => {
  if (!Capacitor.isNativePlatform()) {
    // For web, use browser download
    try {
      const blob = base64ToBlob(data, mimeType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true };
    } catch (error) {
      console.error('Error downloading file in browser:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error downloading file'
      };
    }
  }

  // For Android, first try the direct approach
  try {
    // First try to save to app's private directory (always works)
    if (directory === Directory.Data || directory === Directory.Cache) {
      const result = await Filesystem.writeFile({
        path: fileName,
        data,
        directory,
        recursive: true
      });
      return { success: true, uri: result.uri };
    }

    // For external directories, try direct write first
    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data,
        directory,
        recursive: true
      });
      
      // Success! Show success message
      await Toast.show({
        text: `File berhasil disimpan: ${fileName}`,
        duration: 'long'
      });
      
      return { success: true, uri: result.uri };
    } catch (directWriteError) {
      // Direct write failed, try fallback method
      console.log('Direct write failed, trying fallback:', directWriteError);
      
      // Try to save to app's private directory first
      const tempResult = await Filesystem.writeFile({
        path: fileName,
        data,
        directory: Directory.Cache,
        recursive: true
      });
      
      // Show guidance to the user
      await Toast.show({
        text: 'Untuk menyimpan file, Anda perlu memberikan izin penyimpanan secara manual.',
        duration: 'long'
      });
      
      await Toast.show({
        text: 'Buka Pengaturan > Aplikasi > LaundryPro > Izin > Penyimpanan dan aktifkan.',
        duration: 'long'
      });
      
      // Return success but with a warning
      return { 
        success: true, 
        uri: tempResult.uri,
        error: 'File disimpan ke penyimpanan internal aplikasi. Untuk menyimpan ke Documents, berikan izin penyimpanan.'
      };
    }
  } catch (error) {
    console.error('Error saving file:', error);
    
    // Show error toast
    await Toast.show({
      text: 'Gagal menyimpan file. Coba lagi nanti.',
      duration: 'long'
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error menyimpan file'
    };
  }
};

/**
 * Helper function to convert base64 to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  // Remove data URL prefix if it exists
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  
  const byteCharacters = atob(base64Data);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type: mimeType });
}

/**
 * Determine appropriate MIME type based on file extension
 */
export function getMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  switch (extension) {
    case 'csv': return 'text/csv';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls': return 'application/vnd.ms-excel';
    case 'pdf': return 'application/pdf';
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
}
