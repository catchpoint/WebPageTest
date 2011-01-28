<?php
/**
*   Generate a unique Id
*/
function uniqueId()
{
    $id = NULL;
    
    // try locking the context file
    $filename = "./settings/uniqueId.dat";
    $file = fopen( $filename, "a+b",  false);
    if( $file )
    {
        $ok = false;
        $count = 0;
        while( !$ok &&  $count < 500 )
        {
            $count++;
            if( flock($file, LOCK_EX) )
                $ok = true;
            else
                usleep(10000);
        }

        if( $ok )
        {
            fseek($file, 0, SEEK_SET);
            $num = (int)fread($file, 100);
            $num++;
            
            // go back to the beginning of the file and write out the new value
            fseek($file, 0, SEEK_SET);
            ftruncate($file, 0);
            fwrite($file, $num);
            
            // convert the number to a base-32 string for shorter text
            $id = '';
            $digits = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
            while($num > 0)
            {
                $digitValue = $num % 32;
                $num = (int)($num / 32);
                $id .= $digits[$digitValue];
            }
            $id = strrev($id);
        }
        else
            $id = md5(uniqid(rand(), true));

        fclose($file);
    }
    
    return $id;
} 
?>
