import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'site.nutrition24.app',
  appName: '24nutrition',
  webDir: '../webapp/dist',
  server: {
    androidScheme: 'https',
    url: 'https://24nutrition.site/login',
    allowNavigation: ['24nutrition.site'],
  },
}

export default config
