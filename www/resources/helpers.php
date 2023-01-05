<?php

function md($in)
{
    return Illuminate\Support\Str::of($in)->markdown();
}
