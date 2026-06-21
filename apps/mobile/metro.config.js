const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { resolve: metroResolve } = require('metro-resolver');
const path = require('path');
const { METRO_PORT } = require('./constants/ports.cjs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const workspacePackagesRoot = path.resolve(monorepoRoot, 'packages');
const mobilePackageJson = path.join(projectRoot, 'package.json');

// Block build/cache dirs — avoid matching package internals like whatwg-fetch/dist/.
const BUILD_ARTIFACT_PATTERN =
  /(\\|\/)(\.next|\.turbo|coverage|\.git|\.expo)(\\|\/|$)|(\\|\/)(apps|packages)(\\|\/)[^\\/]+(\\|\/)dist(\\|\/|$)/;

const reactQueryEntry = require.resolve('@tanstack/react-query', { paths: [projectRoot] });

const SINGLETON_MODULES = new Set([
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
]);

const config = getDefaultConfig(projectRoot);

config.server = {
  ...config.server,
  port: METRO_PORT,
};

config.watchFolders = [workspacePackagesRoot];
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  BUILD_ARTIFACT_PATTERN,
];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

function resolveFromMobile(context, moduleName, platform) {
  return metroResolve(
    {
      ...context,
      originModulePath: mobilePackageJson,
      nodeModulesPaths: [
        path.resolve(projectRoot, 'node_modules'),
        path.resolve(monorepoRoot, 'node_modules'),
      ],
    },
    moduleName,
    platform,
  );
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@tanstack/react-query') {
    return { type: 'sourceFile', filePath: reactQueryEntry };
  }

  if (moduleName.startsWith('@tanstack/react-query/')) {
    return resolveFromMobile(context, moduleName, platform);
  }

  if (SINGLETON_MODULES.has(moduleName)) {
    return resolveFromMobile(context, moduleName, platform);
  }

  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    for (const ext of ['.ts', '.tsx']) {
      try {
        return metroResolve(context, moduleName.slice(0, -3) + ext, platform);
      } catch {
        // try next extension
      }
    }
  }

  return metroResolve(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
