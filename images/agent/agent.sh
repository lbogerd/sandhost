#!/bin/sh
set -eu

trap 'echo "agent: received SIGTERM, shutting down"; exit 0' TERM INT

echo "agent: started on $(hostname)"
echo "agent: env keys: $(env | cut -d= -f1 | sort | tr '\n' ' ')"

i=0
while true; do
	i=$((i + 1))
	echo "agent: heartbeat ${i}"
	# Run sleep in the background so the TERM trap fires immediately
	# instead of after the sleep completes.
	sleep 5 &
	wait $!
done
