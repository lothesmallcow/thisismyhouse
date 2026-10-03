#!/usr/bin/env bash
# One-time VPS setup, Ubuntu 24.04. Run as root FROM INSIDE THE CLONE:
#   bash /home/edgelab/<repo>/<edgelab dir>/deploy/setup_vps.sh
# Assumes the 'edgelab' user exists and the repo is cloned (see docs/RUNBOOK.md step 6).
set -euo pipefail
U=edgelab
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOME_DIR=/home/$U

echo "== system packages, firewall, automatic security updates"
apt-get update -q
DEBIAN_FRONTEND=noninteractive apt-get install -y -q python3 python3-venv python3-pip git sqlite3 ufw \
  unattended-upgrades fail2ban chrony
timedatectl set-timezone UTC          # store UTC; schedules carry America/New_York explicitly
ufw default deny incoming && ufw allow OpenSSH && ufw --force enable
dpkg-reconfigure -f noninteractive unattended-upgrades
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/; s/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl reload ssh 2>/dev/null || systemctl reload sshd

echo "== python env"
sudo -u $U mkdir -p $HOME_DIR/data
sudo -u $U python3 -m venv $APP_DIR/.venv
sudo -u $U $APP_DIR/.venv/bin/pip install -q --upgrade pip
sudo -u $U $APP_DIR/.venv/bin/pip install -q -r $APP_DIR/requirements.txt

if [ ! -f $APP_DIR/.env ]; then
  sudo -u $U cp $APP_DIR/.env.example $APP_DIR/.env
  sed -i "s|^EDGELAB_DATA_DIR=.*|EDGELAB_DATA_DIR=$HOME_DIR/data|" $APP_DIR/.env
  TOPIC=$(python3 -c "import secrets;print('edgelab-'+secrets.token_hex(12))")
  sed -i "s|^EDGELAB_NTFY_TOPIC=.*|EDGELAB_NTFY_TOPIC=$TOPIC|" $APP_DIR/.env
  chown $U:$U $APP_DIR/.env && chmod 600 $APP_DIR/.env
fi
echo ">>> Your ntfy topic (subscribe to it in the ntfy phone app): $(grep EDGELAB_NTFY_TOPIC $APP_DIR/.env | cut -d= -f2)"

echo "== tests (must pass before anything is scheduled)"
sudo -u $U bash -c "cd $APP_DIR && .venv/bin/python -m pytest -q tests"
sudo -u $U $APP_DIR/deploy/run.sh init

echo "== systemd timers (installed, not started)"
for f in $APP_DIR/deploy/systemd/*.service $APP_DIR/deploy/systemd/*.timer; do
  sed "s|__APP_DIR__|$APP_DIR|g" "$f" > /etc/systemd/system/$(basename "$f")
done
systemctl daemon-reload
echo
echo "NEXT: nano $APP_DIR/.env   (fill ALPACA keys + EDGELAB_HC_URL)"
echo "THEN: sudo -u $U $APP_DIR/deploy/run.sh smoke"
