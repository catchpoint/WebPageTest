<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
<meta name="keywords" content="Webpagetest, Performance, Optimization, Pagetest, Page Design">
<meta name="description" content="Speed up the performance of your web pages with an automated analysis">
<meta name="author" content="Patrick Meenan">
<meta http-equiv="X-UA-Compatible" content="IE=8"> 

<link rel="shortcut icon" href="/images/favicon.ico" type="image/vnd.microsoft.icon">
<link rel="icon" href="/images/favicon.png" type="image/png">
<link rel="stylesheet" href="<?php echo $GLOBALS['cdnPath']; ?>/pagestyle.css?v=<?php echo VER_CSS;?>" type="text/css">

<?php 
    // switch to the private install logo if we're not running on webpagetest
    $privateInstall = true;
    if( stristr($_SERVER['HTTP_HOST'] , '.webpagetest.org') !== false )
        $privateInstall = false;

    echo '<style type="text/css">';
    $blkLogo = false;
    $color = html2rgb($_REQUEST['color']);
    if( $color )
    {
        echo "body {background-color: #{$_REQUEST['color']};}";
        $max = max($color[0], $color[1], $color[2]);
        if( $max >= 192 )
            $blkLogo = true;
    }
            
    if( $privateInstall )
    {
        if( $blkLogo )
            echo ".logo a {background-image: url({$GLOBALS['cdnPath']}/images/logo_private_blk.png);}";
        else
            echo ".logo a {background-image: url({$GLOBALS['cdnPath']}/images/logo_private.png);}";
    }
    elseif( $blkLogo )
    {
        echo ".logo a {background-image: url({$GLOBALS['cdnPath']}/images/logo_blk.png);}";
    }
    echo '</style>';

    // include the analytics code if it is appropriate
    if( !$noanalytics )
        include('analytics.inc'); 

        
function html2rgb($color)
{
    if ($color[0] == '#')
        $color = substr($color, 1);

    if (strlen($color) == 6)
        list($r, $g, $b) = array($color[0].$color[1],
                                 $color[2].$color[3],
                                 $color[4].$color[5]);
    elseif (strlen($color) == 3)
        list($r, $g, $b) = array($color[0].$color[0], $color[1].$color[1], $color[2].$color[2]);
    else
        return false;

    $r = hexdec($r); $g = hexdec($g); $b = hexdec($b);

    return array($r, $g, $b);
}
?>
