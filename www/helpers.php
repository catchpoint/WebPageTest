<?php
function idx($array, $key, $default = null){
    if (array_key_exists($key, $array)) {
        return $array[$key];
    }
    return $default;
}