var debug = require('debug')('metalsmith-transclude');
var hercule = require('hercule');
var async = require('async');
var fs = require('fs');
var path = require('path');
var minimatch = require('minimatch');

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
  var pattern = options.pattern || '**/*.md';

  return function(files, metalsmith, done) {
    var errored = false;

    async.eachOf(
      files,
      (file, key, cb) => {
        // console.log('file', file);
        var contents = file.contents.toString();

        debug('Transclusion %s', key);

        if (!minimatch(key, pattern)) {
          cb(); // do nothing
        }

        // preprocess if using permalinks to simplify paths (without extension)
        if (options.permalink) {
          trans = contents.match(/:\[([^\]]+)\]\(([^\)]+)\)/g);

          if (trans)
            trans.forEach(function(trans) {
              debug(trans);
              target = path.join(path.dirname(key), trans.replace(/:\[([^\]]+)\]\(([^\)]+)\)/, '$2'));
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
                done(new Error('Error transcluding ' + file + ': cannot find transclusion target ' + target));
              }
            });
        }

        function resolveRelativeLocalUrl(url, sourcePath) {
          const isLocalUrl = /^[^ ()"']+/;

          if (!isLocalUrl.test(url)) return null;

          try {
            const relativePath = path.dirname(sourcePath);
            const localUrl = path.join(metalsmith.source(), path.dirname(key), url);
            const content = fs.createReadStream(localUrl, { encoding: 'utf8' });

            return {
              content,
              url: localUrl
            };
          } catch (e) {
            console.log(JSON.stringify(e));
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
      },
      err => {
        // console.log(err);
        if (err.code === 'ENOENT') {
          debug('Couldn\'t find the following file and skipped it. ' + err.path);
          done();
        }
        if (err) done(err);
        debug('Transcluded!');
        done();
      }
    );
  };
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}
