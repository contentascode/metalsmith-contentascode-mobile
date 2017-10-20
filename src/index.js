const debug = require('debug')('metalsmith:transclude-transform');
const async = require('async');
const path = require('path');
const match = require('multimatch');

/**
 * Expose `plugin`.
 */

module.exports = plugin;

/**
 * Metalsmith plugin to transform content before transclusion.
 *
 *
 * @param {Object} options
 * @param {string} options.frontmatter Include frontmatter in parent file.
 *
 * @return {Function}
 */

function plugin(options) {
  const { patterns = ['**/*.md'], permalinks = false, folders = false } = options || {};

  return function transclude_transform(files, metalsmith, done) {
    const process = (file, key, cb) => {
      if (match(key, patterns).length === 0) {
        debug('skip', key);
        return cb(); // do nothing
      }

      const resolveFolders = (url, source, placeholder) => {
        debug('>>> resolveFolders        :', url);
        const targetKey = path.join(path.dirname(key), url);
        const matches = Object.keys(files).filter(key => key.startsWith(targetKey));
        debug('>>> Using targetKey       :', targetKey);
        if (matches.length == 0) {
          debug('>>> No target files found');
          return null;
        }
        debug('>>> Found target files    :', matches.join(' '));

        const content = matches
          .map(value =>
            path.join(
              url,
              value.replace(
                targetKey
                  .split(url + '/')
                  .slice(-1)
                  .join('/'),
                ''
              )
            )
          )
          .map(value => placeholder.replace(url, value))
          .join('\n');

        debug('>>> Content               :', content);

        return content;
      };

      const transclusion = /\s:\[.*\]\((\S*)\s?(\S*)\)/g;

      const replacer = (placeholder, url) => resolveFolders(url, key, placeholder) || placeholder;

      const contents = file.contents.toString().replace(transclusion, replacer);

      return cb(null, { ...file, contents: new Buffer(contents) });
    };

    // const process_old = (file, key, cb) => {
    //
    //   const resolvePermalinks = (url, source, placeholder) => {
    //     debug('>>> resolvePermalinks      :', url);
    //     // const targetKey = path.join(path.dirname(key), url);
    //     // const matches = Object.keys(files).filter(key => key.startsWith(targetKey));
    //     return { content: placeholder };
    //   };
    //
    //   // # Invariants:
    //   //
    //   // ## patterns commute with juxtaposition
    //   //
    //   // :[](browse/activity)
    //   // :[](browse/context)
    //   // :[](browse/framework)
    //   //
    //   // process to the same as
    //   // :[](browse)
    //   //
    //   // where browse is a folder containing activity.md / context.md / framework.md
    //
    //
    //   const resolveFolders = (url, source, placeholder) => {
    //     debug('>>> resolveFolders        :', url);
    //     const targetKey = path.join(path.dirname(key), url);
    //     const matches = Object.keys(files).filter(key => key.startsWith(targetKey));
    //     debug('>>> Using targetKey       :', targetKey);
    //     if (matches.length == 0) {
    //       debug('>>> No target files found');
    //       return null;
    //     }
    //     debug('>>> Found target files    :', matches.join(' '));
    //
    //     const content = matches
    //       .map(value => path.join(url, value.replace(targetKey.split(url + '/').slice(-1).join('/'), '')))
    //       .map(value => placeholder.replace(url, value))
    //       .join('\n');
    //
    //     debug('>>> Content               :', content);
    //
    //     return {
    //       content
    //     };
    //   };
    //
    //   // Return link if the target cannot be resolved.
    //   const resolvers = [
    //     /*resolvePermalinks, */ resolveFolders,
    //     (url, source, placeholder) => ({ content: placeholder })
    //   ];
    //
    //
    //
    //   hercule.transcludeString(file.contents, { resolvers }, (err, result) => {
    //     // if (err && err.code === 'ENOENT') {
    //     //   debug("Couldn't find the following file and skipped it. " + err.path);
    //     //   return cb();
    //     // }
    //     if (err) {
    //       console.error(err);
    //       return cb(err);
    //     }
    //     // debug('<< Result: ', result);
    //     debug('<< Finished processing file: ', key);
    //     return cb(null, { ...file, contents: new Buffer(result) });
    //   });
    // };

    async.mapValuesSeries(files, process, (err, res) => {
      if (err) throw err;
      Object.keys(files).forEach(key => {
        // debug('<< File keys: ', Object.keys(files[key]));
        // debug('<< Res keys: ', Object.keys(res[key]));
        if (res[key]) {
          files[key] = res[key];
        } else {
          delete files[key];
        }
      });
      done();
    });
  };
}
