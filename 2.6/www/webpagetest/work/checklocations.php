<?php
chdir('..');
include 'common.inc';

// check and see if all of the locations have checked in within the last 30 minutes

header('Content-type: text/plain');
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

$locations = parse_ini_file('./settings/locations.ini', true);
BuildLocations($locations);

$settings = parse_ini_file('./settings/settings.ini', true);

$files = scandir('./tmp');
foreach( $files as $file )
{
    if(is_file("./tmp/$file"))
    {
        $parts = pathinfo($file);
        if( !strcasecmp( $parts['extension'], 'tm') )
        {
            $loc = basename($file, ".tm");;
            $fileName = "./tmp/$file";
            
            $updated = filemtime($fileName);
            $now = time();
            $elapsed = 0;
            if( $now > $updated )
                $elapsed = $now - $updated;
            $minutes = (int)($elapsed / 60);
            
            // if it has been over 3 days, stop sending alerts
            if( $minutes < 4320 && $minutes > 60 && array_key_exists($loc, $locations) && !$locations[$loc]['hidden'])
            {
                // if it has been over 60 minutes, send out a notification    
                // figure out who to notify
                $to = $settings['settings']['notify'];
                if( $locations[$loc]['notify'] )
                {
                    if( $to )
                        $to .= ',';
                    $to .= $locations[$loc]['notify'];
                }
                
                if( $to )
                {
                    $subject = "$loc WebPagetest ALERT";
                    $body = "The $loc location has not checked for new jobs in $minutes minutes.";

                    // send the e-mail through an SMTP server?
                    if (array_key_exists('mailserver', $settings))
                    {
                        require_once "Mail.php";
                        $mailServerSettings = $settings['mailserver'];
                        $mailInit = array ();
                        if (array_key_exists('host', $mailServerSettings))
                            $mailInit['host'] = $mailServerSettings['hos t'];
                        if (array_key_exists('port', $mailServerSettings))
                            $mailInit['port'] = $mailServerSettings['po rt'];
                        if (array_key_exists('useAuth', $mailServerSettings) && $mailServerSettings['useAuth'])
                        {
                            $mailInit['auth'] = true;
                            $mailInit['username'] = $mailServerSettings[ 'username'];
                            $mailInit['password'] = $mailServerSettings['password'];
                        }
                        $smtp = Mail::factory('smtp', $mailInit);
                        $headers = array ('From' => $mailServerSettings['from'], 'To' => $to, 'Subject' => $subject);
                        $mail = $smtp->send($to, $headers, $body);
                    }
                    else
                        mail($to, $subject, $body);
                }
            }
            
            echo "$loc: $elapsed sec\r\n";
        }
    }
}
?>
