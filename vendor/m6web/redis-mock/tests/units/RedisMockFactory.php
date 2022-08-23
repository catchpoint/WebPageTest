<?php

namespace M6Web\Component\RedisMock\Tests\Units;

use M6Web\Component\RedisMock\RedisMockFactory as Factory;
use atoum;

/**
 * Test class for RedisMockFactory
 */
class RedisMockFactory extends atoum
{

    /**
     * Test the mock
     * 
     * @return void
     */
    public function testMock()
    {
        $factory = new Factory();
        $mock    = $factory->getAdapter('StdClass');

        $this->assert
            ->object($mock)
                ->isInstanceOf('M6Web\Component\RedisMock\RedisMock_StdClass_Adapter')
            ->class(get_class($mock))
                ->extends('StdClass')
            ->string($mock->set('test', 'data'))
                ->isEqualTo('OK')
            ->string($mock->get('test'))
                ->isEqualTo('data')
            ->integer($mock->del('test'))
                ->isEqualTo(1)
            ->integer($mock->sadd('test', 'test1'))
                ->isEqualTo(1)
            ->integer($mock->sAdd('test', 'test2'))
                ->isEqualTo(1)
            ->array($mock->sMembers('test'))
                ->isEqualTo(array('test1', 'test2'))
            ->integer($mock->sRem('test', 'test1'))
                ->isEqualTo(1)
            ->integer($mock->sRem('test', 'test2'))
                ->isEqualTo(1)
            ->integer($mock->del('test'))
                ->isEqualTo(0)
            ->exception(function() use ($mock) {
                $mock->punsubscribe();
            })
                ->isInstanceOf('\M6Web\Component\RedisMock\UnsupportedException');

        $mock2 = $factory->getAdapter('StdClass');

        $this->assert
            ->object($mock2)
                ->isInstanceOf('M6Web\Component\RedisMock\RedisMock_StdClass_Adapter')
            ->class(get_class($mock2))
                ->extends('StdClass');
    }

    /**
     * Test the mock with a complex base class
     * 
     * @return void
     */
    public function testMockComplex()
    {
        $factory = new Factory();
        $mock    = $factory->getAdapter('M6Web\Component\RedisMock\tests\units\RedisWithMethods');

        $this->assert
            ->object($mock)
                ->isInstanceOf('M6Web\Component\RedisMock\RedisMock_M6Web_Component_RedisMock_tests_units_RedisWithMethods_Adapter')
            ->class(get_class($mock))
                ->extends('M6Web\Component\RedisMock\tests\units\RedisWithMethods')
            ->string($mock->set('test', 'data'))
                ->isEqualTo('OK')
            ->string($mock->get('test'))
                ->isEqualTo('data')
            ->integer($mock->del('test'))
                ->isEqualTo(1)
            ->integer($mock->zadd('test', 1, 'test1'))
                ->isEqualTo(1)
            ->integer($mock->zadd('test', 30, 'test2'))
                ->isEqualTo(1)
            ->integer($mock->zadd('test', 15, 'test3'))
                ->isEqualTo(1)
            ->array($mock->zrangebyscore('test', '-inf', '+inf'))
                ->isEqualTo(array(
                    'test1',
                    'test3',
                    'test2'
                ))
            ->array($mock->zRangeByScore('test', '-inf', '+inf', array('limit' => array(1, 2))))
                ->isEqualTo(array(
                    'test3',
                    'test2'
                ))
            ->array($mock->zrevrangebyscore('test', '+inf', '-inf', array('limit' => array(1, 2))))
                ->isEqualTo(array(
                    'test3',
                    'test1'
                ));
    }

    /**
     * Test method getAdpaterClass
     * 
     * @return void
     */
    public function testGetAdapterClass()
    {
        $factory = new Factory();
        $this->assert
            ->string($class = $factory->getAdapterClass('StdClass'))
                ->isEqualTo('M6Web\Component\RedisMock\RedisMock_StdClass_Adapter_NativeConstructor')
            ->class($class)
                ->extends('StdClass')
            ->object($mock = new $class())
            ->string($mock->set('test', 'data'))
                ->isEqualTo('OK');
    }

