import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export async function initializeNativePlugins(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#4F46E5' });
  } catch (e) {
    console.warn('StatusBar init failed:', e);
  }

  try {
    await SplashScreen.hide();
  } catch (e) {
    console.warn('SplashScreen hide failed:', e);
  }

  try {
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });
  } catch (e) {
    console.warn('BackButton listener failed:', e);
  }
}

export async function requestPushNotificationPermission(): Promise<string | null> {
  if (!isNativePlatform()) return null;

  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return null;

    await PushNotifications.register();

    return new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 10000);

      PushNotifications.addListener('registration', (token) => {
        clearTimeout(timeout);
        resolve(token.value);
      });

      PushNotifications.addListener('registrationError', () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  } catch (e) {
    console.warn('Push notification registration failed:', e);
    return null;
  }
}

export async function sendPushTokenToServer(token: string, apiBase: string): Promise<void> {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    if (!auth.accessToken) return;

    await fetch(`${apiBase}/api/auth/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`
      },
      body: JSON.stringify({ token, platform: Capacitor.getPlatform() })
    });
  } catch (e) {
    console.warn('Failed to send push token:', e);
  }
}
