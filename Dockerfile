FROM php:5.6-apache
MAINTAINER iteratec WPT Team <wpt@iteratec.de>

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
    python \
    python-pillow \
    cron \
    beanstalkd \
    supervisor && \
    \
    DEBIAN_FRONTEND=noninteractive apt-get install -q -y --allow-downgrades --allow-change-held-packages \
    ffmpeg && \
    apt-get clean && \
    apt-get autoclean

RUN docker-php-ext-configure gd --with-freetype-dir=/usr/include/ --with-jpeg-dir=/usr/include/ && \
    docker-php-ext-install gd && \
    docker-php-ext-install zip && \
    docker-php-ext-install curl && \
    a2enmod expires headers rewrite

RUN apt-get install -y libmagickwand-6.q16-dev --no-install-recommends && \
    ln -s /usr/lib/x86_64-linux-gnu/ImageMagick-6.8.9/bin-Q16/MagickWand-config /usr/bin && \
    pecl install imagick && \
    echo "extension=imagick.so" > /usr/local/etc/php/conf.d/ext-imagick.ini

COPY www /var/www/html

RUN chown -R www-data:www-data /var/www/html && \
    cd /var/www/html && \
    chmod 0777 dat && \
    chmod 0777 -R work && \
    chmod 0777 logs && \
    mkdir -p results && \
    chmod 0777 -R results && \
    \
    cd /var/www/html/settings && \
    mv settings.ini.sample settings.ini && \
    mv connectivity.ini.sample connectivity.ini && \
    \
    mkdir -p /var/log/supervisor && \
    mkdir -p /scripts

COPY docker/server/config/locations.ini /var/www/html/settings/locations.ini
COPY docker/server/config/php.ini /usr/local/etc/php/
COPY docker/server/config/apache2.conf /etc/apache2/apache2.conf
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

VOLUME /var/www/html/settings
VOLUME /var/www/html/results
VOLUME /var/www/html/logs

EXPOSE 80 443

CMD ["/usr/bin/supervisord"]