    /**
     * Build mock by using 'orphanizeConstruct' parameter
     *
     * @return void
     */
    public function testOrphanizeConstruct() {
        $factory = new Factory();
        $this->assert
            ->exception(function() use ($factory) {
               $factory->getAdapter('M6Web\Component\RedisMock\tests\units\RedisWithNativeConstructor', false, false);
            })
                ->isInstanceOf(\ArgumentCountError::class);;

        $mock = $factory->getAdapter('M6Web\Component\RedisMock\tests\units\RedisWithNativeConstructor');

        $this->assert
            ->object($mock)
                ->isInstanceOf('M6Web\Component\RedisMock\RedisMock_M6Web_Component_RedisMock_tests_units_RedisWithNativeConstructor_Adapter')
            ->class(get_class($mock))
                ->extends('M6Web\Component\RedisMock\tests\units\RedisWithNativeConstructor');

        $this->assert
            ->string($class = $factory->getAdapterClass('M6Web\Component\RedisMock\tests\units\RedisWithNativeConstructor'))
                ->isEqualTo('M6Web\Component\RedisMock\RedisMock_M6Web_Component_RedisMock_tests_units_RedisWithNativeConstructor_Adapter_NativeConstructor')
            ->class($class)
                ->extends('M6Web\Component\RedisMock\tests\units\RedisWithNativeConstructor')
            ->exception(function() use ($class) {
                $mock = new $class();
            })
                ->isInstanceOf(\ArgumentCountError::class);

        $this->assert
            ->when(function() use ($class) {
                $mock = new $class(null);
            })
                ->error()
                    ->notExists()
            ->string($class2 = $factory->getAdapterClass('M6Web\Component\RedisMock\tests\units\RedisWithNativeConstructor', false, true))
                ->isEqualTo('M6Web\Component\RedisMock\RedisMock_M6Web_Component_RedisMock_tests_units_RedisWithNativeConstructor_Adapter')
            ->class($class2)
                ->extends('M6Web\Component\RedisMock\tests\units\RedisWithNativeConstructor')
            ->when(function() use ($class2) {
                $mock = new $class2();
            })
                ->error()
                    ->notExists();
    }

    /**
     * Test the mock with a base class that implement unsupported Redis commands
     * 
     * @return void
     */
    public function testUnsupportedMock()
    {
        $factory = new Factory();
        $this->assert
            ->exception(function() use ($factory) {
                $factory->getAdapter('M6Web\Component\RedisMock\tests\units\RedisWithUnsupportedMethods');
            })
                ->isInstanceOf('\M6Web\Component\RedisMock\UnsupportedException')
            ->object($mock = $factory->getAdapter('M6Web\Component\RedisMock\tests\units\RedisWithUnsupportedMethods', true))
                ->isInstanceOf('M6Web\Component\RedisMock\tests\units\RedisWithUnsupportedMethods')
            ->exception(function() use ($mock) {
                    $mock->punsubscribe('raoul');
                })
                ->isInstanceOf('\M6Web\Component\RedisMock\UnsupportedException')
            ->variable($mock->set('foo', 'bar'));

        $this->assert
            ->exception(function() use ($factory) {
                $factory->getAdapterClass('M6Web\Component\RedisMock\tests\units\RedisWithUnsupportedMethods');
            })
                ->isInstanceOf('\M6Web\Component\RedisMock\UnsupportedException')
            ->string($class = $factory->getAdapterClass('M6Web\Component\RedisMock\tests\units\RedisWithUnsupportedMethods', true))
                ->isEqualTo('M6Web\Component\RedisMock\RedisMock_M6Web_Component_RedisMock_tests_units_RedisWithUnsupportedMethods_Adapter_NativeConstructor');

        $mock2 = new $class();

        $this->assert
            ->exception(function() use ($mock2) {
                    $mock2->punsubscribe('raoul');
                })
                ->isInstanceOf('\M6Web\Component\RedisMock\UnsupportedException')
            ->variable($mock2->set('foo', 'bar'));
    }

    /**
     * Mock a concrete Predis Client
     *
     * @return void
     */
    public function testFailOnlyAtRuntimeWithPredis()
    {
        $factory = new Factory();

        $this->assert
            ->object($factory->getAdapter('Predis\Client', true))
                ->isInstanceOf('M6Web\Component\RedisMock\RedisMock_Predis_Client_Adapter');

        $this->assert
            ->string($factory->getAdapterClass('Predis\Client', true))
                ->isEqualTo('M6Web\Component\RedisMock\RedisMock_Predis_Client_Adapter_NativeConstructor');
    }

    public function testGetAdapterWithStorageArea()
    {
        $factory = new Factory();
        $mock    = $factory->getAdapter('StdClass');

        $this->assert
            ->string($mock->set('test', 'aaa'))
            ->isEqualTo('OK')
            ->string($mock->get('test'))
            ->isEqualTo('aaa')
        ;

        $mock2 = $factory->getAdapter('StdClass', false, true, 'second-server');

        $this->assert
            // On this "other server", the key 'test' should not exist
            ->variable($mock2->get('test'))
            ->isNull()
            // Let's give it a different value
            ->string($mock2->set('test', 'bbb'))
            ->isEqualTo('OK')
            ->string($mock2->get('test'))
            ->isEqualTo('bbb')
        ;


        $this->assert
            // And let's verify that the value for same key on the
            // first server did not change.
            ->string($mock->get('test'))
            ->isEqualTo('aaa')
        ;

    }
}

class RedisWithMethods
{
    public function aNoRedisMethod()
    {

    }

    public function set($key, $data)
    {
        throw new \Exception('Not mocked');
    }

    public function get($key)
    {
        throw new \Exception('Not mocked');
    }

    public function zRangeByScore($key, $min, $max, array $options = array())
    {
        throw new \Exception('Not mocked');
    }
}

class RedisWithUnsupportedMethods
{
    public function set($key, $data)
    {
        throw new \Exception('Not mocked');
    }

    public function punsubscribe($pattern = null)
    {
        throw new \Exception('Not mocked');
    }
}

class RedisWithNativeConstructor
{
    public function __construct($param)
    {

    }
}
