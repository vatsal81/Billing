import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.billing.app',
  appName: 'Billing System',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
