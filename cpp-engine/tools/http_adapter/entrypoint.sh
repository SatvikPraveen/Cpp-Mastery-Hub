#!/bin/sh
# `serve` (default) starts the HTTP adapter; anything else is passed to the CLI.
set -eu
if [ "${1:-serve}" = "serve" ]; then
    exec python3 /usr/local/bin/cppmastery-http
fi
exec /usr/local/bin/cppmastery "$@"
