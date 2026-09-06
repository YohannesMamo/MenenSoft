import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.menen.oshs',
  appName: 'Menen OSHS',
  webDir: 'dist',
  // Bundled mode: the SPA is packed into the APK and loads from local assets.
  // The app's API layer resolves the reachable backend host at runtime
  // (Pxxl API -> Render API) for resilience. No server.url is used so the
  // UI always opens even if both app-front hosts are down.
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#4F46E5',
      showSpinner: true,
      spinnerColor: '#FFFFFF'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#4F46E5'
    }
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#F9FAFB'
  }
};

export default config;