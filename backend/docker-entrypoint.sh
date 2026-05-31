#!/bin/sh
set -e

mkdir -p /var/www/html/public/uploads/products
chown -R www-data:www-data /var/www/html/public/uploads
chmod -R 775 /var/www/html/public/uploads

exec "$@"
