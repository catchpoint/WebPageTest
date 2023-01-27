<?php

function md($in)
{
    return Illuminate\Support\Str::of($in)->markdown();
}

function prettyKey($key)
{
    if (strtolower($key) === 'url') {
        return 'URL';
    }
    return Illuminate\Support\Str::headline($key);
}
