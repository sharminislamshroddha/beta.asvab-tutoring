module.exports = {
  apps: [
    {
      name: "asvab-tutoring-beta",
      script: ".beta-runtime/server.js",
      cwd: "/home/master/applications/nwnmfyndne/public_html",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,
      time: true
    }
  ]
};