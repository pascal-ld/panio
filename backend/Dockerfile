FROM php:8.3-apache

RUN apt-get update && apt-get install -y \
    git unzip libzip-dev libicu-dev \
    libpng-dev libjpeg62-turbo-dev libwebp-dev \
    && docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install pdo_mysql intl opcache gd \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

RUN echo "upload_max_filesize = 10M\npost_max_size = 12M" > /usr/local/etc/php/conf.d/uploads.ini

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

WORKDIR /var/www/html

COPY . .
RUN composer install --no-dev --optimize-autoloader --no-interaction

RUN mkdir -p public/uploads/products \
    && chown -R www-data:www-data var public/uploads

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["apache2-foreground"]

EXPOSE 80
