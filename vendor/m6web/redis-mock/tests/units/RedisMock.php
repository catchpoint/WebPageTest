<?php

namespace M6Web\Component\RedisMock\Tests\Units;

use atoum;
use M6Web\Component\RedisMock\RedisMock as Redis;

/**
 * Redis mock test
 */
class RedisMock extends atoum
{
    public function testSetGetDelExists()
    {
        $redisMock = new Redis();

        $this->assert
            ->integer($redisMock->exists('test'))
                ->isIdenticalTo(0)
            ->variable($redisMock->get('test'))
                ->isNull()
            ->integer($redisMock->del('test'))
                ->isEqualTo(0)

            ->string($redisMock->set('test', 'something'))
                ->isEqualTo('OK')
            ->string($redisMock->type('test'))
                ->isEqualTo('string')
            ->integer($redisMock->exists('test'))
                ->isEqualTo(1)
            ->string($redisMock->get('test'))
                ->isEqualTo('something')
            ->integer($redisMock->del('test'))
                ->isEqualTo(1)
            ->variable($redisMock->get('test'))
                ->isNull()
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->integer($redisMock->exists('test'))
                ->isEqualTo(0)

            ->string($redisMock->setex('test1', 5, 'something'))
                ->isEqualTo('OK')
            ->string($redisMock->type('test1'))
                ->isEqualTo('string')
            ->integer($redisMock->exists('test1'))
                ->isEqualTo(1)
            ->string($redisMock->get('test1'))
                ->isEqualTo('something')
            ->integer($redisMock->del('test1'))
                ->isEqualTo(1)
            ->variable($redisMock->get('test1'))
                ->isNull()
            ->string($redisMock->type('test1'))
                ->isEqualTo('none')
            ->integer($redisMock->exists('test1'))
                ->isEqualTo(0)

            ->string($redisMock->set('test1', 'something'))
                ->isEqualTo('OK')
            ->string($redisMock->set('test2', 'something else'))
                ->isEqualTo('OK')
            ->integer($redisMock->del('test1', 'test2'))
                ->isEqualTo(2)
            ->string($redisMock->set('test1', 'something'))
                ->isEqualTo('OK')
            ->string($redisMock->set('test2', 'something else'))
                ->isEqualTo('OK')
            ->integer($redisMock->del(array('test1', 'test2')))
                ->isEqualTo(2)

            ->string($redisMock->set('test3', 'something', 1))
                ->isEqualTo('OK')
            ->string($redisMock->setex('test4', 2, 'something else'))
                ->isEqualTo('OK')
            ->integer($redisMock->ttl('test3'))
                ->isLessThanOrEqualTo(1)
            ->integer($redisMock->ttl('test4'))
                ->isLessThanOrEqualTo(2)
            ->string($redisMock->get('test3'))
                ->isEqualTo('something')
            ->string($redisMock->get('test4'))
                ->isEqualTo('something else');
        sleep(3);
        $this->assert
            ->variable($redisMock->get('test3'))
                ->isNull()
            ->variable($redisMock->get('test4'))
                ->isNull()

            ->string($redisMock->set('test', 'something', 1))
                ->isEqualTo('OK')
            ->string($redisMock->type('test'))
                ->isEqualTo('string');
        sleep(2);
        $this->assert
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->string($redisMock->set('test', 'something', 1))
                ->isEqualTo('OK')
            ->integer($redisMock->exists('test'))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->exists('test'))
                ->isEqualTo(0);

        //setnx
        $this->assert
            ->integer($redisMock->setnx('test-setnx', 'lala'))
                ->isEqualTo(1)
            ->integer($redisMock->setnx('test-setnx', 'lala2'))
                ->isEqualTo(0)
            ->integer($redisMock->del('test-setnx'))
                ->isEqualTo(1)
            ->integer($redisMock->setnx('test-setnx', 'lala'))
                ->isEqualTo(1)
            ->string($redisMock->type('test-setnx'))
            ->isEqualTo('string');

        //setnx with expire
        $this->assert
            ->integer($redisMock->setnx("test-setnx-expire", "lala"))
                ->isEqualTo(1)
            ->integer($redisMock->expire("test-setnx-expire", 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->setnx("test-setnx-expire", "lala"))
                ->isEqualTo(1);

        //set with nx
        $this->assert
            ->string($redisMock->set('test-set-nx', 'value', ['nx']))
            ->isEqualTo('OK');
        $this->assert
            ->integer($redisMock->set('test-set-nx', 'value', ['nx']))
            ->isEqualTo(0);

        //set with xx
        $this->assert
            ->integer($redisMock->set('test-set-xx', 'value', ['xx']))
            ->isEqualTo(0);
        $this->assert
            ->string($redisMock->set('test-set-xx', 'value'))
            ->isEqualTo('OK');
        $this->assert
            ->string($redisMock->set('test-set-xx', 'value2', ['xx']))
            ->isEqualTo('OK');

        //set with nx ex
        $this->assert
            ->string($redisMock->set('test-set-nx-ex', 'value', ['nx', 'ex' => 1]))
            ->isEqualTo('OK');
        $this->assert
            ->integer($redisMock->set('test-set-nx-ex', 'value', ['nx', 'ex' => 1]))
            ->isEqualTo(0);
        sleep(2);
        $this->assert
            ->integer($redisMock->exists('test-set-nx-ex'))
            ->isEqualTo(0);

        //mget/mset test (roughly based on hmset/hmset tests)
        $this->assert
            ->array($redisMock->mget(array('raoul', 'test1')))
               ->isEqualTo(array(
                   null,
                   null,
               ))
            ->string($redisMock->mset(array(
                'test1' => 'somthing',
                'raoul' => 'nothing',
            )))
            ->array($redisMock->mget(array('raoul', 'test1')))
                ->isEqualTo(array(
                    'nothing',
                    'somthing',
                ))
            ->integer($redisMock->expire('raoul', 1))
                ->isEqualTo(1)
            ->integer($redisMock->expire('test1', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->array($redisMock->mget(array('raoul', 'test1')))
            ->isEqualTo(array(
                null,
                null,
            ));
    }

    public function testExpireTtl()
    {
        $redisMock = new Redis();

        $this->assert
            ->integer($redisMock->expire('test', 2))
                ->isEqualTo(0)
            ->integer($redisMock->ttl('test'))
                ->isEqualTo(-2)
            ->integer($redisMock->sadd('test', 'one'))
            ->integer($redisMock->ttl('test'))
                ->isEqualTo(-1)
            ->integer($redisMock->expire('test', 2))
                ->isEqualTo(1)
            ->integer($redisMock->ttl('test'))
                ->isGreaterThan(0);
        sleep(1);
        $this->assert
            ->integer($redisMock->ttl('test'))
                ->isLessThanOrEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->ttl('test'))
                ->isLessThanOrEqualTo(-2);


        $this->assert
            ->string($redisMock->set('test', 'something', 10))
                ->isEqualTo('OK')
            ->integer($redisMock->ttl('test'))
                ->isLessThanOrEqualTo(10)
            ->integer($redisMock->expire('test', 1))
                ->isLessThanOrEqualTo(1)
            ->integer($redisMock->ttl('test'))
                ->isLessThanOrEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->expire('test', 10))
                ->isLessThanOrEqualTo(0);
    }

