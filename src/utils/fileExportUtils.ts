import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Toast } from '@capacitor/toast';

/**
 * Export file using Storage Access Framework (SAF) for Android 11+
 * This provides a better user experience by letting them choose where to save files
 */
export const exportFileWithSAF = async (
  fileName: string,
  data: string,
  mimeType: string
): Promise<{ success: boolean; uri?: string; error?: string }> => {
  if (!Capacitor.isNativePlatform()) {
    // For web browsers, use the standard download approach
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

  try {
    // First save to app's cache directory (always works without permissions)
    const tempResult = await Filesystem.writeFile({
      path: fileName,
      data,
      directory: Directory.Cache
    });

    // Get the file URI for sharing
    const fileUri = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Cache
    });

    // For Android, use the native share dialog
    if (Capacitor.getPlatform() === 'android') {
      // Import the Share plugin
      const { Share } = await import('@capacitor/share');
      
      try {
        // Share the file with a save action
        await Share.share({
          title: 'Simpan File',
          text: `Simpan file ${fileName}`,
          url: fileUri.uri,
          dialogTitle: 'Simpan File'
        });
        
        await Toast.show({
          text: 'File berhasil dibagikan. Silakan pilih "Simpan" untuk menyimpan file.',
          duration: 'long'
        });
        
        return {
          success: true,
          uri: fileUri.uri
        };
      } catch (shareError) {
        console.error('Error sharing file:', shareError);
        
        // If sharing fails, provide a fallback message
        await Toast.show({
          text: 'File disimpan di penyimpanan internal aplikasi. Anda dapat mengaksesnya melalui File Manager.',
          duration: 'long'
        });
        
        return {
          success: true,
          uri: tempResult.uri,
          error: 'File disimpan ke penyimpanan internal aplikasi.'
        };
      }
    }
    
    // For iOS or other platforms
    return {
      success: true,
      uri: tempResult.uri
    };
  } catch (error) {
    console.error('Error exporting file:', error);
    
    await Toast.show({
      text: 'Gagal menyimpan file. Coba lagi nanti.',
      duration: 'long'
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error exporting file'
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
