let rimraf = require('rimraf');
let assert = require('assert');
let equal = require('assert-dir-equal');
let Metalsmith = require('metalsmith');
let transclude = require('..');

describe('metalsmith-transclude', function() {
  before(function(done) {
    rimraf('test/fixtures/*/build', done);
  });

  it('should transclude a simple file in a folder', function(done) {
    Metalsmith('test/fixtures/simple').use(transclude()).build(function(err) {
      if (err) return done(err);
      equal('test/fixtures/simple/expected', 'test/fixtures/simple/build');
      done();
    });
  });

  it('should skip missing missing files', function(done) {
    Metalsmith('test/fixtures/missing').use(transclude()).build(function(err) {
      if (err) return done(err);
      equal('test/fixtures/missing/expected', 'test/fixtures/missing/build');
      done();
    });
  });

  it('should build deep trees in order', function(done) {
    Metalsmith('test/fixtures/deep').use(transclude()).build(function(err) {
      if (err) return done(err);
      equal('test/fixtures/deep/expected', 'test/fixtures/deep/build');
      done();
    });
  });
});
