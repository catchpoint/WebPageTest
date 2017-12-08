<?php 
if(isset($settings) && is_array($settings) && isset($settings['analytics']) && strlen($settings['analytics'])) 
{ 
?>
    <script type="text/javascript">
    var _gaq = _gaq || [];
    <?php
    echo "_gaq.push(['_setAccount', '{$settings['analytics']}']);\n";
    if( isset($gaTemplate) && strlen($gaTemplate) )
        echo "_gaq.push(['_setCustomVar', 1, 'Template', '$gaTemplate', 3]);\n";
    ?>
    _gaq.push(['_setSiteSpeedSampleRate', 100]);
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
