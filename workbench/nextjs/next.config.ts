import { withWorkflow } from '@workflow/next';
import type { NextConfig } from 'next';

const nextConfig = {
  transpilePackages: ['workflow', '@ekairos/dataset', '@ekairos/story'],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      workflow: require('path').resolve(__dirname, 'node_modules/workflow/dist'),
    }
    return config
  },
  workflows: {
    directories: [],
    libraries: ['@ekairos/story'],
  },
} satisfies NextConfig & Parameters<typeof withWorkflow>[0];

console.log(
  '[workbench] using @workflow/next from',
  require.resolve('@workflow/next'),
);

export default withWorkflow(nextConfig);

