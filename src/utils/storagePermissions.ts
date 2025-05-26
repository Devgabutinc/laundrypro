import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Toast } from '@capacitor/toast';

/**
 * Check and request storage permissions for the app
 * @returns Promise<boolean> - Whether permissions are granted
 */
export const checkStoragePermissions = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return true; // On web, we don't need to check permissions
  }

  try {
    // For Android, we'll try to write a test file to check permissions
    if (Capacitor.getPlatform() === 'android') {
      try {
        // Create a temporary test file to check if we have write permissions
        const testFileName = `test-permissions-${Date.now()}.txt`;
        await Filesystem.writeFile({
          path: testFileName,
          data: 'test permissions',
          directory: Directory.Cache
        });
        
        // Clean up the test file
        await Filesystem.deleteFile({
          path: testFileName,
          directory: Directory.Cache
        });
        
        return true;
      } catch (error) {
        // If we can't write to cache, we likely don't have permissions
        console.error('Permission check failed:', error);
        
        // Show instructions to enable manually
        await Toast.show({
          text: 'Izin penyimpanan diperlukan. Silakan aktifkan izin penyimpanan di pengaturan aplikasi.',
          duration: 'long'
        });
        return false;
      }
    }
    
    return true; // For iOS or other platforms
  } catch (error) {
    console.error('Error checking storage permissions:', error);
    return false;
  }
};

/**
 * Save a file to the device with proper permission handling
 * @param path File path/name
 * @param data File content (base64 encoded)
 * @param directory Directory to save to
 * @returns Promise with the result
 */
export const saveFileWithPermissions = async (
  path: string,
  data: string,
  directory: Directory = Directory.Documents
): Promise<{ success: boolean; uri?: string; error?: string }> => {
  try {
    // Check permissions first
    const hasPermissions = await checkStoragePermissions();
    
    if (!hasPermissions) {
      return { 
        success: false, 
        error: 'Izin penyimpanan tidak diberikan' 
      };
    }

    // Try to write the file
    const result = await Filesystem.writeFile({
      path,
      data,
      directory,
      recursive: true
    });

    return {
      success: true,
      uri: result.uri
    };
  } catch (error) {
    console.error('Error saving file:', error);
    
    // Show a helpful error message
    await Toast.show({
      text: 'Gagal menyimpan file. Pastikan izin penyimpanan diberikan.',
      duration: 'long'
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error menyimpan file'
    };
  }
};
