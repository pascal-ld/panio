#!/bin/sh
set -e

mkdir -p /var/www/html/public/uploads/products
chown -R www-data:www-data /var/www/html/public/uploads
chmod -R 775 /var/www/html/public/uploads

mkdir -p /var/www/html/config/jwt
chown -R www-data:www-data /var/www/html/config/jwt
chmod 755 /var/www/html/config/jwt

exec "$@"
