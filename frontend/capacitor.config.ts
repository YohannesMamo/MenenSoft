import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.menen.oshs',
  appName: 'Menen OSHS',
  webDir: 'dist',
  server: {
    url: 'https://menen-oshs-app.pxxl.click',
    cleartext: false,
    androidScheme: 'https'
  },
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
