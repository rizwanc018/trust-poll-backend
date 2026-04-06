https://www.sammeechward.com/deploying-full-stack-js-to-aws-ec2

# backend.trustpoll.live |
-------------------------

- Install node
- Install redis

# Create env
- `sudo cat /etc/trustpoll.env`
- `sudo chmod 600 /etc/trustpoll.env`


# Create systemd file

- `sudo nano /etc/systemd/system/trustpoll.service`

```
[Unit]
Description=TrustPoll Backend
After=network.target multi-user.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/trust-poll-backend
ExecStart=/home/ubuntu/.nvm/versions/node/v22.21.0/bin/node dist/index.js

# --- Restart policy ---
Restart=always
RestartSec=10

# --- Environment ---
Environment=NODE_ENV=production
EnvironmentFile=/etc/trustpoll.env

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
----------------------------------------
### Deployment

- `sudo systemctl daemon-reload`
- `sudo systemctl enable trustpoll`
- `sudo systemctl start trustpoll`
- `sudo systemctl status trustpoll`
- `sudo systemctl stop trustpoll`

- `sudo systemctl restart trustpoll`

//////////////////////////////////////////////////////////////////

# Logs

- `sudo journalctl -u trustpoll`
- `sudo journalctl -fu trustpoll`

- `sudo journalctl -u trustpoll -n 50 --no-pager`

///////////////////////////////////////////////////
# Caddy

- Install caddy

- `sudo nano /etc/caddy/Caddyfile`

- `sudo systemctl start caddy`
- `sudo systemctl restart caddy`