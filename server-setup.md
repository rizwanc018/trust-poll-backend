https://www.sammeechward.com/deploying-full-stack-js-to-aws-ec2

# backend.trustpoll.live |

---

- Install node
  `curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -`
      <!-- `curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -` -->

    `sudo apt-get install -y nodejs`
    `node -v`

- Install redis
  `sudo apt install redis-server`
  `redis-cli ping`

Redis will start automatically, and it should restart at boot time. If Redis doesn't start across reboots, you may need to manually enable it:

- `sudo systemctl enable redis-server`
- `sudo systemctl start redis-server`

# Create env

- `sudo nano /etc/trust-poll-backend.env`
- `sudo cat /etc/trust-poll-backend.env`
- `sudo chmod 600 /etc/trust-poll-backend.env`
- `sudo chown ubuntu:ubuntu /etc/trust-poll-backend.env`

# Create systemd file

- `sudo nano /etc/systemd/system/trust-poll-backend.service`

```
[Unit]
Description=TrustPoll Backend
After=network.target multi-user.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/trust-poll-backend
ExecStart=/usr/bin/node dist/index.js

# --- Restart policy ---
Restart=always
RestartSec=10

# --- Environment ---
Environment=NODE_ENV=production
EnvironmentFile=/etc/trust-poll-backend.env

# --- Logging (view with journalctl -u trustpoll) ---
StandardOutput=journal
StandardError=journal
SyslogIdentifier=trustpoll

# --- Graceful shutdown handling ---
KillSignal=SIGINT
TimeoutStopSec=10
SendSIGKILL=no

[Install]
WantedBy=multi-user.target

```

---

### Deployment

- `sudo systemctl daemon-reload`

- `sudo systemctl enable trust-poll-backend`
- `sudo systemctl start trust-poll-backend`
- `sudo systemctl status trust-poll-backend`

- `sudo systemctl stop trust-poll-backend`
- `sudo systemctl restart trust-poll-backend`

//////////////////////////////////////////////////////////////////

# Logs

- `sudo journalctl -u trust-poll-backend`
- `sudo journalctl -fu trust-poll-backend`

- `sudo journalctl -u trust-poll-backend -n 50 --no-pager`

///////////////////////////////////////////////////

# Caddy

- Install caddy
  [Caddy docs](https://caddyserver.com/docs/install)

- `sudo nano /etc/caddy/Caddyfile`

```
# uncommented line is always the address of your site.
#
# To use your own domain name (with automatic HTTPS), first make
# sure your domain's A/AAAA DNS records are properly pointed to
# this machine's public IP, then replace ":80" below with your
# domain name.

:80 {
        # Set this path to your site's directory.
#       root * /usr/share/caddy

        # Enable the static file server.
#       file_server

        # Another common task is to set up a reverse proxy:
          reverse_proxy localhost:8080

        # Or serve a PHP site through php-fpm:
        # php_fastcgi localhost:9000
}

# Refer to the Caddy docs for more information:
# https://caddyserver.com/docs/caddyfile
```

- `sudo systemctl start caddy`
- `sudo systemctl restart caddy`
