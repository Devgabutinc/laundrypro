// Empty module to replace Capacitor plugins in web builds
// This file provides dummy implementations of Capacitor plugins for web builds

// Default export
export default {
  // Common methods
  initialize: async () => console.log('Capacitor plugin shim: initialize called'),
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => {},
  
  // Browser
  open: async () => console.log('Capacitor plugin shim: Browser.open called'),
  close: async () => console.log('Capacitor plugin shim: Browser.close called'),
  
  // App
  exitApp: () => console.log('Capacitor plugin shim: App.exitApp called'),
  
  // GoogleAuth
  signIn: async () => {
    console.log('Capacitor plugin shim: GoogleAuth.signIn called');
    throw new Error('Google Auth not available in web version');
  },
  
  // Push Notifications
  register: async () => console.log('Capacitor plugin shim: PushNotifications.register called'),
  
  // Toast
  show: async () => console.log('Capacitor plugin shim: Toast.show called'),
  
  // Share
  share: async () => console.log('Capacitor plugin shim: Share.share called'),
  
  // Filesystem
  readFile: async () => console.log('Capacitor plugin shim: Filesystem.readFile called'),
  writeFile: async () => console.log('Capacitor plugin shim: Filesystem.writeFile called'),
  
  // Local Notifications
  schedule: async () => console.log('Capacitor plugin shim: LocalNotifications.schedule called'),
};

// Named exports for various Capacitor plugins
export const GoogleAuth = {
  initialize: async () => console.log('Capacitor plugin shim: GoogleAuth.initialize called'),
  signIn: async () => {
    console.log('Capacitor plugin shim: GoogleAuth.signIn called');
    throw new Error('Google Auth not available in web version');
  },
  refresh: async () => console.log('Capacitor plugin shim: GoogleAuth.refresh called'),
  signOut: async () => console.log('Capacitor plugin shim: GoogleAuth.signOut called'),
};

export const Browser = {
  open: async () => console.log('Capacitor plugin shim: Browser.open called'),
  close: async () => console.log('Capacitor plugin shim: Browser.close called'),
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => {},
};

export const App = {
  exitApp: () => console.log('Capacitor plugin shim: App.exitApp called'),
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => {},
};

export const Capacitor = {
  isNativePlatform: () => false,
  getPlatform: () => 'web',
};

export const PushNotifications = {
  register: async () => console.log('Capacitor plugin shim: PushNotifications.register called'),
  addListener: () => ({ remove: () => {} }),
};

export const Toast = {
  show: async () => console.log('Capacitor plugin shim: Toast.show called'),
};

export const Share = {
  share: async () => console.log('Capacitor plugin shim: Share.share called'),
};

export const Filesystem = {
  readFile: async () => console.log('Capacitor plugin shim: Filesystem.readFile called'),
  writeFile: async () => console.log('Capacitor plugin shim: Filesystem.writeFile called'),
};

export const LocalNotifications = {
  schedule: async () => console.log('Capacitor plugin shim: LocalNotifications.schedule called'),
  addListener: () => ({ remove: () => {} }),
};
