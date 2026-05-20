module.exports = {
  apps: [
    {
      name: "fuelsync",
      script: "dist/index.js",
      interpreter: "node",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Logs go to /var/log/pm2/fuelsync-*.log
      error_file: "/var/log/pm2/fuelsync-error.log",
      out_file: "/var/log/pm2/fuelsync-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
