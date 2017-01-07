FROM php:7.1-apache
MAINTAINER iteratec WPT Team <wpt@iteratec.de>

ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=3.0
ARG GITHUB_REPO=https://github.com/WPO-Foundation/webpagetest
    
LABEL org.label-schema.build-date=$BUILD_DATE \
          org.label-schema.name="WebPagetest" \
          org.label-schema.description="WebPagetest performance tool" \
          org.label-schema.url="http://www.webpagetest.org" \
          org.label-schema.vcs-ref=$VCS_REF \
          org.label-schema.vcs-url=$GITUB_REPO \
          org.label-schema.vendor="WPO Foundation" \
          org.label-schema.version=$VERSION \
          org.label-schema.schema-version="1.0"
          
RUN echo deb http://www.deb-multimedia.org jessie main non-free >> /etc/apt/sources.list.d/deb-multimedia.list && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -q -y --force-yes \
    deb-multimedia-keyring \
    imagemagick \
    libjpeg-progs \
    exiftool \
    unzip \
    wget \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng12-dev \
    libcurl4-openssl-dev \
    python \
    python-pillow \
    cron \
    supervisor && \
    \
    DEBIAN_FRONTEND=noninteractive apt-get install -q -y --force-yes\
    ffmpeg && \
    apt-get clean && \
    apt-get autoclean && \
    \
    docker-php-ext-configure gd --with-freetype-dir=/usr/include/ --with-jpeg-dir=/usr/include/ && \
    docker-php-ext-install gd && \
    docker-php-ext-install zip && \
    docker-php-ext-install curl && \
    a2enmod expires headers rewrite && \
    \
    DEBIAN_FRONTEND=noninteractive apt-get install -q -y libmagickwand-6.q16-dev --no-install-recommends && \
    apt-get clean -y && \
	apt-get --purge autoremove && \
	rm -f /var/lib/apt/lists/*_dists_* && \
    ln -s /usr/lib/x86_64-linux-gnu/ImageMagick-6.8.9/bin-Q16/MagickWand-config /usr/bin && \
    pecl install imagick && \
    echo "extension=imagick.so" > /usr/local/etc/php/conf.d/ext-imagick.ini && \
    \
    cd /tmp && \
    wget --progress=dot:mega -O WebPageTest.zip $GITHUB_REPO/releases/download/WebPageTest-${VERSION}/webpagetest_${VERSION}.zip && \
    unzip WebPageTest.zip 'www/*' && \
    mv www/* /var/www/html/  && \
    rm -fr /tmp/* /var/tmp/* && \
    \
    chown -R www-data:www-data /var/www/html && \
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

COPY server/config/locations.ini /var/www/html/settings/locations.ini
COPY server/config/php.ini /usr/local/etc/php/
COPY server/config/apache2.conf /etc/apache2/apache2.conf
COPY server/config/crontab /etc/crontab

# config supervisor to run apache AND cron
COPY server/config/supervisord.conf /etc/supervisord.conf
COPY server/config/supervisord/supervisord_apache.conf /etc/supervisor/conf.d/supervisord_apache.conf
COPY server/config/supervisord/supervisord_cron.conf /etc/supervisor/conf.d/supervisord_cron.conf

# copy script to run WPT cron scripts
COPY server/scripts/wpt_cron_call.sh /scripts/wpt_cron_call.sh
RUN chmod 755 /scripts/wpt_cron_call.sh && \
    crontab /etc/crontab

VOLUME /var/www/html/settings
VOLUME /var/www/html/results
VOLUME /var/www/html/logs

EXPOSE 80 443

CMD ["/usr/bin/supervisord","-c","/etc/supervisord.conf"]
