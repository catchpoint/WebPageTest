
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , debug = require('debug')('jog:redis')
  , redis = require('redis');

/**
 * Expose `RedisStore`.
 */

module.exports = RedisStore;

/**
 * Initialize a `RedisStore` with optional `client` and `key`.
 *
 * @param {RedisClient} client
 * @param {String} key
 * @api public
 */

function RedisStore(client, key) {
  this.db = client || redis.createClient();
  this.key = key || 'jog';
  this.rangeSize = 300;
}

/**
 * Add `obj` to redis.
 *
 * @param {Object} obj
 * @api private
 */

RedisStore.prototype.add = function(obj){
  debug('add %j', obj);
  this.db.rpush(this.key, JSON.stringify(obj));
};

/**
 * Clear and invoke `fn()`.
 *
 * @param {Function} fn
 * @api private
 */

RedisStore.prototype.clear = function(fn){
  debug('clear');
  this.db.del(this.key, fn);
};

/**
 * Return an `EventEmitter` which emits "data"
 * and "end" events.
 *
 * @param {Object} options
 * @return {EventEmitter}
 * @api private
 */

RedisStore.prototype.stream = function(options){
  var emitter = new EventEmitter
    , options = options || {}
    , size = this.rangeSize
    , key = this.key
    , db = this.db
    , self = this
    , start = 0;

  function emit(vals) {
    vals.forEach(function(val){
      emitter.emit('data', JSON.parse(val));
    });
  }

  function fetch() {
    var stop = start + size;
    debug('lrange %s %s..%s', key, start, stop);
    db.lrange(key, start, stop, function(err, vals){
      if (err) return emitter.emit('error', err);
      emit(vals);
      start += vals.length;
      if (false === options.end) {
        setTimeout(fetch, options.interval);
      } else {
        if (vals.length) return fetch();
        else emitter.emit('end');
      }
    });
  }

  fetch();

  return emitter;
};
