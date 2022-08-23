# Redis PHP Mock [![Build Status](https://github.com/BedrockStreaming/RedisMock/actions/workflows/ci.yml/badge.svg)](https://github.com/BedrockStreaming/RedisMock/actions/workflows/ci.yml) [![Total Downloads](https://poser.pugx.org/m6web/redis-mock/downloads.svg)](https://packagist.org/packages/m6web/redis-mock)

PHP 7.1 library providing a Redis PHP mock for your tests.

**Work for now only with predis**

## Installation

```bash
$ composer require --dev m6web/redis-mock
```

## Functions

It currently mocks these Redis commands :

Redis command                                    | Description
-------------------------------------------------|------------
**DBSIZE**                                       | Returns the number of keys in the selected database
**DEL** *key* *[key ...]*                        | Deletes one or more keys
**DECR** *key*                                   | Decrements the integer value of a key by one
**DECRBY** *key* *decrement*                     | Decrements the integer value of a key by `decrement` value
**DECRBYFLOAT** *key* *decrement*                | Decrements the float value of a key by `decrement` value
**EXISTS** *key*                                 | Determines if a key exists
**EXPIRE** *key* *seconds*                       | Sets a key's time to live in seconds
**FLUSHDB**                                      | Flushes the database
**GET** *key*                                    | Gets the value of a key
**HDEL** *key* *array\<fields\>*                 | Delete hash fields
**HEXISTS** *key* *field*                        | Determines if a hash field exists
**HMGET** *key* *array\<field\>*                 | Gets the values of multiple hash fields
**HGET** *key* *field*                           | Gets the value of a hash field
**HGETALL** *key*                                | Gets all the fields and values in a hash
**HKEYS** *key*                                  | Gets all the fields in a hash
**HLEN** *key*                                   | Gets the number of fields in a hash
**HMSET** *key* *array\<field, value\>*          | Sets each value in the corresponding field
**HSET** *key* *field* *value*                   | Sets the string value of a hash field
**HSETNX** *key* *field* *value*                 | Sets field in the hash stored at key to value, only if field does not yet exist
**HINCRBY** *key* *field* *increment*            | Increments the integer stored at `field` in the hash stored at `key` by `increment`.
**INCR** *key*                                   | Increments the integer value of a key by one
**INCRBY** *key* *increment*                     | Increments the integer value of a key by `increment` value
**INCRBYFLOAT** *key* *increment*                | Increments the float value of a key by `increment` value
**KEYS** *pattern*                               | Finds all keys matching the given pattern
**LINDEX** *key* *index*                         | Returns the element at index *index* in the list stored at *key*
**LLEN** *key*                                   | Returns the length of the list stored at *key*
**LPUSH** *key* *value* *[value ...]*            | Pushs values at the head of a list
**LPOP** *key*                                   | Pops values at the head of a list
**LREM** *key* *value* *count*                   | Removes `count` instances of `value` from the head of a list (follows the [`predis` parameters order](https://github.com/phpredis/phpredis#lrem-lremove))
**LTRIM** *key* *start* *stop*                   | Removes the values of the `key` list which are outside the range `start`...`stop`
**LRANGE** *key* *start* *stop*                  | Gets a range of elements from a list
**MGET** *array\<field\>*                        | Gets the values of multiple keys
**MSET** *array\<field, value\>*                 | Sets the string values of multiple keys
**QUIT**                                         | Quit the REDIS
**RPUSH** *key* *value*                          | Pushs values at the tail of a list
**RPOP** *key*                                   | Pops values at the tail of a list
**SCAN**                                         | Iterates the set of keys in the currently selected Redis database.
**SET** *key* *value*                            | Sets the string value of a key
**SETEX** *key* *seconds* *value*                | Sets the value and expiration of a key
**SETNX** *key* *value*                          | Sets key to hold value if key does not exist
**SADD** *key* *member* *[member ...]*           | Adds one or more members to a set
**SDIFF** *key* *key* *[key ...]*                | Returns the members of the set resulting from the difference between the first set and all the successive sets.
**SISMEMBER** *key* *member*                     | Determines if a member is in a set
**SMEMBERS** *key*                               | Gets all the members in a set
**SUNION** *key* *[key ...]*                     | Returns the members of the set resulting from the union of all the given sets.
**SINTER** *key* *[key ...]*                     | Returns the members of the set resulting from the intersection of all the given sets.
**SCARD** *key*                                  | Get cardinality of set (count of members)
**SREM** *key* *member* *[member ...]*           | Removes one or more members from a set
**TTL** *key*                                    | Gets the time to live for a key
**TYPE** *key*                                   | Returns the string representation of the type of the value stored at key.
**ZADD** *key* *score* *member*                  | Adds one member to a sorted set, or update its score if it already exists
**ZINCRBY** *key* *increment* *member*           | Increments the score of *member* in the sorted set stored at *key* by *increment*
**ZCARD** *key*                                  | Returns the sorted set cardinality (number of elements) of the sorted set stored at *key*
**ZRANGE** *key* *start* *stop* *[withscores]*   | Returns the specified range of members in a sorted set
**ZRANGEBYSCORE** *key* *min* *max* *options*    | Returns a range of members in a sorted set, by score
**ZRANK** *key* *member*                         | Returns the rank of *member* in the sorted set stored at *key*, with the scores ordered from low to high
**ZREVRANK** *key* *member*                      | Returns the rank of *member* in the sorted set stored at *key*, with the scores ordered from high to low
**ZREM** *key* *member*                          | Removes one membner from a sorted set
**ZREMRANGEBYSCORE** *key* *min* *max*           | Removes all members in a sorted set within the given scores
**ZREVRANGE** *key* *start* *stop* *[withscores]*| Returns the specified range of members in a sorted set, with scores ordered from high to low
**ZREVRANGEBYSCORE** *key* *min* *max* *options* | Returns a range of members in a sorted set, by score, with scores ordered from high to low
**ZSCORE** *key* *member*                        | Returns the score of *member* in the sorted set at *key*


It mocks **MULTI**, **DISCARD** and **EXEC** commands but without any transaction behaviors, they just make the interface fluent and return each command results.
**PIPELINE** and **EXECUTE** pseudo commands (client pipelining) are also mocked.
**EVAL** and **EVALSHA** are just stubs—they won't execute anything  

## Usage

RedisMock library provides a factory able to build a mocked class of your Redis library that can be directly injected in your application :

```php
$factory          = new \M6Web\Component\RedisMock\RedisMockFactory();
$myRedisMockClass = $factory->getAdapterClass('My\Redis\Library');
$myRedisMock      = new $myRedisMockClass($myParameters);
```

In a simpler way, if you don't need to instanciate the mocked class with custom parameters (e.g. to easier inject the mock using Symfony config file), you can use `getAdapter` instead of `getAdapterClass` to directly create the adapter :

```php
$factory     = new \M6Web\Component\RedisMock\RedisMockFactory();
$myRedisMock = $factory->getAdapter('My\Redis\Library');
```

**WARNING !**

  * *RedisMock doesn't implement all Redis features and commands. The mock can have undesired behavior if your parent class uses unsupported features.*
  * *Storage is static and therefore shared by all instances.*

*Note : the factory will throw an exception by default if your parent class implements unsupported commands. If you want even so partially use the mock, you can specify the second parameter when you build it `$factory->getAdapter('My\Redis\Library', true)`. The exception will then thrown only when the command is called.*

### Static storage & Multiple servers
The storage in the RedisMock class is organized by named areas. The default area's name is the empty string `''` but you can
specify an alternate area name when calling the factory's `getAdapter` method.

````php
getAdapter($classToExtend, $failOnlyAtRuntime = false, $ignoreConstructor = true, $storage = '')
````

 This enables the mocking of several remote Redis servers, each one with its own storage area.

 However, one same area remains statically shared across all the instances bound to it.

## Tests

The development environment is provided by Vagrant and the [Xotelia box](https://github.com/Xotelia/VagrantBox).

```shell
$ cp Vagrantfile.dist Vagrantfile
$ vagrant up
$ vagrant ssh
```

```shell
$ cd /vagrant
$ composer install
$ ./vendor/bin/atoum
```

## Credits

Developped by the [Cytron Team](http://cytron.fr/) of [M6 Web](http://tech.m6web.fr/).  
Tested with [atoum](http://atoum.org).  

## License

RedisMock is licensed under the [MIT license](LICENSE).

