const debug = require('debug')('metalsmith:transclude-transform');
const hercule = require('hercule');
const async = require('async');
const path = require('path');
const minimatch = require('minimatch');
const stream = require('stream');
const matter = require('gray-matter');
const pointer = require('json-pointer');
const pickBy = require('lodash/pickBy');

/**
 * Expose `plugin`.
 */

module.exports = plugin;

/**
 * Metalsmith plugin to transclude content.
 *
 *
 * @param {Object} options
 * @param {string} options.frontmatter Include frontmatter in parent file.
 *
 * @return {Function}
 */

// It feels like a better separation of concerns (particularly to help troubleshoot)
// to have the frontmatter included as yaml in the parent file's content rather than in
// its metadata key. Maybe this could be an option (but I'm not sure how the recursive hercule
// resolution would deal with nested keys whereas the current approach should be more predictable)

function plugin(options) {
  const { permalinks = false, folders = false } = options || {};

  return function(files, metalsmith, done) {
    const process = (file, key, cb) => {
      // const contents = permalinks ? new Buffer(file.contents.toString().replace()) : file.contents;

      const resolvePermalinks = (url, source, placeholder) => {
        debug('>>> resolvePermalinks      :', url);
        // const targetKey = path.join(path.dirname(key), url);
        // const matches = Object.keys(files).filter(key => key.startsWith(targetKey));
        return { content: placeholder };
      };

      // # Invariants:
      //
      // ## patterns commute with juxtaposition
      //
      // :[](browse/activity)
      // :[](browse/context)
      // :[](browse/framework)
      //
      // process to the same as
      // :[](browse)
      //
      // where browse is a folder containing activity.md / context.md / framework.md

      const resolveFolders = (url, source, placeholder) => {
        debug('>>> resolveFolders        :', url);
        const targetKey = path.join(path.dirname(key), url);
        const matches = Object.keys(files).filter(key => key.startsWith(targetKey));
        debug('>>> Using targetKey               :', targetKey);
        if (matches.length == 0) {
          debug('>>> No target files found');
          return null;
        }
        debug('>>> Found target files            :', matches.join(' '));

        return {
          content: matches
            .map(value => value.replace(targetKey.split('/').slice(0, -1).join('/') + '/', ''))
            .map(value => placeholder.replace(url, value))
            .join('\n')
        };
      };

      // Return link if the target cannot be resolved.
      const resolvers = [
        /*resolvePermalinks, */ resolveFolders,
        (url, source, placeholder) => ({ content: placeholder })
      ];

      hercule.transcludeString(file.contents, { resolvers }, (err, result) => {
        // if (err && err.code === 'ENOENT') {
        //   debug("Couldn't find the following file and skipped it. " + err.path);
        //   return cb();
        // }
        if (err) {
          console.error(err);
          return cb(err);
        }
        // debug('<< Result: ', result);
        debug('<< Finished processing file: ', key);
        return cb(null, { ...file, contents: new Buffer(result) });
      });

      // cb(null, permalinks ? { ...file, contents } : file);
    };

    async.mapValues(files, process, (err, res) => {
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
    // const newFiles = async.seriesOf(
    //   files,
    //   (file, key, cb) => {
    //     debug('>> Processing %s', key);
    //
    //
    //
    //   },
    //   err => {
    //     if (err) return done(err);
    //     Object.keys(processedFiles).forEach(key => {
    //       // TODO: might be best to avoid parsing twice the parent...
    //       // Add frontmatter to the end of the parent frontmatter
    //       const parsed = matter(processedFiles[key].contents.toString());
    //       // debug('matter. parsed', parsed);
    //       const contents = matter.stringify(parsed.content, Object.assign(parsed.data, processedFiles[key].metadata));
    //       // debug('matter.stringify contents', contents);
    //
    //       // Add frontmatter as metadata as well.
    //       files[key] = Object.assign(files[key], processedFiles[key].metadata, {
    //         contents
    //       });
    //     });
    //
    //     debug('Transcluded!');
    //     done();
    //   }
    // );
  };
}
