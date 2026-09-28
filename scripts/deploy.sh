#!/usr/bin/env bash
# Uploadt dist/ naar TransIP webhosting via SFTP.
# Gebruik:  TRANSIP_HOST=... TRANSIP_USER=... TRANSIP_PASSWORD=... npm run deploy
# De gegevens vind je in het TransIP-controlepaneel bij je webhostingpakket (SFTP/SSH).
set -euo pipefail

: "${TRANSIP_HOST:?Zet TRANSIP_HOST (SFTP-server uit het TransIP-controlepaneel)}"
: "${TRANSIP_USER:?Zet TRANSIP_USER (SFTP-gebruikersnaam)}"
: "${TRANSIP_PASSWORD:?Zet TRANSIP_PASSWORD (SFTP-wachtwoord)}"
REMOTE_DIR="${TRANSIP_REMOTE_DIR:-www}"

command -v lftp >/dev/null || { echo "lftp is niet geïnstalleerd (sudo apt install lftp / brew install lftp)"; exit 1; }

npm test
node build.js

lftp -u "$TRANSIP_USER","$TRANSIP_PASSWORD" "sftp://$TRANSIP_HOST" <<LFTP
set sftp:auto-confirm yes
set net:max-retries 3
mirror --reverse --delete --verbose --parallel=4 dist/ $REMOTE_DIR/
bye
LFTP

echo "✓ Live gezet op $TRANSIP_HOST:$REMOTE_DIR"
