<?php

namespace M6Web\Component\RedisMock;

/**
 * Adapter allowing to setup a Redis Mock inheriting of an arbitrary class
 *
 * WARNING ! RedisMock doesn't implement all Redis features and commands.
 * The mock can have undesired behavior if your parent class uses unsupported features.
 *
 * @author Adrien Samson <asamson.externe@m6.fr>
 * @author Florent Dubost <fdubost.externe@m6.fr>
 */
class RedisMockFactory
{
    protected $redisCommands = array(
        'append',
        'auth',
        'bgrewriteaof',
        'bgsave',
        'bitcount',
        'bitop',
        'blpop',
        'brpop',
        'brpoplpush',
        'client',
        'config',
        'dbsize',
        'debug',
        'decr',
        'decrby',
        'del',
        'discard',
        'dump',
        'echo',
        'eval',
        'evalsha',
        'exec',
        'exists',
        'expire',
        'expireat',
        'flushall',
        'flushdb',
        'get',
        'getbit',
        'getrange',
        'getset',
        'hdel',
        'hexists',
        'hget',
        'hgetall',
        'hincrby',
        'hincrbyfloat',
        'hkeys',
        'hlen',
        'hmget',
        'hmset',
        'hset',
        'hsetnx',
        'hvals',
        'incr',
        'incrby',
        'incrbyfloat',
        'info',
        'keys',
        'lastsave',
        'lindex',
        'linsert',
        'llen',
        'lpop',
        'lpush',
        'lpushx',
        'lrange',
        'lrem',
        'lset',
        'ltrim',
        'mget',
        'migrate',
        'monitor',
        'move',
        'mset',
        'msetnx',
        'multi',
        'object',
        'persist',
        'pexpire',
        'pexpireat',
        'ping',
        'psetex',
        'psubscribe',
        'pubsub',
        'pttl',
        'publish',
        'punsubscribe',
        'quit',
        'randomkey',
        'rename',
        'renamenx',
        'restore',
        'rpop',
        'rpoplpush',
        'rpush',
        'rpushx',
        'sadd',
        'save',
        'scard',
        'script',
        'sdiff',
        'sdiffstore',
        'select',
        'set',
        'setbit',
        'setex',
        'setnx',
        'setrange',
        'shutdown',
        'sinter',
        'sinterstore',
        'sismember',
        'slaveof',
        'slowlog',
        'smembers',
        'smove',
        'sort',
        'spop',
        'srandmember',
        'srem',
        'strlen',
        'subscribe',
        'sunion',
        'sunionstore',
        'sync',
        'time',
        'ttl',
        'type',
        'unsubscribe',
        'unwatch',
        'watch',
        'zadd',
        'zcard',
        'zcount',
        'zincrby',
        'zinterstore',
        'zrange',
        'zrangebyscore',
        'zrank',
        'zrem',
        'zremrangebyrank',
        'zremrangebyscore',
        'zrevrange',
        'zrevrangebyscore',
        'zrevrank',
        'zscore',
        'zunionstore',
        'scan',
        'sscan',
        'hscan',
        'zscan',
    );

    protected $classTemplate = <<<'CLASS'

namespace {{namespace}};

class {{class}} extends \{{baseClass}}
{
    protected $clientMock;
    public function setClientMock($clientMock)
    {
        $this->clientMock = $clientMock;
    }

    public function getClientMock()
    {
        if (!isset($this->clientMock)) {
            $this->clientMock = new RedisMock();
        }

        return $this->clientMock;
    }

    public function __call($method, $args)
    {
        $methodName = strtolower($method);

        if (!method_exists('M6Web\Component\RedisMock\RedisMock', $methodName)) {
            throw new UnsupportedException(sprintf('Redis command `%s` is not supported by RedisMock.', $methodName));
        }

        return call_user_func_array(array($this->getClientMock(), $methodName), $args);
    }
{{methods}}
}
CLASS;

    protected $methodTemplate = <<<'METHOD'

    public function {{method}}({{signature}})
    {
        return $this->getClientMock()->{{method}}({{args}});
    }
METHOD;

    protected $methodTemplateException = <<<'METHODEXCEPTION'

    public function {{method}}({{signature}})
    {
        throw new \M6Web\Component\RedisMock\UnsupportedException('Redis command {{method}} is not supported by RedisMock.');
    }
METHODEXCEPTION;

    protected $constructorTemplate = <<<'CONSTRUCTOR'

    public function __construct()
    {
        
    }
CONSTRUCTOR;

