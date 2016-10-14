<?php
namespace JmesPath;

/**
 * Returns data from the input array that matches a JMESPath expression.
 *
 * @param string $expression Expression to search.
 * @param mixed  $data       Data to search.
 *
 * @return mixed|null
 */
function search($expression, $data)
{
    return Env::search($expression, $data);
}
