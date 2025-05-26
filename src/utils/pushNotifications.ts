import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';

export const updateFcmTokenToProfile = async (token: string) => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return;
    }
    const userId = userData.user.id;
    // Use type assertion to handle fcm_token property
    const { error } = await supabase
      .from('profiles')
      .update({ fcm_token: token } as any)
      .eq('id', userId);
    if (error) {
      // Failed to update FCM token
    }
  } catch (err) {
    // Error saving token to database
  }
};

// Minta izin notifikasi
export const requestPushPermission = async () => {
  const { receive } = await PushNotifications.requestPermissions();
  if (receive === 'granted') {
    // Register ke FCM
    await PushNotifications.register();
  }
};

// Handle token (simpan ke database dan localStorage)
PushNotifications.addListener('registration', async (token) => {
  try {
    localStorage.setItem('fcm_token', token.value);
    await updateFcmTokenToProfile(token.value);
  } catch (err) {
    // Error saving token to database
  }
});

// Handle notifikasi masuk
PushNotifications.addListener('pushNotificationReceived', async (notification) => {
  // Tampilkan notifikasi lokal jika app foreground
  await LocalNotifications.schedule({
    notifications: [
      {
        title: notification.title || 'Notifikasi',
        body: notification.body || '',
        id: Date.now(),
        extra: notification.data,
      },
    ],
  });
});

// Handle klik notifikasi
PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
  // TODO: Navigate ke halaman tertentu
});