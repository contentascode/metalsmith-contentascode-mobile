const rimraf = require('rimraf');
// let assert = require('assert');
const equal = require('assert-dir-equal');
const Metalsmith = require('metalsmith');
const transclude = require('..');

describe('metalsmith-transclude', function() {
  before(function(done) {
    rimraf('test/fixtures/*/build', done);
  });

  it('should transclude a simple file in a folder', function(done) {
    Metalsmith('test/fixtures/simple').use(transclude()).build(function(err) {
      if (err) return done(err);
      equal('test/fixtures/simple/build', 'test/fixtures/simple/expected');
      done();
    });
  });

  it('should skip missing missing files', function(done) {
    Metalsmith('test/fixtures/missing').use(transclude()).build(function(err) {
      if (err) return done(err);
      equal('test/fixtures/missing/build', 'test/fixtures/missing/expected');
      done();
    });
  });

  it('should build deep trees in order', function(done) {
    Metalsmith('test/fixtures/deep').use(transclude()).build(function(err) {
      if (err) return done(err);
      equal('test/fixtures/deep/build', 'test/fixtures/deep/expected');
      done();
    });
  });
});
