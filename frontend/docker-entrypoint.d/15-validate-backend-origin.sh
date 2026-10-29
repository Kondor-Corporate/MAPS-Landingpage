#!/bin/sh
set -eu

invalid_origin() {
  echo >&2 "BACKEND_ORIGIN debe ser un origen HTTPS sin path, query, fragment ni barra final."
  exit 1
}

[ -n "${BACKEND_ORIGIN:-}" ] || invalid_origin

case "$BACKEND_ORIGIN" in
  https://*) ;;
  *) invalid_origin ;;
esac

authority=${BACKEND_ORIGIN#https://}
case "$authority" in
  ""|*[!A-Za-z0-9.:-]*|.*|*.|:*|*:|*:*:*) invalid_origin ;;
esac

host=${authority%%:*}
port=${authority#*:}
if [ "$host" != "$authority" ]; then
  case "$port" in
    ""|*[!0-9]*) invalid_origin ;;
  esac
fi