    public function testIncr()
    {
        $redisMock = new Redis();

        $this->assert
            ->variable($redisMock->get('test'))
                ->isNull()
            ->integer($redisMock->incr('test'))
                ->isEqualTo(1)
            ->integer($redisMock->get('test'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('string')
            ->integer($redisMock->incr('test'))
                ->isEqualTo(2)
            ->integer($redisMock->incr('test'))
                ->isEqualTo(3)
            ->string($redisMock->set('test', 'something'))
                ->isEqualTo('OK')
            ->variable($redisMock->incr('test'))
                ->isNull()
            ->integer($redisMock->del('test'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->integer($redisMock->incr('test'))
                ->isEqualTo(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->incr('test'))
                ->isEqualTo(1);
    }

    public function testIncrby()
    {
        $redisMock = new Redis();

        $this->assert
            ->variable($redisMock->get('test'))
                ->isNull()
            ->integer($redisMock->incrby('test', 5))
                ->isEqualTo(5)
            ->integer($redisMock->get('test'))
                ->isEqualTo(5)
            ->string($redisMock->type('test'))
                ->isEqualTo('string')
            ->integer($redisMock->incrby('test', 1))
                ->isEqualTo(6)
            ->integer($redisMock->incrby('test', 2))
                ->isEqualTo(8)
            ->string($redisMock->set('test', 'something'))
                ->isEqualTo('OK')
            ->variable($redisMock->incrby('test', 4))
                ->isNull()
            ->integer($redisMock->del('test'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->integer($redisMock->incrby('test', 2))
                ->isEqualTo(2)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->incrby('test', 3))
                ->isEqualTo(3);
    }

    public function testIncrbyfloat()
    {
        $redisMock = new Redis();

        $this->assert
            ->variable($redisMock->get('test'))
                ->isNull()
            ->float($redisMock->incrbyfloat('test', 0.5))
                ->isEqualTo(0.5)
            ->float($redisMock->get('test'))
                ->isEqualTo(0.5)
            ->string($redisMock->type('test'))
                ->isEqualTo('string')
            ->float($redisMock->incrbyfloat('test', 1))
                ->isEqualTo(1.5)
            ->float($redisMock->incrbyfloat('test', 2.5))
                ->isEqualTo(4)
            ->string($redisMock->set('test', 'something'))
                ->isEqualTo('OK')
            ->variable($redisMock->incrbyfloat('test', 3.5))
                ->isNull()
            ->integer($redisMock->del('test'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->float($redisMock->incrbyfloat('test', 0.5))
                ->isEqualTo(0.5)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->float($redisMock->incrbyfloat('test', 0.5))
                ->isEqualTo(0.5);
    }

    public function testDecr()
    {
        $redisMock = new Redis();

        $this->assert
            ->variable($redisMock->get('test'))
                ->isNull()
            ->integer($redisMock->decr('test'))
                ->isEqualTo(-1)
            ->integer($redisMock->get('test'))
                ->isEqualTo(-1)
            ->string($redisMock->type('test'))
                ->isEqualTo('string')
            ->integer($redisMock->decr('test'))
                ->isEqualTo(-2)
            ->integer($redisMock->decr('test'))
                ->isEqualTo(-3)
            ->string($redisMock->set('test', 'something'))
                ->isEqualTo('OK')
            ->variable($redisMock->decr('test'))
                ->isNull()
            ->integer($redisMock->del('test'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->integer($redisMock->decr('test'))
                ->isEqualTo(-1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->decr('test'))
                ->isEqualTo(-1);
    }

    public function testDecrby()
    {
        $redisMock = new Redis();

        $this->assert
            ->variable($redisMock->get('test'))
                ->isNull()
            ->integer($redisMock->decrby('test', 5))
                ->isEqualTo(-5)
            ->integer($redisMock->get('test'))
                ->isEqualTo(-5)
            ->string($redisMock->type('test'))
                ->isEqualTo('string')
            ->integer($redisMock->decrby('test', 1))
                ->isEqualTo(-6)
            ->integer($redisMock->decrby('test', 2))
                ->isEqualTo(-8)
            ->string($redisMock->set('test', 'something'))
                ->isEqualTo('OK')
            ->variable($redisMock->decrby('test', 4))
                ->isNull()
            ->integer($redisMock->del('test'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->integer($redisMock->decrby('test', 2))
                ->isEqualTo(-2)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->decrby('test', 3))
                ->isEqualTo(-3);
    }

    public function testDecrbyfloat()
    {
        $redisMock = new Redis();

        $this->assert
            ->variable($redisMock->get('test'))
            ->isNull()
            ->float($redisMock->decrbyfloat('test', 0.5))
            ->isEqualTo(-0.5)
            ->float($redisMock->get('test'))
            ->isEqualTo(-0.5)
            ->string($redisMock->type('test'))
            ->isEqualTo('string')
            ->float($redisMock->decrbyfloat('test', 1))
            ->isEqualTo(-1.5)
            ->float($redisMock->decrbyfloat('test', 2.5))
            ->isEqualTo(-4.0)
            ->string($redisMock->set('test', 'something'))
            ->isEqualTo('OK')
            ->variable($redisMock->decrbyfloat('test', 3.5))
            ->isNull()
            ->integer($redisMock->del('test'))
            ->isEqualTo(1)
            ->string($redisMock->type('test'))
            ->isEqualTo('none')
            ->float($redisMock->decrbyfloat('test', 0.5))
            ->isEqualTo(-0.5)
            ->integer($redisMock->expire('test', 1))
            ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->float($redisMock->decrbyfloat('test', 0.5))
            ->isEqualTo(-0.5);
    }

    public function testKeys() {
        $redisMock = new Redis();

        $this->assert
            ->string($redisMock->set('something', 'a'))
                ->isEqualTo('OK')
            ->string($redisMock->set('someting_else', 'b'))
                ->isEqualTo('OK')
            ->string($redisMock->set('others', 'c'))
                ->isEqualTo('OK')
            ->array($redisMock->keys('some'))
                ->isEmpty()
            ->array($redisMock->keys('some*'))
                ->hasSize(2)
                ->containsValues(array('something', 'someting_else'))
            ->array($redisMock->keys('*o*'))
                ->hasSize(3)
                ->containsValues(array('something', 'someting_else', 'others'))
            ->array($redisMock->keys('*[ra]s*'))
                ->hasSize(1)
                ->containsValues(array('others'))
            ->array($redisMock->keys('*[rl]s*'))
                ->hasSize(2)
                ->containsValues(array('someting_else', 'others'))
            ->array($redisMock->keys('somet?ing*'))
                ->hasSize(1)
                ->containsValues(array('something'))
            ->array($redisMock->keys('somet*ing*'))
                ->hasSize(2)
                ->containsValues(array('something', 'someting_else'))
            ->array($redisMock->keys('*'))
                ->hasSize(3)
                ->containsValues(array('something', 'someting_else', 'others'))
            ->integer($redisMock->expire('others', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->array($redisMock->keys('*'))
                ->hasSize(2)
                ->containsValues(array('something', 'someting_else'));
    }

    public function testSCard()
    {
        $redisMock = new Redis();
        $redisMock->sadd('test', 'test4');
        $redisMock->sadd('test', 'test2');
        $redisMock->sadd('test', 'test3');
        $redisMock->sadd('test', 'test1');
        $redisMock->sadd('test', 'test5');
        $redisMock->sadd('test', 'test6');

        $this->assert
            ->integer($redisMock->scard('test'))
                ->isEqualTo(6);

        $this->assert
            ->integer($redisMock->scard('nothere'))
                ->isEqualTo(0);
    }

    public function testSDiff()
    {
        $redisMock = new Redis();
        $redisMock->sadd('key1', 'a', 'b', 'c', 'd');
        $redisMock->sadd('key2', 'c');
        $redisMock->sadd('key3', 'a', 'c', 'e');

        $this->assert
            ->array($redisMock->sdiff('key1', 'key2', 'key3'))
            ->isEqualTo(['b', 'd']);
    }

    public function testSInter()
    {
        $redisMock = new Redis();
        $redisMock->sadd('key1', 'a', 'b', 'c', 'd');
        $redisMock->sadd('key2', 'c');
        $redisMock->sadd('key3', 'a', 'c', 'e');

        $this->assert
            ->array($redisMock->sinter('key1', 'key2', 'key3'))
            ->isEqualTo(['c']);
    }

    public function testSAddSMembersSIsMemberSRem()
    {
        $redisMock = new Redis();

        $this->assert
            ->string($redisMock->set('test', 'something'))
                ->isEqualTo('OK')
            ->variable($redisMock->sadd('test', 'test1'))
                ->isNull()
            ->integer($redisMock->del('test'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->array($redisMock->smembers('test'))
                ->isEmpty()
            ->integer($redisMock->sismember('test', 'test1'))
                ->isEqualTo(0)
            ->integer($redisMock->srem('test', 'test1'))
                ->isEqualTo(0)
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->integer($redisMock->sadd('test', 'test1'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('set')
            ->integer($redisMock->sismember('test', 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->sadd('test', 'test1'))
                ->isEqualTo(0)
            ->array($redisMock->smembers('test'))
                ->hasSize(1)
                ->containsValues(array('test1'))
            ->integer($redisMock->srem('test', 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->sismember('test', 'test1'))
                ->isEqualTo(0)
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->integer($redisMock->sadd('test', 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->sadd('test', 'test2'))
                ->isEqualTo(1)
            ->array($redisMock->smembers('test'))
                ->hasSize(2)
                ->containsValues(array('test1', 'test2'))
            ->integer($redisMock->sadd('test', array('test3', 'test4')))
                ->isEqualTo(2)
            ->array($redisMock->smembers('test'))
                ->hasSize(4)
            ->integer($redisMock->sadd('test', array('test4', 'test5')))
                ->isEqualTo(1)
            ->integer($redisMock->sadd('test', 'test6', 'test7'))
                 ->isEqualTo(2)
            ->integer($redisMock->sadd('test', 'test7', 'test8'))
                 ->isEqualTo(1)
            ->array($redisMock->smembers('test'))
                ->hasSize(8)
                ->containsValues(array('test1', 'test2', 'test3', 'test4', 'test5', 'test6', 'test7', 'test8'))
            ->integer($redisMock->srem('test', array('test1', 'test2')))
                 ->isEqualTo(2)
            ->integer($redisMock->srem('test', 'test3', 'test4'))
                 ->isEqualTo(2)
            ->integer($redisMock->srem('test', array('test5', 'test55')))
                 ->isEqualTo(1)
            ->integer($redisMock->srem('test', 'test6', 'test66'))
                 ->isEqualTo(1)
            ->array($redisMock->smembers('test'))
                ->hasSize(2)
                ->containsValues(array('test7', 'test8'))
            ->integer($redisMock->del('test'))
                ->isEqualTo(2)
            ->array($redisMock->smembers('test'))
                ->hasSize(0)
            ->integer($redisMock->sadd('test', 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->sadd('test', 'test1'))
                ->isEqualTo(1)
            ->array($redisMock->smembers('test'))
                ->hasSize(1)
                ->containsValues(array('test1'))
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->array($redisMock->smembers('test'))
                ->isEmpty()
            ->integer($redisMock->sadd('test', 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->sismember('test', 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->sismember('test', 'test1'))
                ->isEqualTo(0)
            ->integer($redisMock->sadd('test', 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->srem('test', 'test1'))
                ->isEqualTo(0);
    }

    public function testZAddZRemZRemRangeByScore()
    {
        $redisMock = new Redis();

        $this->assert
            ->string($redisMock->set('test', 'something'))
                ->isEqualTo('OK')
            ->variable($redisMock->zadd('test', 1, 'test1'))
                ->isNull()
            ->integer($redisMock->del('test'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->integer($redisMock->zrem('test', 'test1'))
                ->isEqualTo(0)
            ->integer($redisMock->zadd('test', 1, 'test1'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('zset')
            ->exception(function() use ($redisMock) {
                $redisMock->zadd('test', 2, 'test1', 30, 'test2');
            })
                ->isInstanceOf('\M6Web\Component\RedisMock\UnsupportedException')
            ->integer($redisMock->zadd('test', 2, 'test1'))
                ->isEqualTo(0)
            ->integer($redisMock->zrem('test', 'test1'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->integer($redisMock->zremrangebyscore('test', '-100', '100'))
                ->isEqualTo(0)
            ->integer($redisMock->zadd('test', 1, 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->zadd('test', 30, 'test2'))
                ->isEqualTo(1)
            ->integer($redisMock->zadd('test', -1, 'test3'))
                ->isEqualTo(1)
            ->integer($redisMock->zremrangebyscore('test', '-3', '(-1'))
                ->isEqualTo(0)
            ->integer($redisMock->zremrangebyscore('test', '-3', '-1'))
                ->isEqualTo(1)
            ->integer($redisMock->zadd('test', -1, 'test3'))
                ->isEqualTo(1)
            ->exception(function() use ($redisMock) {
                $redisMock->zrem('test', 'test1', 'test2', 'test3');
            })
                ->isInstanceOf('\M6Web\Component\RedisMock\UnsupportedException')
            ->integer($redisMock->zremrangebyscore('test', '-inf', '+inf'))
                ->isEqualTo(3)
            ->integer($redisMock->del('test'))
                ->isEqualTo(0)
            ->integer($redisMock->zadd('test', 1, 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->zadd('test', 1, 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->zrem('test', 'test1'))
                ->isEqualTo(0)
            ->integer($redisMock->zadd('test', 1, 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->zremrangebyscore('test', '0', '2'))
                ->isEqualTo(0);
    }

    public function testZScore()
    {
        $redisMock = new Redis();
        $redisMock->zadd('test', 1, 'test4');
        $redisMock->zadd('test', 15, 'test2');

        $this->assert
            ->string($redisMock->zscore('test', 'test4'))
            ->isEqualTo(1);

        $this->assert
            ->string($redisMock->zscore('test', 'test2'))
            ->isEqualTo(15);

        $this->assert
            ->variable($redisMock->zscore('test', 'test99'))
            ->isEqualTo(null);
    }

    public function testZCard()
    {
        $redisMock = new Redis();
        $redisMock->zadd('test', 1, 'test4');
        $redisMock->zadd('test', 15, 'test2');
        $redisMock->zadd('test', 2, 'test3');
        $redisMock->zadd('test', 1, 'test1');
        $redisMock->zadd('test', 30, 'test5');
        $redisMock->zadd('test', 0, 'test6');

        $this->assert
            ->integer($redisMock->zcard('test'))
                ->isEqualTo(6);

        $this->assert
            ->integer($redisMock->zcard('nothere'))
                ->isEqualTo(0);
    }

    public function testZAddWithArray()
    {
        $redisMock = new Redis();
        $redisMock->zadd('test', ['test1' => 1]);
        $redisMock->zadd('test', ['test2' => 10]);
        $redisMock->zadd('test', ['test3' => 1.5]);
        $redisMock->zadd('test', ['test4' => '10.5']);

        $this->assert
            ->integer($redisMock->zcard('test'))
            ->isEqualTo(4);
    }

    public function testZAddDoNotAcceptNonNumericValue()
    {
        $redisMock = new Redis();
        $this->exception(
            function () use ($redisMock) {
                $redisMock->zadd('test', ['test1' => 'NotANumeric']);
            }
        )->isInstanceOf(\InvalidArgumentException::class);
    }

    public function testZIncrBy()
    {
        $redisMock = new Redis();
        $redisMock->zadd('test', 1, 'test1');
        $redisMock->zadd('test', 2, 'test2');

        $this->assert
            ->integer($redisMock->zincrby('test', 10, 'test1'))
            ->isEqualTo(11);

        $this->assert
            ->integer($redisMock->zincrby('test', -10, 'test2'))
            ->isEqualTo(-8);

        $this->assert
            ->integer($redisMock->zincrby('test', 10, 'test16'))
            ->isEqualTo(10);
    }

    public function testZRank()
    {
        $redisMock = new Redis();
        $redisMock->zadd('test', 4, 'test1');
        $redisMock->zadd('test', 15, 'test2');
        $redisMock->zadd('test', 2, 'test3');
        $redisMock->zadd('test', 1, 'test4');
        $redisMock->zadd('test', 30, 'test5');
        $redisMock->zadd('test', 0, 'test6');


        $this->assert->variable($redisMock->zrank('test', 'test6'))->isEqualTo(0);
        $this->assert->variable($redisMock->zrank('test', 'test4'))->isEqualTo(1);
        $this->assert->variable($redisMock->zrank('test', 'test3'))->isEqualTo(2);
        $this->assert->variable($redisMock->zrank('test', 'test1'))->isEqualTo(3);
        $this->assert->variable($redisMock->zrank('test', 'test2'))->isEqualTo(4);
        $this->assert->variable($redisMock->zrank('test', 'test5'))->isEqualTo(5);

        $this->assert->variable($redisMock->zrank('test', 'invalid'))->isEqualTo(null);
        $this->assert->variable($redisMock->zrank('invalid', 'whatever'))->isEqualTo(null);
    }

    public function testZRevRank()
    {
        $redisMock = new Redis();
        $redisMock->zadd('test', 4, 'test1');
        $redisMock->zadd('test', 15, 'test2');
        $redisMock->zadd('test', 2, 'test3');
        $redisMock->zadd('test', 1, 'test4');
        $redisMock->zadd('test', 30, 'test5');
        $redisMock->zadd('test', 0, 'test6');

        $this->assert->variable($redisMock->zrevrank('test', 'test5'))->isEqualTo(0);
        $this->assert->variable($redisMock->zrevrank('test', 'test2'))->isEqualTo(1);
        $this->assert->variable($redisMock->zrevrank('test', 'test1'))->isEqualTo(2);
        $this->assert->variable($redisMock->zrevrank('test', 'test3'))->isEqualTo(3);
        $this->assert->variable($redisMock->zrevrank('test', 'test4'))->isEqualTo(4);
        $this->assert->variable($redisMock->zrevrank('test', 'test6'))->isEqualTo(5);

        $this->assert->variable($redisMock->zrevrank('test', 'invalid'))->isEqualTo(null);
        $this->assert->variable($redisMock->zrevrank('invalid', 'whatever'))->isEqualTo(null);
    }

    public function testZRange()
    {
        $redisMock = new Redis();

        $this->assert
            ->array($redisMock->zrange('test', -100, 100))
                ->isEmpty();

        $redisMock->zadd('test', 1, 'test4');
        $redisMock->zadd('test', 15, 'test2');
        $redisMock->zadd('test', 2, 'test3');
        $redisMock->zadd('test', 1, 'test1');
        $redisMock->zadd('test', 30, 'test5');
        $redisMock->zadd('test', 0, 'test6');

        $this->assert
            ->array($redisMock->zrange('test', 0, 2))
                ->isEqualTo(array(
                    'test6',
                    'test1',
                    'test4',
                ))
            ->array($redisMock->zrange('test', 8, 2))
                ->isEmpty()
            ->array($redisMock->zrange('test', -1, 2))
                ->isEmpty()
            ->array($redisMock->zrange('test', -3, 4))
                ->isEqualTo(array(
                    'test3',
                    'test2',
                ))
            ->array($redisMock->zrange('test', -20, 4))
                ->isEqualTo(array(
                    'test6',
                    'test1',
                    'test4',
                    'test3',
                    'test2',
                ))
            ->array($redisMock->zrange('test', -2, 20))
                ->isEqualTo(array(
                    'test2',
                    'test5',
                ))
            ->array($redisMock->zrange('test', 1, -1))
                ->isEqualTo(array(
                    'test1',
                    'test4',
                    'test3',
                    'test2',
                    'test5',
                ))
            ->array($redisMock->zrange('test', 1, -3))
                ->isEqualTo(array(
                    'test1',
                    'test4',
                    'test3',
                ))
            ->array($redisMock->zrange('test', -2, -1))
                ->isEqualTo(array(
                    'test2',
                    'test5',
                ))
            ->array($redisMock->zrange('test', 1, -3, true))
                ->isEqualTo(array(
                    'test1' => 1,
                    'test4' => 1,
                    'test3' => 2,
                ))
            ->integer($redisMock->del('test'))
                ->isEqualTo(6)
            ->integer($redisMock->zadd('test', 1, 'test1'))
                ->isEqualTo(1)
            ->array($redisMock->zrange('test', 0, 1))
                ->hasSize(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->array($redisMock->zrange('test', 0, 1))
                ->isEmpty();

    }

    public function testZRevRange()
    {
        $redisMock = new Redis();

        $this->assert
            ->array($redisMock->zrevrange('test', -100, 100))
                ->isEmpty();

        $redisMock->zadd('test', 1, 'test4');
        $redisMock->zadd('test', 15, 'test2');
        $redisMock->zadd('test', 2, 'test3');
        $redisMock->zadd('test', 1, 'test1');
        $redisMock->zadd('test', 30, 'test5');
        $redisMock->zadd('test', 0, 'test6');

        $this->assert
            ->array($redisMock->zrevrange('test', 0, 2))
                ->isEqualTo(array(
                    'test5',
                    'test2',
                    'test3',
                ))
            ->array($redisMock->zrevrange('test', 8, 2))
                ->isEmpty()
            ->array($redisMock->zrevrange('test', -1, 2))
                ->isEmpty()
            ->array($redisMock->zrevrange('test', -3, 4))
                ->isEqualTo(array(
                    'test4',
                    'test1',
                ))
            ->array($redisMock->zrevrange('test', -20, 4))
                ->isEqualTo(array(
                    'test5',
                    'test2',
                    'test3',
                    'test4',
                    'test1',
                ))
            ->array($redisMock->zrevrange('test', -2, 20))
                ->isEqualTo(array(
                    'test1',
                    'test6',
                ))
            ->array($redisMock->zrevrange('test', 1, -1))
                ->isEqualTo(array(
                    'test2',
                    'test3',
                    'test4',
                    'test1',
                    'test6',
                ))
            ->array($redisMock->zrevrange('test', 1, -3))
                ->isEqualTo(array(
                    'test2',
                    'test3',
                    'test4',
                ))
            ->array($redisMock->zrevrange('test', -2, -1))
                ->isEqualTo(array(
                    'test1',
                    'test6',
                ))
            ->array($redisMock->zrevrange('test', 1, -3, true))
                ->isIdenticalTo(array(
                    'test2' => '15',
                    'test3' => '2',
                    'test4' => '1',
                ))
            ->integer($redisMock->del('test'))
                ->isEqualTo(6)
            ->integer($redisMock->zadd('test', 1, 'test1'))
                ->isEqualTo(1)
            ->array($redisMock->zrevrange('test', 0, 1))
                ->hasSize(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->array($redisMock->zrange('test', 0, 1))
                ->isEmpty();

    }

    public function testZRangeByScore()
    {
        $redisMock = new Redis();

        $this->assert
            ->array($redisMock->zrangebyscore('test', '-inf', '+inf'))
                ->isEmpty();

        $redisMock->zadd('test', 1, 'test4');
        $redisMock->zadd('test', 15, 'test2');
        $redisMock->zadd('test', 2, 'test3');
        $redisMock->zadd('test', 1, 'test1');
        $redisMock->zadd('test', 30, 'test5');
        $redisMock->zadd('test', 0, 'test6');

        $this->assert
            ->array($redisMock->zrangebyscore('test', '-inf', '+inf'))
                ->isEqualTo(array(
                    'test6',
                    'test1',
                    'test4',
                    'test3',
                    'test2',
                    'test5',
                ))
            ->array($redisMock->zrangebyscore('test', '-inf', '15'))
                ->isEqualTo(array(
                    'test6',
                    'test1',
                    'test4',
                    'test3',
                    'test2',
                ))
            ->array($redisMock->zrangebyscore('test', '-inf', '(15'))
                ->isEqualTo(array(
                    'test6',
                    'test1',
                    'test4',
                    'test3',
                ))
            ->array($redisMock->zrangebyscore('test', '2', '+inf'))
                ->isEqualTo(array(
                    'test3',
                    'test2',
                    'test5',
                ))
            ->array($redisMock->zrangebyscore('test', '(2', '+inf'))
                ->isEqualTo(array(
                    'test2',
                    'test5',
                ))
            ->array($redisMock->zrangebyscore('test', '2', '15'))
                ->isEqualTo(array(
                    'test3',
                    'test2',
                ))
            ->array($redisMock->zrangebyscore('test', '(1', '15'))
                ->isEqualTo(array(
                    'test3',
                    'test2',
                ))
            ->array($redisMock->zrangebyscore('test', '-inf', '15', array('limit' => array(0, 2))))
                ->isEqualTo(array(
                    'test6',
                    'test1',
                ))
            ->array($redisMock->zrangebyscore('test', '-inf', '15', array('limit' => array(1, 2))))
                ->isEqualTo(array(
                    'test1',
                    'test4',
                ))
            ->array($redisMock->zrangebyscore('test', '-inf', '15', array('limit' => array(1, 3))))
                ->isEqualTo(array(
                    'test1',
                    'test4',
                    'test3',
                ))
            ->array($redisMock->zrangebyscore('test', '-inf', '15', array('limit' => array(1, 3), 'withscores' => true)))
                ->isIdenticalTo(array(
                    'test1' => '1',
                    'test4' => '1',
                    'test3' => '2',
                ))
            ->integer($redisMock->del('test'))
                ->isEqualTo(6)
            ->integer($redisMock->zadd('test', 1, 'test1'))
                ->isEqualTo(1)
            ->array($redisMock->zrangebyscore('test', '0', '1'))
                ->hasSize(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->array($redisMock->zrangebyscore('test', '0', '1'))
                ->isEmpty();
    }

    public function testZRevRangeByScore()
    {
        $redisMock = new Redis();

        $this->assert
            ->array($redisMock->zrevrangebyscore('test', '+inf', '-inf'))
                ->isEmpty();

        $redisMock->zadd('test', 1, 'test4');
        $redisMock->zadd('test', 15, 'test2');
        $redisMock->zadd('test', 2, 'test3');
        $redisMock->zadd('test', 1, 'test1');
        $redisMock->zadd('test', 30, 'test5');
        $redisMock->zadd('test', 0, 'test6');

        $this->assert
            ->array($redisMock->zrevrangebyscore('test', '+inf', '-inf'))
                ->isEqualTo(array(
                    'test5',
                    'test2',
                    'test3',
                    'test4',
                    'test1',
                    'test6',
                ))
            ->array($redisMock->zrevrangebyscore('test', '15', '-inf'))
                ->isEqualTo(array(
                    'test2',
                    'test3',
                    'test4',
                    'test1',
                    'test6',
                ))
            ->array($redisMock->zrevrangebyscore('test', '(15', '-inf'))
                ->isEqualTo(array(
                    'test3',
                    'test4',
                    'test1',
                    'test6',
                ))
            ->array($redisMock->zrevrangebyscore('test', '+inf', '2'))
                ->isEqualTo(array(
                    'test5',
                    'test2',
                    'test3',
                ))
            ->array($redisMock->zrevrangebyscore('test', '+inf', '(2'))
                ->isEqualTo(array(
                    'test5',
                    'test2',
                ))
            ->array($redisMock->zrevrangebyscore('test', '15', '2'))
                ->isEqualTo(array(
                    'test2',
                    'test3',
                ))
            ->array($redisMock->zrevrangebyscore('test', '15', '(1'))
                ->isEqualTo(array(
                    'test2',
                    'test3',
                ))
            ->array($redisMock->zrevrangebyscore('test', '15', '-inf', array('limit' => array(0, 2))))
                ->isEqualTo(array(
                    'test2',
                    'test3',
                ))
            ->array($redisMock->zrevrangebyscore('test', '15', '-inf', array('limit' => array(1, 2))))
                ->isEqualTo(array(
                    'test3',
                    'test4',
                ))
            ->array($redisMock->zrevrangebyscore('test', '15', '-inf', array('limit' => array(1, 3))))
                ->isEqualTo(array(
                    'test3',
                    'test4',
                    'test1',
                ))
            ->array($redisMock->zrevrangebyscore('test', '15', '-inf', array('limit' => array(1, 3), 'withscores' => true)))
                ->isIdenticalTo(array(
                    'test3' => '2',
                    'test4' => '1',
                    'test1' => '1',
                ))
            ->integer($redisMock->del('test'))
                ->isEqualTo(6)
            ->integer($redisMock->zadd('test', 1, 'test1'))
                ->isEqualTo(1)
            ->array($redisMock->zrevrangebyscore('test', '1', '0'))
                ->hasSize(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->array($redisMock->zrevrangebyscore('test', '1', '0'))
                ->isEmpty();
    }

    public function testHSetHMSetHGetHDelHExistsHKeysHLenHGetAll()
    {
        $redisMock = new Redis();

        $this->assert
            ->string($redisMock->set('test', 'something'))
                ->isEqualTo('OK')
            ->variable($redisMock->hset('test', 'test1', 'something'))
                ->isNull()
            ->integer($redisMock->del('test'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->variable($redisMock->hget('test', 'test1'))
                ->isNull()
            ->array($redisMock->hgetall('test'))
                ->isEmpty()
            ->integer($redisMock->hexists('test', 'test1'))
                ->isEqualTo(0)
            ->integer($redisMock->hset('test', 'test1', 'something'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('hash')
            ->string($redisMock->hget('test', 'test1'))
                ->isEqualTo('something')
            ->integer($redisMock->hset('test', 'test1', 'something else'))
                ->isEqualTo(0)
            ->string($redisMock->hget('test', 'test1'))
                ->isEqualTo('something else')
            ->array($redisMock->hkeys('test'))
                ->hasSize(1)
                ->containsValues(array('test1'))
            ->integer($redisMock->hlen('test'))
                ->isEqualTo(1)
            ->array($redisMock->hgetall('test'))
                ->hasSize(1)
                ->containsValues(array('something else'))
            ->integer($redisMock->hset('test', 'test2', 'something'))
                ->isEqualTo(1)
            ->array($redisMock->hgetall('test'))
                ->hasSize(2)
                ->containsValues(array('something', 'something else'))
            ->integer($redisMock->hexists('test', 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->hexists('test', 'test3'))
                ->isEqualTo(0)
            ->integer($redisMock->del('test'))
                ->isEqualTo(2)
            ->integer($redisMock->hset('test', 'test1', 'something'))
                ->isEqualTo(1)
            ->integer($redisMock->hset('test', 'test2', 'something else'))
                ->isEqualTo(1)
            ->integer($redisMock->hset('test', 'test4', 'something else 4'))
                ->isEqualTo(1)
            ->integer($redisMock->hset('test', 'test5', 'something else 5'))
                ->isEqualTo(1)
            ->integer($redisMock->hset('test', 'test6', 'something else 6'))
                ->isEqualTo(1)
            ->integer($redisMock->hdel('test', 'test2'))
                ->isEqualTo(1)
            ->integer($redisMock->hdel('test', 'test3'))
                ->isEqualTo(0)
            ->integer($redisMock->hdel('raoul', 'test2'))
                ->isEqualTo(0)
            ->integer($redisMock->hdel('test', ['test4']))
                ->isEqualTo(1)
            ->integer($redisMock->hdel('test', ['test5', 'test6']))
                ->isEqualTo(2)
            ->string($redisMock->type('test'))
                ->isEqualTo('hash')
            ->integer($redisMock->hdel('test', 'test1'))
                ->isEqualTo(1)
            ->string($redisMock->type('test'))
                ->isEqualTo('none')
            ->string($redisMock->hmset('test', array(
                'test1'  => 'somthing',
                'blabla' => 'anything',
                'raoul'  => 'nothing',
            )))
                ->isEqualTo('OK')
            ->array($redisMock->hkeys('test'))
                ->isEqualTo(array(
                    0 => 'test1',
                    1 => 'blabla',
                    2 => 'raoul',
                ))
            ->integer($redisMock->hlen('test'))
                ->isEqualTo(3)
            ->array($redisMock->hgetall('test'))
                ->isEqualTo(array(
                    'test1'  => 'somthing',
                    'blabla' => 'anything',
                    'raoul'  => 'nothing',
                ))
            ->array($redisMock->hmget('test', array('raoul', 'test1')))
                ->isEqualTo(array(
                    'raoul'  => 'nothing',
                    'test1'  => 'somthing',
                ))
            ->array($redisMock->hmget('test', array('raoul', 'oogabooga')))
                ->isEqualTo(array(
                    'raoul'  => 'nothing',
                    'oogabooga'  => null,
                ))
            ->array($redisMock->hmget('oogabooga', array('raoul', 'test1')))
                ->isEqualTo(array(
                    'raoul'  => null,
                    'test1'  => null,
                ))
            ->integer($redisMock->del('test'))
                ->isEqualTo(3)
            ->exception(function () use ($redisMock) {
                $redisMock->hdel('test', 'test1', 'test2');
            })
                ->isInstanceOf('\M6Web\Component\RedisMock\UnsupportedException')
            ->integer($redisMock->hset('test', 'test1', 'something'))
                ->isEqualTo(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->hset('test', 'test1', 'something'))
                ->isEqualTo(1)
            ->string($redisMock->hget('test', 'test1'))
                ->isEqualTo('something')
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->variable($redisMock->hget('test', 'test1'))
                ->isNull()
            ->integer($redisMock->hset('test', 'test1', 'something'))
                ->isEqualTo(1)
            ->integer($redisMock->hexists('test', 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->hexists('test', 'test1'))
                ->isEqualTo(0)
            ->integer($redisMock->hset('test', 'test1', 'something'))
                ->isEqualTo(1)
            ->array($redisMock->hgetall('test'))
                ->hasSize(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->array($redisMock->hgetall('test'))
                ->isEmpty()
            ->integer($redisMock->hset('test', 'test1', 'something'))
                ->isEqualTo(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->hdel('test', 'test1'))
                ->isEqualTo(0)
            ->string($redisMock->hmset('test', array(
                'test1'  => 'somthing',
                'blabla' => 'anything',
                'raoul'  => 'nothing',
            )))
                ->isEqualTo('OK')
            ->array($redisMock->hgetall('test'))
                ->isEqualTo(array(
                    'test1'  => 'somthing',
                    'blabla' => 'anything',
                    'raoul'  => 'nothing',
                ))
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->array($redisMock->hgetall('test'))
                ->isEmpty()
            ->string($redisMock->hmset('test', array(
                'test1' => 'somthing',
                'raoul' => 'nothing',
            )))
            ->array($redisMock->hmget('test', array('raoul', 'test1')))
                ->isEqualTo(array(
                    'raoul' => 'nothing',
                    'test1' => 'somthing',
                ))
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->array($redisMock->hmget('test', array('raoul', 'test1')))
            ->isEqualTo(array(
                'raoul' => null,
                'test1' => null,
            ));
        sleep(2);
        $this->assert
            ->integer($redisMock->hsetnx('mykey', 'field', 'my value'))
                ->isEqualTo(1)
            ->integer($redisMock->hsetnx('mykey', 'field2', 'second value'))
                ->isEqualTo(1)
            ->integer($redisMock->hsetnx('mykey', 'field', 'override value'))
                ->isEqualTo(0)
            ->integer($redisMock->del('mykey'))
                ->isEqualTo(2)
        ;
    }

    public function testHincrby()
    {
        $redisMock = new Redis();

        $this->assert
            ->variable($redisMock->hget('test', 'count'))
            ->isNull()
            ->integer($redisMock->hincrby('test', 'count', 5))
            ->isEqualTo(5)
            ->integer($redisMock->hget('test', 'count'))
            ->isEqualTo(5)
            ->integer($redisMock->hincrby('test', 'count', 1))
            ->isEqualTo(6)
            ->integer($redisMock->hincrby('test', 'count', 2))
            ->isEqualTo(8)
            ->integer($redisMock->hset('test', 'count', 'something'))
            ->isEqualTo(0)
            ->variable($redisMock->hincrby('test', 'count', 4))
            ->isNull()
            ->integer($redisMock->hdel('test', 'count'))
            ->isEqualTo(1)
            ->integer($redisMock->hincrby('test', 'count', 2))
            ->isEqualTo(2)
            ->integer($redisMock->expire('test', 1))
            ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->hincrby('test', 'count', 3))
            ->isEqualTo(3)
            ->integer($redisMock->hincrby('test', 'count', -2))
            ->isEqualTo(1);
    }

    public function testLLen()
    {
        $redisMock = new Redis();
        $redisMock->lpush($testList = uniqid(), 'test1');

        $this->assert
            ->integer($redisMock->llen($testList))
                ->isEqualTo(1);

        $redisMock->lpush($testList, 'test2');
        $redisMock->lpush($testList, 'test3');
        $redisMock->lpush($testList, 'test4');
        $redisMock->lpush($testList, 'test5');

        $this->assert
            ->integer($redisMock->llen($testList))
                ->isEqualTo(5);

        // Not existing list
        $this->assert
            ->integer($redisMock->llen('invalid'))
                ->isEqualTo(0);

    }

    public function testLIndex()
    {
        $redisMock = new Redis();
        $redisMock->rpush($testList = uniqid(), 'test1');
        $redisMock->rpush($testList, 'test2');
        $redisMock->rpush($testList, 'test3');
        $redisMock->rpush($testList, 'test4');
        $redisMock->rpush($testList, 'test5');

        $this->assert
            // Access index from starting position
            ->string($redisMock->lindex($testList, 0))->isEqualTo('test1')
            ->string($redisMock->lindex($testList, 1))->isEqualTo('test2')
            ->string($redisMock->lindex($testList, 4))->isEqualTo('test5')
            // Access index from ending position
            ->string($redisMock->lindex($testList, -1))->isEqualTo('test5')
            ->string($redisMock->lindex($testList, -3))->isEqualTo('test3')
            // Out of range indexes
            ->variable($redisMock->lindex($testList, 5))->isNull()
            ->variable($redisMock->lindex($testList, 10))->isNull()
            ->variable($redisMock->lindex($testList, -5))->isNull()
            ->variable($redisMock->lindex($testList, -10))->isNull()
            // Non-existent index
            ->variable($redisMock->lindex('invalid', rand()))->isNull()
        ;
    }

    public function testLPushRPushLRemLTrim()
    {
        $redisMock = new Redis();

        $this->assert
            ->array($redisMock->getData())
                ->isEmpty()
            ->integer($redisMock->rpush('test', 'blabla'))
                ->isIdenticalTo(1)
            ->integer($redisMock->rpush('test', 'something'))
                ->isIdenticalTo(2)
            ->integer($redisMock->rpush('test', 'raoul'))
                ->isIdenticalTo(3)
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('blabla', 'something', 'raoul')))
            ->integer($redisMock->lpush('test', 'raoul'))
                ->isIdenticalTo(4)
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('raoul', 'blabla', 'something', 'raoul')))
            ->integer($redisMock->lrem('test', 'blabla', 2))
                ->isIdenticalTo(1)
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('raoul', 'something', 'raoul')))
            ->integer($redisMock->lrem('test', 'raoul', 1))
                ->isIdenticalTo(1)
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('something', 'raoul')))
            ->integer($redisMock->rpush('test', 'raoul'))
                ->isIdenticalTo(3)
            ->integer($redisMock->rpush('test', 'raoul'))
                ->isIdenticalTo(4)
            ->integer($redisMock->lpush('test', 'raoul'))
                ->isIdenticalTo(5)
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('raoul', 'something', 'raoul', 'raoul', 'raoul')))
            ->integer($redisMock->lrem('test', 'raoul', -2))
                ->isIdenticalTo(2)
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('raoul', 'something', 'raoul')))
            ->integer($redisMock->rpush('test', 'raoul'))
                ->isIdenticalTo(4)
            ->integer($redisMock->rpush('test', 'raoul'))
                ->isIdenticalTo(5)
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('raoul', 'something', 'raoul', 'raoul', 'raoul')))
            ->integer($redisMock->lrem('test', 'raoul', 0))
                ->isIdenticalTo(4)
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('something')))
            ->integer($redisMock->rpush('test', 'blabla'))
                ->isIdenticalTo(2)
            ->integer($redisMock->rpush('test', 'something'))
                ->isIdenticalTo(3)
            ->integer($redisMock->rpush('test', 'raoul'))
                ->isIdenticalTo(4)
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('something', 'blabla', 'something', 'raoul')))
            ->string($redisMock->ltrim('test', 0, -1))
                ->isIdenticalTo('OK')
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('something', 'blabla', 'something', 'raoul')))
            ->string($redisMock->ltrim('test', 1, -1))
                ->isIdenticalTo('OK')
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('blabla', 'something', 'raoul')))
            ->string($redisMock->ltrim('test', -2, 2))
                ->isIdenticalTo('OK')
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('something', 'raoul')))
            ->string($redisMock->ltrim('test', 0, 2))
                ->isIdenticalTo('OK')
            ->integer($redisMock->lpush('test', 'raoul'))
                ->isIdenticalTo(3)
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('raoul', 'something', 'raoul')))
            ->string($redisMock->ltrim('test', -3, -2))
                ->isIdenticalTo('OK')
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('raoul', 'something')))
            ->string($redisMock->ltrim('test', -1, 0))
                ->isIdenticalTo('OK')
            ->integer($redisMock->exists('test'))
                ->isIdenticalTo(0)
            ->integer($redisMock->lpush('test', 'raoul'))
                ->isIdenticalTo(1)
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('raoul')))
            ->integer($redisMock->del('test'))
                ->isEqualTo(1)
            ->integer($redisMock->rpush('test', 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->rpush('test', 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->lpush('test', 'test1'))
                ->isEqualTo(2)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->lpush('test', 'test1'))
                ->isEqualTo(1)
            ->string($redisMock->ltrim('test', 0, -1))
                ->isEqualTo('OK')
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->string($redisMock->ltrim('test', 0, -1))
                ->isEqualTo('OK')
            ->array($redisMock->getData())
                ->isEmpty()
            ->integer($redisMock->rpush('test', 'test1'))
                ->isEqualTo(1)
            ->integer($redisMock->rpush('test', 'test1'))
                ->isEqualTo(2)
            ->integer($redisMock->lrem('test', 'test1', 1))
                ->isEqualTo(1)
            ->integer($redisMock->expire('test', 1))
                ->isEqualTo(1);
        sleep(2);
        $this->assert
            ->integer($redisMock->lrem('test', 'test1', 1))
                ->isEqualTo(0);

        $this->assert
            // lpush allow to push further values at once
            ->integer($redisMock->lpush('test', 'last', 'middle', 'first'))
                ->isEqualTo(3)
            ->array($redisMock->getData())
                ->isEqualTo(array('test' => array('first', 'middle', 'last')))
        ;
    }

    public function testFlushDb()
    {
        $redisMock = new Redis();

        $this->assert
            ->string($redisMock->set('test', 'a'))
                ->isEqualTo('OK')
            ->integer($redisMock->exists('test'))
                ->isEqualTo(1)
            ->string($redisMock->flushdb())
                ->isEqualTo('OK')
            ->integer($redisMock->exists('test'))
                ->isEqualTo(0);
    }

    public function testPipeline()
    {
        $redisMock = new Redis();

        $this->assert
            ->object(
                $redisMock->pipeline()
                    ->set('test', 'something')
                    ->get('test')
                    ->mset(array('test1' => 'something', 'test2' => 'nothing'))
                    ->mget(array('test1', 'test2'))
                    ->incr('test')
                    ->keys('test')
                    ->del('test')
                    ->sadd('test', 'test1')
                    ->smembers('test')
                    ->sismember('test', 'test1')
                    ->srem('test', 'test1')
                    ->del('test')
                    ->zadd('test', 1, 'test1')
                    ->zrange('test', 0, 1)
                    ->zrangebyscore('test', '-inf', '+inf')
                    ->zrevrange('test', 0, 1)
                    ->zrevrangebyscore('test', '+inf', '-inf')
                    ->zrem('test', 'test1')
                    ->zremrangebyscore('test', '-inf', '+inf')
                    ->del('test')
                    ->hset('test', 'test1', 'something')
                    ->hget('test', 'test1')
                    ->hmset('test', array('test1' => 'something'))
                    ->hmget('test', array('test1'))
                    ->hexists('test', 'test1')
                    ->hgetall('test')
                    ->del('test')
                    ->lpush('test', 'test1')
                    ->lrange('test', 0, -1)
                    ->ltrim('test', 0, -1)
                    ->lrem('test', 'test1', 1)
                    ->rpush('test', 'test1')
                    ->type('test')
                    ->ttl('test')
                    ->lpop('test')
                    ->rpop('test')
                    ->expire('test', 1)
                    ->setnx("test123", "somethingelse")
                    ->execute()
            )
                ->isInstanceOf('M6Web\Component\RedisMock\RedisMock');
    }

    public function testTransactions()
    {
        $redisMock = new Redis();

        $redisMock->set('test', 'something');

        $this->assert
            // Discard test
            ->string(
                $redisMock
                    ->multi()
                    ->set('test2', '*¨LPLR$`ù^')
                    ->get('test2')
                    ->discard()
            )
                ->isEqualTo('OK')
            // Multi results test
            ->array(
                $redisMock
                    ->multi()
                    ->set('test3', 'AZERTY*%£')
                    ->incr('test4')
                    ->incr('test4')
                    ->set('test5', 'todelete')
                    ->del('test5')
                    ->get('test3')
                    ->exec()
            )
                ->isEqualTo(array(
                    'OK',
                    1,
                    2,
                    'OK',
                    1,
                    'AZERTY*%£',
                ))
            // Exec reset test
            ->array(
                $redisMock
                    ->multi()
                    ->incr('test4')
                    ->exec()
            )
                ->isEqualTo(array(
                    3,
                ));

        // Exec results reset by Discard
        $redisMock->discard();

        $this->assert
            ->array($redisMock->exec())
                ->isEmpty();
    }

    public function testDbsize()
    {
        $redisMock = new Redis();

        $redisMock->set('test', 'something');

        $this->assert
            ->integer($redisMock->dbsize())
            ->isEqualTo(1);

        $redisMock->set('test2', 'raoul');

        $this->assert
            ->integer($redisMock->dbsize())
            ->isEqualTo(2);

        $redisMock->expire('test2', 1);
        sleep(2);

        $this->assert
            ->integer($redisMock->dbsize())
            -> isGreaterThanOrEqualTo(1);

        $redisMock->flushdb();

        $this->assert
            ->integer($redisMock->dbsize())
            ->isEqualTo(0);
    }

    public function testLpopRpop()
    {
        $redisMock = new Redis();
        $key       = uniqid();

        $this->assert
            ->variable($redisMock->rpop($key))
                ->isNull()
            ->variable($redisMock->lpop($key))
                ->isNull()
            ->integer($redisMock->lpush($key, 'foo'))
                ->isIdenticalTo(1)
            ->integer($redisMock->lpush($key, 'bar'))
                ->isIdenticalTo(2)
            ->string($redisMock->lpop($key))
                ->isIdenticalTo('bar')
            ->integer($redisMock->rpush($key, 'redis'))
                ->isIdenticalTo(2)
            ->string($redisMock->rpop($key))
                ->isIdenticalTo('redis')
            ->string($redisMock->rpop($key))
                ->isIdenticalTo('foo')
            ->variable($redisMock->rpop($key))
                ->isNull()
            ->variable($redisMock->lpop($key))
                ->isNull()
        ;

        $lKey = uniqid();
        $rKey = uniqid();

        $redisMock->lpush($lKey, uniqid());
        $redisMock->rpush($rKey, uniqid());

        $redisMock->expire($lKey, 1);
        $redisMock->expire($rKey, 1);
        sleep(2);

        $this->assert
            ->variable($redisMock->rpop($rKey))
                ->isNull()
            ->variable($redisMock->lpop($lKey))
                ->isNull()
        ;
    }

    public function testLrange()
    {
        $redisMock = new Redis();
        $key       = uniqid();

        $this
            ->array($redisMock->lrange($key, 1, 1))
                ->isEmpty()
        ;

        $redisMock->lpush($key, 'foo');
        $redisMock->lpush($key, 'bar');
        $redisMock->lpush($key, 'other');
        $redisMock->lpush($key, 'none');

        $this
            ->array($redisMock->lrange($key, 1, 2))
                ->isEqualTo(array('other', 'bar'))
            ->array($redisMock->lrange($key, 1, 100))
                ->isEqualTo(array('other', 'bar', 'foo'))
            ->array($redisMock->lrange($key, -100, 100))
                ->isEqualTo(array('none', 'other', 'bar', 'foo'))
        ;

        $redisMock->expire($key, 1);
        sleep(2);

        $this
            ->array($redisMock->lrange($key, 1, 1))
                ->isEmpty()
        ;
    }

    public function testTwoSeparateStorage()
    {
        $redisMock1 = new Redis();
        $redisMock1->set('key1', 'value1');

        $redisMock2 = new Redis();
        $redisMock2->selectStorage('alternateStorage');

        $this->assert
            ->integer($redisMock1->exists('key1'))
            ->isEqualTo(1)
            ->integer($redisMock2->exists('key1'))
            ->isEqualTo(0)
        ;

        $redisMock2->set('key1', 'value2');

        $this->assert
            ->string($redisMock1->get('key1'))
            ->isEqualTo('value1')
            ->string($redisMock2->get('key1'))
            ->isEqualTo('value2')
        ;
    }

    /**
     * Check if the scan command works.
     * With options. (Scan can have a COUNT, or MATCH options).
     */
    public function testScanCommand()
    {
        $redisMock = new Redis();
        $redisMock->lpush('myKey', 'myValue');
        $redisMock->lpush('yourKey', 'yourValue');
        $redisMock->lpush('ourKi', 'ourValue');
        $redisMock->lpush('key4', 'value4');
        $redisMock->lpush('key5', 'value5');
        $redisMock->lpush('key6', 'value6');
        $redisMock->lpush('key7', 'value7');
        $redisMock->lpush('key8', 'value8');
        $redisMock->lpush('key9', 'value9');
        $redisMock->lpush('key10', 'value10');
        $redisMock->lpush('key11', 'value11');
        $redisMock->lpush('key12', 'value12');

        // It must return two values, start cursor after the first value of the list.
        $this->assert
            ->array($redisMock->scan(1, ['COUNT' => 2]))
            ->isEqualTo([3, [0 => 'yourKey', 1 => 'ourKi']]);


        // It must return all the values with match with the regex 'our' (2 keys).
        // And the cursor is defined after the default count (10) => the match has not terminate all the list.
        $this->assert
            ->array($redisMock->scan(0, ['MATCH' => '*our*']))
            ->isEqualTo([10, [0 => 'yourKey', 1 => 'ourKi']]);

        // Execute the match at the end of this list, the match not return an element (no one element match with the regex),
        // And the list is terminate, return the cursor to the start (0)
        $this->assert
            ->array($redisMock->scan(10, ['MATCH' => '*our*']))
            ->isEqualTo([0, []]);

    }

    public function testBitcountCommand()
    {
        $redisMock = new Redis();
        $redisMock->setbit('myKey', 0, 0);
        $redisMock->setbit('myKey', 1, 1);
        $redisMock->setbit('myKey', 2, 1);

        $this->assert->variable($redisMock->bitcount('myKey'))->isEqualTo(3);
        $this->assert->variable($redisMock->bitcount('otherKey'))->isEqualTo(0);
    }

    public function testGetbitCommand()
    {
        $redisMock = new Redis();

        $this->assert->variable($redisMock->getbit('myKey', 0))->isEqualTo(0);

        $redisMock->setbit('myKey', 0, 1);
        $this->assert->variable($redisMock->getbit('myKey', 0))->isEqualTo(1);
    }

    public function testSetbitCommand()
    {
        $redisMock = new Redis();

        $this->assert->variable($redisMock->getbit('myKey', 0))->isEqualTo(0);

        $returnValue = $redisMock->setbit('myKey', 0, 1);
        $this->assert->variable($returnValue)->isEqualTo(0);
        $returnValue = $redisMock->setbit('myKey', 0, 0);
        $this->assert->variable($returnValue)->isEqualTo(1);
    }
}
