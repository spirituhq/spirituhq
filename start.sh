#!/bin/sh

# Railway fournit le port via $PORT. Si non défini, on garde 80.
if [ -n "$PORT" ]; then
  sed -i "s/listen 80;/listen ${PORT};/" /etc/nginx/conf.d/default.conf
fi

nginx -g 'daemon off;'