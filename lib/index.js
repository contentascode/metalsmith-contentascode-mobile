'use strict';

const debug = require('debug')('metalsmith-transclude');
const hercule = require('hercule');
const async = require('async');
const fs = require('fs');
const path = require('path');
const minimatch = require('minimatch');

/**
 * Expose `plugin`.
 */

module.exports = plugin;

/**
 * Metalsmith plugin to manipulate metadata and file metadata.
 *
 * @return {Function}
 */

function plugin(options) {
  const { pattern = '**/*.md', permalink = false } = options || {};

  return function (files, metalsmith, done) {
    async.eachOf(files, (file, key, cb) => {
      let contents = file.contents.toString();

      debug('Transclusion %s', key);

      if (!minimatch(key, pattern)) {
        return cb(); // do nothing
      }

      // preprocess if using permalinks to simplify paths (without extension)
      if (permalink) {
        const transclusions = contents.match(/:\[([^\]]+)\]\(([^\)]+)\)/g);

        if (transclusions) transclusions.forEach(function (trans) {
          debug(trans);
          const target = path.join(path.dirname(key), trans.replace(/:\[([^\]]+)\]\(([^\)]+)\)/, '$2'));
          debug(target);

          if (fileExists(target)) {
            // target exists no change needed.
          } else if (fileExists(target + '.md')) {
            debug('Transclusion target rewrite (permalink) %s.md', target);
            contents = contents.replace(trans, trans.replace(/:\[([^\]]+)\]\(([^\)]+)\)/, ':[$1]($2.md)'));
          } else if (fileExists(target + '/index.md')) {
            debug('Transclusion target rewrite (permalink) %s/index.md', target);
            contents = contents.replace(trans, trans.replace(/:\[([^\]]+)\]\(([^\)]+)\)/, ':[$1]($2/index.md)'));
          } else {
            return cb(new Error('Error transcluding ' + file + ': cannot find transclusion target ' + target));
          }
        });
      }

      function resolveRelativeLocalUrl(url) {
        const isLocalUrl = /^[^ ()"']+/;

        if (!isLocalUrl.test(url)) return null;

        try {
          // const relativePath = path.dirname(sourcePath);
          const localUrl = path.join(metalsmith.source(), path.dirname(key), url);
          const content = fs.createReadStream(localUrl, { encoding: 'utf8' });

          return {
            content,
            url: localUrl
          };
        } catch (e) {
          if (e.code === 'ENOENT') {
            debug("Couldn't find the following file and skipped it. " + e.path);

            return cb();
          }
          throw e;
        }
      }

      const resolvers = [resolveRelativeLocalUrl];

      hercule.transcludeString(contents, { resolvers }, (err, result) => {
        if (err) return cb(err);
        // mutate global files array.
        file.contents = result;
        cb();
      });
    }, err => {
      if (err) return done(err);
      debug('Transcluded!');
      done();
    });
  };
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}