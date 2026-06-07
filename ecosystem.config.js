module.exports = {
  apps: [
    {
      name: 'service-platform',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/service-platform',
      instances: 1,
      autorestart: true,
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
}