    public function getAdapter($classToExtend, $failOnlyAtRuntime = false, $orphanizeConstructor = true, $storage = '', array $constructorParams = [])
    {
        list($namespace, $newClassName, $class) = $this->getAdapterClassName($classToExtend, $orphanizeConstructor);

        if (!class_exists($class)) {
            $classCode = $this->getClassCode($namespace, $newClassName, new \ReflectionClass($classToExtend), $orphanizeConstructor, $failOnlyAtRuntime);
            eval($classCode);
        }

        /** @var RedisMock $instance */
        $instance = new $class(...$constructorParams);
        // This is our chance to configure explicitly the storage area
        // that the consumer of the Mock wants to use, in order to simulate
        // separate connections to different Redis servers, despite the static
        // nature of the internal data structure in the Mock object.
        $instance->selectStorage($storage);
        return $instance;
    }

    public function getAdapterClass($classToExtend, $failOnlyAtRuntime = false, $orphanizeConstructor = false)
    {
        list($namespace, $newClassName, $class) = $this->getAdapterClassName($classToExtend, $orphanizeConstructor);

        if (!class_exists($class)) {
            $classCode = $this->getClassCode($namespace, $newClassName, new \ReflectionClass($classToExtend), $orphanizeConstructor, $failOnlyAtRuntime);
            eval($classCode);
        }

        return $class;
    }

    protected function getAdapterClassName($classToExtend, $orphanizeConstructor = false)
    {
        $suffix = '';
        if (!$orphanizeConstructor) {
            $suffix = '_NativeConstructor';
        }

        $newClassName = sprintf('RedisMock_%s_Adapter%s', str_replace('\\', '_', $classToExtend), $suffix);
        $namespace = __NAMESPACE__;
        $class = $namespace . '\\'. $newClassName;

        return array($namespace, $newClassName, $class);
    }

    protected function getClassCode($namespace, $newClassName, \ReflectionClass $class, $orphanizeConstructor = false, $failOnlyAtRuntime = false)
    {
        $methodsCode = $orphanizeConstructor ? $this->constructorTemplate : '';

        foreach ($class->getMethods(\ReflectionMethod::IS_PUBLIC) as $method) {
            $methodName = strtolower($method->getName());

            if (!method_exists('M6Web\Component\RedisMock\RedisMock', $methodName) && in_array($methodName, $this->redisCommands)) {
                if ($failOnlyAtRuntime) {
                    $methodsCode .= strtr($this->methodTemplateException, array(
                            '{{method}}'    => $methodName,
                            '{{signature}}' => $this->getMethodSignature($method),
                        ));
                } else {
                    throw new UnsupportedException(sprintf('Redis command `%s` is not supported by RedisMock.', $methodName));
                }
            } elseif (method_exists('M6Web\Component\RedisMock\RedisMock', $methodName)) {
                $methodsCode .= strtr($this->methodTemplate, array(
                    '{{method}}'    => $methodName,
                    '{{signature}}' => $this->getMethodSignature($method),
                    '{{args}}'      => $this->getMethodArgs($method),
                ));
            }
        }

        return strtr($this->classTemplate, array(
            '{{namespace}}' => $namespace,
            '{{class}}'     => $newClassName,
            '{{baseClass}}' => $class->getName(),
            '{{methods}}'   => $methodsCode,
        ));
    }

    protected function getMethodSignature(\ReflectionMethod $method)
    {
        $signatures = array();
        foreach ($method->getParameters() as $parameter) {
            $signature = '';
            $parameterType = $parameter->getType();
            $isReflectionNamedType = $parameterType instanceof \ReflectionNamedType;
            // typeHint
            if ($isReflectionNamedType && $parameterType->getName() === 'array') {
                $signature .= 'array ';
            } elseif (
                method_exists($parameter, 'isCallable')
                && $isReflectionNamedType
                && $parameterType->getName() === 'callable'
            ) {
                $signature .= 'callable ';
            } elseif ($isReflectionNamedType && $parameterType->getName() === 'object') {
                $signature .= sprintf('\%s ', get_class($parameter));
            }
            // reference
            if ($parameter->isPassedByReference()) {
                $signature .= '&';
            }
            // paramName
            $signature .= '$' . $parameter->getName();
            // defaultValue
            if ($parameter->isDefaultValueAvailable()) {
                $signature .= ' = ';
                if (method_exists($parameter, 'isDefaultValueConstant') && $parameter->isDefaultValueConstant()) {
                    $signature .= $parameter->getDefaultValueConstantName();
                } else {
                    $signature .= var_export($parameter->getDefaultValue(), true);
                }
            }

            $signatures[] = $signature;
        }

        return implode(', ', $signatures);
    }

    protected function getMethodArgs(\ReflectionMethod $method)
        {
            $args = array();
            foreach ($method->getParameters() as $parameter) {
                $args[] = '$' . $parameter->getName();
            }

            return implode(', ', $args);
        }
}
