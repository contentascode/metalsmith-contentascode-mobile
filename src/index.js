const debug = require('debug')('metalsmith:transclude');
const hercule = require('hercule');
const async = require('async');
const path = require('path');
const minimatch = require('minimatch');
const stream = require('stream');

/**
 * Expose `plugin`.
 */

module.exports = plugin;

/**
 * Metalsmith plugin to transclude content.
 *
 * @return {Function}
 */

function plugin(options) {
  const { pattern = '**/*.md', permalink = false, comments = false } = options || {};

  return function(files, metalsmith, done) {
    const transcludedFiles = {};

    async.eachOfSeries(
      files,
      (file, key, cb) => {
        debug('Transclusion %s', key);

        if (!minimatch(key, pattern)) {
          return cb(); // do nothing
        }

        // TODO: Deal with this with hercule resolver.
        // preprocess if using permalinks to simplify paths (without extension)
        if (permalink) {
          debug('Work in progress.');
          // const transclusions = contents.match(/:\[([^\]]+)\]\(([^\)]+)\)/g);
          //
          // if (transclusions)
          //   transclusions.forEach(function(trans) {
          //     debug(trans);
          //     const target = path.join(path.dirname(key), trans.replace(/:\[([^\]]+)\]\(([^\)]+)\)/, '$2'));
          //     debug(target);
          //
          //     if (fileExists(target)) {
          //       // target exists no change needed.
          //     } else if (fileExists(target + '.md')) {
          //       debug('Transclusion target rewrite (permalink) %s.md', target);
          //       contents = contents.replace(trans, trans.replace(/:\[([^\]]+)\]\(([^\)]+)\)/, ':[$1]($2.md)'));
          //     } else if (fileExists(target + '/index.md')) {
          //       debug('Transclusion target rewrite (permalink) %s/index.md', target);
          //       contents = contents.replace(trans, trans.replace(/:\[([^\]]+)\]\(([^\)]+)\)/, ':[$1]($2/index.md)'));
          //     } else {
          //       return cb(new Error('Error transcluding ' + file + ': cannot find transclusion target ' + target));
          //     }
          //   });
        }

        // Content package transclusion resolution should work similarly to require() i.e.
        // `:[](tasks/walk-around)` in `~/.content/.../guided-tour/index.md` will look first in
        //    - workspace/activities/guided-tour/tasks/walk-around/index.md
        //    - workspace/activities/guided-tour/tasks/walk-around.md
        //    ...
        //    - probably just symlinked ??? workspace/toolkit/browse/activity/physical-assessment/guided-tour/tasks/walk-around.md
        //    - workspace/content.yml override?
        //    ...
        //    - ~/.content/.../guided-tour/tasks/walk-around/index.md
        //    - ~/.content/.../guided-tour/tasks/walk-around.md
        //    - ~/.content/content.yml mappings (this would allow sharing of tasks)

        function resolveMetalsmith(url) {
          // sourcePath is not needed as we are resolve files that are in the metalsmith file tree
          const isLocalUrl = /^[^ ()"']+/;
          if (!isLocalUrl.test(url)) return null;

          // const relativePath = path.dirname(sourcePath);
          const targetKey = path.join(path.dirname(key), url);
          const resolvedKey = (files[targetKey] && targetKey) || (files[targetKey + '.md'] && targetKey + '.md');
          if (!resolvedKey) return null;
          debug('Found target file:', resolvedKey);

          const content = new stream.Readable({ encoding: 'utf8' });
          if (comments) content.push(`<!-- transcluded from ${resolvedKey} -->`);
          content.push(files[resolvedKey].contents);
          content.push(null);

          return {
            content,
            url: path.join(metalsmith.source(), resolvedKey)
          };
        }

        function resolveMetalsmithPattern(url) {
          // console.log('resolveMetalsmithPattern.url', url);
          const isLocalUrl = /^[^ ()"']+/;
          if (!isLocalUrl.test(url)) return null;

          const targetKey = path.join(path.dirname(key), url);

          const matches = Object.keys(files).filter(key => key.match(targetKey));
          if (matches.length == 0) return null;
          debug('Found target file:', matches.join(' '));

          const content = new stream.Readable({ encoding: 'utf8' });

          matches.forEach(key => {
            content.push(`<!-- transcluded from ${key} -->`);
            content.push(files[key].contents);
          });
          content.push(null);

          return {
            content,
            url: path.join(metalsmith.source(), targetKey)
          };
        }

        // Resolve folder names (could happen earlier in the pipeline via views)
        //

        // function resolveRelativeLocalUrl(url, sourcePath) {
        //   const isLocalUrl = /^[^ ()"']+/;
        //   debug('resolveRelativeLocalUrl.before isLocal test');
        //   if (!isLocalUrl.test(url)) return null;
        //
        //   const relativePath = path.dirname(path.join(metalsmith.source(), sourcePath));
        //   const localUrl = path.join(relativePath, url);
        //   const content = fs.createReadStream(localUrl, { encoding: 'utf8' });
        //   debug('resolved to localUrl:', localUrl);
        //   return {
        //     content,
        //     url: localUrl
        //   };
        // }

        const resolvers = [
          resolveMetalsmith,
          resolveMetalsmithPattern,
          hercule.resolveLocalUrl /*, resolveRelativeLocalUrl */
        ];

        hercule.transcludeString(file.contents, { resolvers }, (err, result) => {
          if (err && err.code === 'ENOENT') {
            debug("Couldn't find the following file and skipped it. " + err.path);
            return cb();
          }
          if (err) return cb(err);
          // mutate global files array.
          debug('Finished processing file: ', key);
          if (result) transcludedFiles[key] = result;
          cb();
        });
      },
      err => {
        if (err) return done(err);
        Object.keys(transcludedFiles).forEach(key => {
          files[key].contents = transcludedFiles[key];
        });

        debug('Transcluded!');
        done();
      }
    );
  };
}
