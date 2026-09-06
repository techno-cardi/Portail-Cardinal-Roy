const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 40000,
  expect: { timeout: 10000 },
  retries: 1,
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 }
      }
    },
    {
      name: 'desktop-firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 1000 }
      }
    },
    {
      name: 'desktop-webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 1000 }
      }
    },
    {
      name: 'mobile-chromium',
      grepInvert: /souris reste dessus/,
      use: {
        ...devices['Pixel 5']
      }
    },
    {
      name: 'mobile-webkit',
      grepInvert: /souris reste dessus/,
      use: {
        ...devices['iPhone 13']
      }
    }
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 15000
  }
});
