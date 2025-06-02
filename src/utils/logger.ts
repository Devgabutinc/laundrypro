/**
 * Logger utility untuk Android dan Web
 * Memastikan log tetap terlihat di Android Logcat saat aplikasi terjeda
 */

import { Capacitor } from '@capacitor/core';

const TAG = 'LaundryProApp';

/**
 * Log informasi dengan tag yang konsisten untuk Logcat
 */
export const logInfo = (message: string, data?: any): void => {
  if (Capacitor.isNativePlatform()) {
    // Format khusus untuk Android Logcat
    console.log(`${TAG}:INFO: ${message}`);
    if (data) {
      console.log(`${TAG}:INFO_DATA: ${JSON.stringify(data)}`);
    }
  } else {
    // Format biasa untuk web
    console.log(`[INFO] ${message}`, data || '');
  }
};

/**
 * Log error dengan tag yang konsisten untuk Logcat
 */
export const logError = (message: string, error?: any): void => {
  if (Capacitor.isNativePlatform()) {
    // Format khusus untuk Android Logcat
    console.error(`${TAG}:ERROR: ${message}`);
    if (error) {
      console.error(`${TAG}:ERROR_DATA: ${JSON.stringify(error)}`);
    }
  } else {
    // Format biasa untuk web
    console.error(`[ERROR] ${message}`, error || '');
  }
};

/**
 * Log warning dengan tag yang konsisten untuk Logcat
 */
export const logWarning = (message: string, data?: any): void => {
  if (Capacitor.isNativePlatform()) {
    // Format khusus untuk Android Logcat
    console.warn(`${TAG}:WARN: ${message}`);
    if (data) {
      console.warn(`${TAG}:WARN_DATA: ${JSON.stringify(data)}`);
    }
  } else {
    // Format biasa untuk web
    console.warn(`[WARN] ${message}`, data || '');
  }
};
