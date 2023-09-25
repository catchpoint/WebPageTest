FROM ikaraszi/composer:php-7.4 as webpagetest_base

COPY composer.* /dependencies/
WORKDIR /dependencies
RUN composer update

FROM php:7.4-apache-bullseye as production

# this shouldn't be needed RUN chmod o+r /etc/resolv.conf

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -q -y --allow-unauthenticated \
    imagemagick \
    libjpeg-progs \
    exiftool \
    unzip \
    wget \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libcurl4-openssl-dev \
    python3 \
    python3-pip \
    cron \
    beanstalkd \
    supervisor && \
    DEBIAN_FRONTEND=noninteractive apt-get install -q -y --allow-downgrades --allow-change-held-packages \
    ffmpeg && \
    apt-get clean && \
    apt-get autoclean

RUN pip install pillow

RUN apt-get install libzip-dev -y

RUN docker-php-ext-configure gd --with-freetype=/usr/include/ --with-jpeg=/usr/include/
RUN     docker-php-ext-install gd
RUN     docker-php-ext-install zip
RUN     docker-php-ext-install curl
RUN     a2enmod expires headers rewrite

RUN apt-get install -y libmagickwand-6.q16-dev --no-install-recommends && \
    ln -s /usr/lib/x86_64-linux-gnu/ImageMagick-6.8.9/bin-Q16/MagickWand-config /usr/bin && \
    pecl install imagick && \
    echo "extension=imagick.so" > /usr/local/etc/php/conf.d/ext-imagick.ini

# create unprivileged user
RUN adduser php && usermod -a -G www-data php

COPY www /var/www/webpagetest/www
COPY  --from=webpagetest_base /dependencies/vendor /var/www/webpagetest/vendor

RUN chown -R www-data:www-data /var/www/ && chmod -R 777 /var/www/ && \
    cd /var/www/webpagetest/www && \
    chmod 0777 dat && \
    chmod 0777 -R work && \
    chmod 0777 logs && \
    mkdir -p -m 777 results && \
    \
    cd /var/www/webpagetest/www/settings && \
    mv settings.ini.sample settings.ini && \
    mv connectivity.ini.sample connectivity.ini && \
    \
    mkdir -p /var/log/supervisor -m 777 && chown php:php /var/log/supervisor && \
    mkdir -p /var/run/supervisor -m 777 && chown php:php /var/run/supervisor && \
    mkdir -p -m 777 /var/run/apache2/ && chown php:php /var/run/supervisor && \
    mkdir -p -m 777 /var/run/cron/ && chown php:php /var/run/cron && \
    touch /var/run/crond.pid && chown php:php /var/run/crond.pid && chmod 0774 /var/run/crond.pid && \
    chmod gu+s /usr/sbin/cron  && \
    mkdir -p /scripts

COPY docker/server/config/locations.ini /var/www/webpagetest/www/settings/locations.ini
COPY docker/server/config/php.ini /usr/local/etc/php/

RUN pear config-set php_ini /usr/local/etc/php/php.ini

COPY docker/local/server/config/apache2.conf /etc/apache2/apache2.conf
COPY docker/server/config/crontab /etc/crontab

# config supervisor to run apache, cron, beanstalkd, ec2init
COPY docker/server/config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/server/config/supervisord/supervisord_apache.conf /etc/supervisor/conf.d/supervisord_apache.conf
COPY docker/server/config/supervisord/supervisord_cron.conf /etc/supervisor/conf.d/supervisord_cron.conf
COPY docker/server/config/supervisord/supervisord_beanstalkd.conf /etc/supervisor/conf.d/supervisord_beanstalkd.conf
COPY docker/server/config/supervisord/supervisord_ec2init.conf /etc/supervisor/conf.d/supervisord_ec2init.conf

# copy WPT scripts, set executable and create crontab
COPY docker/server/scripts/ /scripts/
RUN chmod 755 /scripts/* && \
    crontab /etc/crontab

VOLUME /var/www/webpagetest/vendor/settings
VOLUME /var/www/webpagetest/vendor/results
VOLUME /var/www/webpagetest/vendor/logs

EXPOSE 80 443

USER php
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

FROM production as debug

USER root
RUN pecl install xdebug-3.1.6 && docker-php-ext-enable xdebug
RUN chmod -R 777 /var/log

EXPOSE 9000

USER php
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

FROM production