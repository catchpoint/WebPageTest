<?php
/**
 * Smarty plugin
 * @package Smarty
 * @subpackage PluginsModifier
 */

/**
 * Smarty replace modifier plugin
 * 
 * Type:     modifier<br>
 * Name:     replace<br>
 * Purpose:  simple search/replace
 * 
 * @link http://smarty.php.net/manual/en/language.modifier.replace.php replace (Smarty online manual)
 * @author Monte Ohrt <monte at ohrt dot com> 
 * @author Uwe Tews 
 * @param string $ 
 * @param string $ 
 * @param string $ 
 * @return string 
 */
function smarty_modifier_replace($string, $search, $replace)
{
    if (!function_exists('mb_str_replace')) {
        // simulate the missing PHP mb_str_replace function
        function mb_str_replace($needles, $replacements, $haystack)
        {
            $rep = (array)$replacements;
            foreach ((array)$needles as $key => $needle) {
                $replacement = $rep[$key];
                $needle_len = mb_strlen($needle);
                $replacement_len = mb_strlen($replacement);
                $pos = mb_strpos($haystack, $needle, 0);
                while ($pos !== false) {
                    $haystack = mb_substr($haystack, 0, $pos) . $replacement
                     . mb_substr($haystack, $pos + $needle_len);
                    $pos = mb_strpos($haystack, $needle, $pos + $replacement_len);
                } 
            } 
            return $haystack;
        } 
    } 
    if (function_exists('mb_substr')) {
        return mb_str_replace($search, $replace, $string);
    } else {
        return str_replace($search, $replace, $string);
    } 
} 

?>