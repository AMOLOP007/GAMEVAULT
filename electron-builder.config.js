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

  directories: {
    output: 'D:/GAMEVAULT-dist',
    buildResources: 'apps/desktop/assets',
  },

  files: [
    // Desktop app (compiled)
    'apps/desktop/dist/**/*',
    'apps/desktop/assets/**/*',
    
    // API server (compiled)
    'apps/api/dist/**/*',
    
    // Web frontend (standalone build)
    'apps/web/.next/standalone/**/*',
    'apps/web/.next/static/**/*',
    'apps/web/public/**/*',
    
    // Prisma client and schema
    'database/schema.prisma',
    'node_modules/prisma-client-desktop/**/*',
    'node_modules/prisma-client-api/**/*',
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
    '!**/src/**',
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
    icon: 'apps/desktop/assets/icon.ico',
    // Sign the executable (requires certificate)
    certificateFile: 'gamevault-cert.pfx',
    certificatePassword: 'gamevault',
    signingHashAlgorithms: ['sha256'],
  },

  nsis: {
    oneClick: false,
    perMachine: true,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'apps/desktop/assets/icon.ico',
    uninstallerIcon: 'apps/desktop/assets/icon.ico',
    installerHeaderIcon: 'apps/desktop/assets/icon.ico',
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
  },
};
