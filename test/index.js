var rimraf = require('rimraf');
var assert = require('assert');
var equal = require('assert-dir-equal');
var Metalsmith = require('metalsmith');
var transclude = require('..');

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
});
