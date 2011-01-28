<?php 
if($settings['analytics']) 
{ 
?>
    <script type="text/javascript">
    var _gaq = _gaq || [];
    <?php
    echo "_gaq.push(['_setAccount', '{$settings['analytics']}']);";
    ?>
    _gaq.push(['_trackPageview']);

    (function() {
    var ga = document.createElement('script');
    ga.src = ('https:' == document.location.protocol ?
        'https://ssl' : 'http://www') +
        '.google-analytics.com/ga.js';
    ga.setAttribute('async', 'true');
    document.documentElement.firstChild.appendChild(ga);
    })();
    </script>
<?php 
} 
?>
