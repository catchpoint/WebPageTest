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
    libpython-dev \
    python \
    python-pip \
    python-pillow \
    python-numpy \
    python-scipy \
    python-argparse \
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
    pecl install "channel://pecl.php.net/apcu_bc-1.0.3" && \
    echo "extension=apc.so" > /usr/local/etc/php/conf.d/ext-apcu_bc.ini && \
    echo "extension=apcu.so" > /usr/local/etc/php/conf.d/ext-apcu_bc.ini && \
    echo "extension=apc.so" >> /usr/local/etc/php/conf.d/ext-apcu_bc.ini && \
    echo "apc.enabled=1" >> /usr/local/etc/php/conf.d/ext-apcu_bc.ini && \
    echo "apc.shm_size=256M" >> /usr/local/etc/php/conf.d/ext-apcu_bc.ini && \
    echo "apc.ttl=7200" >> /usr/local/etc/php/conf.d/ext-apcu_bc.ini && \
    echo "apc.gc_ttl=3600" >> /usr/local/etc/php/conf.d/ext-apcu_bc.ini && \
    echo "apc.entries_hint=4096" >> /usr/local/etc/php/conf.d/ext-apcu_bc.ini && \
    echo "apc.slam_defense=1" >> /usr/local/etc/php/conf.d/ext-apcu_bc.ini && \
    echo "apc.serializer=php" >> /usr/local/etc/php/conf.d/ext-apcu_bc.ini && \
    pip install pyssim && \
    \
    cd /tmp && \
    wget --progress=dot:mega -O WebPageTest.zip $GITHUB_REPO/releases/download/WebPageTest-${VERSION}/webpagetest_${VERSION}.zip && \
    unzip -q WebPageTest.zip 'www/*' && \
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
    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" && \
    php -r "if (hash_file('SHA384', 'composer-setup.php') === '55d6ead61b29c7bdee5cccfb50076874187bd9f21f65d8991d46ec5cc90518f447387fb9f76ebae1fbbacf329e583e30') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;" && \
    php composer-setup.php && \
    php -r "unlink('composer-setup.php');" && \
    mv composer.phar /usr/local/bin/composer && \
    rm -fr lib && \
    \
    cd /var/www/html/settings && \
    mv settings.ini.sample settings.ini && \
    mv connectivity.ini.sample connectivity.ini && \
    \
    mkdir -p /var/log/supervisor && \
    mkdir -p /scripts
COPY composer.json /var/www/html/
RUN COMPOSER_VENDOR_DIR=lib composer install
COPY config/locations.ini /var/www/html/settings/locations.ini
COPY config/php.ini /usr/local/etc/php/
COPY config/apache2.conf /etc/apache2/apache2.conf
COPY config/crontab /etc/crontab

# config supervisor to run apache AND cron
COPY config/supervisord.conf /etc/supervisord.conf
COPY config/supervisord/supervisord_apache.conf /etc/supervisor/conf.d/supervisord_apache.conf
COPY config/supervisord/supervisord_cron.conf /etc/supervisor/conf.d/supervisord_cron.conf

# copy script to run WPT cron scripts
COPY scripts/wpt_cron_call.sh /scripts/wpt_cron_call.sh
RUN chmod 755 /scripts/wpt_cron_call.sh && \
    crontab /etc/crontab

# tests
COPY tests/run.sh /var/www/html/tests/docker-test.sh
RUN cd /var/www/html/tests/ && \
    chmod +x docker-test.sh && \
    sleep 5 && \
    ./docker-test.sh

VOLUME /var/www/html/settings
VOLUME /var/www/html/results
VOLUME /var/www/html/logs

EXPOSE 80 443

ENTRYPOINT []

CMD ["/usr/bin/supervisord","-c","/etc/supervisord.conf"]
