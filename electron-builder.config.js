/**
 * GameVault — Electron Builder Configuration
 * 
 * Produces a single .exe NSIS installer for Windows.
 * Output: D:\GAMEVAULT-dist\
 * 
 * Code signing: To prevent Windows SmartScreen warnings, you need a
 * code signing certificate. Set CSC_LINK and CSC_KEY_PASSWORD env vars.
 * Without signing, users will see "Unknown Publisher" warnings.
 */

module.exports = {
  appId: 'com.gamevault.app',
  productName: 'GameVault',
  copyright: 'Copyright © 2026 GameVault',
  artifactName: 'GameVault-Setup-${version}.exe',
  electronVersion: "33.0.0",

  directories: {
    output: 'release',
    buildResources: 'apps/desktop/assets',
  },

  files: [
    // Desktop app (compiled)
    'apps/desktop/dist/**/*',
    'apps/desktop/assets/**/*',
    
    // Prisma client and schema for local SQLite
    'database/schema.prisma',
    'node_modules/prisma-client-desktop/**/*',
    'node_modules/.prisma/**/*',
    'node_modules/.prisma/**/*',

    // Shared packages
    'packages/**/*',
    
    // Root config
    'package.json',
    '.env.example',
    
    // Exclude everything else
    '!**/*.ts',
    '!**/*.tsx',
    '!**/*.map',
    '!**/node_modules/.cache/**',
    '!**/.turbo/**',
    '!**/coverage/**',
    '!**/*.log',
    // SECURITY: Exclude sensitive files from production builds
    '!**/.env',
    '!**/.env.*',
    '!**/tests/**',
    '!**/*.test.*',
    '!**/*.spec.*',
    '!**/.git/**',
    '!**/.github/**',
    
    // Size Optimization: Exclude non-Windows Prisma engines
    '!**/node_modules/@prisma/engines/*-darwin-*',
    '!**/node_modules/@prisma/engines/*-linux-*',
    '!**/node_modules/@prisma/engines/*-debian-*',
    '!**/node_modules/@prisma/engines/*-alpine-*',
    '!**/node_modules/@prisma/engines/*-rhel-*',
    '!**/node_modules/@prisma/engines/*-musl-*',
    '!**/node_modules/@prisma/engines/libquery_engine.so',
    '!**/node_modules/@prisma/engines/libquery_engine.dylib',
    '!**/node_modules/prisma/**',

    // Size Optimization: Exclude unnecessary dev artifacts and heavy web frameworks
    '!**/node_modules/**/{test,__tests__,tests,examples,example,docs,coverage}',
    '!**/node_modules/**/*.md',
    '!**/node_modules/**/*.d.ts',
    '!**/node_modules/next/**',
    '!**/node_modules/react/**',
    '!**/node_modules/react-dom/**',
    '!**/node_modules/tailwindcss/**',
    '!**/node_modules/typescript/**',
    '!**/node_modules/eslint/**',
    '!**/node_modules/@next/**',
    '!**/node_modules/@swc/**',
    '!**/node_modules/playwright/**',
    '!**/node_modules/puppeteer/**',
    '!**/apps/web/**',
    '!**/apps/api/**',
  ],

  // Compress the app archive
  asar: true,
  compression: 'maximum',

  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      }
    ],
    icon: 'apps/desktop/assets/icon.png',
  },

  nsis: {
    oneClick: false,
    perMachine: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'GameVault',
    // Preserve user data on upgrade
    deleteAppDataOnUninstall: false,
    differentialPackage: true,
  },

  // Exclude non-Windows Prisma engines
  extraResources: [
    {
      from: 'database/schema.prisma',
      to: 'prisma/schema.prisma',
    }
  ],

  // Auto-updater configuration
  publish: [
    {
      provider: 'github',
      owner: 'AMOLOP007',
      repo: 'GAMEVAULT',
      releaseType: 'release',
    }
  ],

  // Remove unnecessary files from package
  afterPack: async (context) => {
    const fs = require('fs');
    const path = require('path');
    const appDir = context.appOutDir;

    // Remove source maps
    const removePattern = (dir, pattern) => {
      try {
        const files = fs.readdirSync(dir, { recursive: true });
        for (const file of files) {
          const fullPath = path.join(dir, file);
          if (typeof file === 'string' && file.endsWith(pattern) && fs.statSync(fullPath).isFile()) {
            fs.unlinkSync(fullPath);
          }
        }
      } catch {}
    };

    removePattern(appDir, '.map');
    removePattern(appDir, '.ts');

    // Remove unnecessary locales (keep only en-US)
    const localesDir = path.join(appDir, 'locales');
    if (fs.existsSync(localesDir)) {
      const locales = fs.readdirSync(localesDir);
      for (const locale of locales) {
        if (locale !== 'en-US.pak') {
          fs.unlinkSync(path.join(localesDir, locale));
        }
      }
    }
  },
};
