
/**
 * Module dependencies.
 */

var FileStore = require('./stores/FileStore')
  , RedisStore = require('./stores/RedisStore');

/**
 * Expose `Jog`.
 */

exports = module.exports = Jog;

/**
 * Default log levels.
 */

exports.levels = ['debug', 'info', 'warn', 'error'];

/**
 * Expose stores.
 */

exports.FileStore = FileStore;
exports.RedisStore = RedisStore;

/**
 * Initialize a new `Jog` log with
 * the given `store`. The store must
 * implement:
 *
 *   - `add(obj)` to add a log object
 *   - `stream() => EventEmitter` to stream data
 *   - `stream({ end: false }) => EventEmitter` to stream data indefinitely
 *   - `clear(fn)` to clear the logs
 *
 * @param {Object} store
 * @param {Object} defaults
 * @api public
 */

function Jog(store, defaults) {
  if (!(this instanceof Jog)) return new Jog(store, defaults);
  this.store = store;
  this.defaults = defaults;
}

/**
 * Namespace with `obj`, returning a new `Jog`.
 *
 * Example:
 *
 *    var log = new Jog(store);
 *
 *    // use for all user related logs
 *    log = log.ns({ uid: user.id });
 *
 *    // use for all user video related logs (inherits uid from above)
 *    log = log.ns({ vid: video.id });
 *
 * @param {Object} obj
 * @return {Jog}
 * @api public
 */

Jog.prototype.ns = function(obj){
  var defaults = this.defaults;
  for (var key in defaults) {
    if (obj.hasOwnProperty(key)) continue;
    obj[key] = defaults[key];
  }
  return new Jog(this.store, obj);
};

/**
 * Write the given log `level`, `type`, and `attrs` object
 * to the store.
 *
 * @param {String} level
 * @param {String} type
 * @param {Object} attrs
 * @api public
 */

Jog.prototype.write = function(level, type, attrs){
  var defaults = this.defaults;
  attrs = attrs || {};
  attrs.level = level;
  attrs.type = type;

  // implicit timestamp
  attrs.timestamp = attrs.timestamp || Date.now();

  // merge defaults
  if (defaults) {
    Object.keys(defaults).forEach(function(key){
      attrs[key] = defaults[key];
    });
  }

  // add it to the store
  this.store.add(attrs);
  return this;
};

/**
 * Stream data from the store.
 *
 * @param {Object} options
 * @return {EventEmitter}
 * @api public
 */

Jog.prototype.stream = function(options){
  options = options || {};
  options.interval = options.interval || 2000;
  return this.store.stream(options);
};

/**
 * Clear the logging data.
 *
 * @param {Function} fn
 * @api public
 */

Jog.prototype.clear = function(fn){
  return this.store.clear(fn);
};

/**
 * Log level methods.
 */

exports.levels.forEach(function(level){
  Jog.prototype[level] = function(type, attrs){
    this.write(level, type, attrs);
  };
})