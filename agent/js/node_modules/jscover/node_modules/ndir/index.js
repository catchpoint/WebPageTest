module.exports = process.env.NDIR_COV 
  ? require('./lib-cov/ndir')
  : require('./lib/ndir');