'use strict';

var debug = require('debug')('metalsmith:transclude-transform');
var hercule = require('hercule');
var async = require('async');
var path = require('path');
var minimatch = require('minimatch');
var stream = require('stream');
var matter = require('gray-matter');
var pointer = require('json-pointer');
var pickBy = require('lodash/pickBy');

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
  var _ref = options || {},
      _ref$permalinks = _ref.permalinks,
      permalinks = _ref$permalinks === undefined ? false : _ref$permalinks,
      _ref$folders = _ref.folders,
      folders = _ref$folders === undefined ? false : _ref$folders;

  return function (files, metalsmith, done) {
    var process = function process(file, key, cb) {
      // const contents = permalinks ? new Buffer(file.contents.toString().replace()) : file.contents;

      var resolvePermalinks = function resolvePermalinks(url, source, placeholder) {
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

      var resolveFolders = function resolveFolders(url, source, placeholder) {
        debug('>>> resolveFolders        :', url);
        var targetKey = path.join(path.dirname(key), url);
        var matches = Object.keys(files).filter(function (key) {
          return key.startsWith(targetKey);
        });
        debug('>>> Using targetKey               :', targetKey);
        if (matches.length == 0) {
          debug('>>> No target files found');
          return null;
        }
        debug('>>> Found target files            :', matches.join(' '));

        debug('#### : ', matches.map(function (value) {
          return value.replace(targetKey.split('/').slice(0, -1).join('/') + '/', '');
        }));
        return {
          content: matches.map(function (value) {
            return value.replace(targetKey.split('/').slice(0, -1).join('/') + '/', '');
          }).map(function (value) {
            return placeholder.replace(url, value);
          }).join('\n')
        };
      };

      // Return link if the target cannot be resolved.
      var resolvers = [
      /*resolvePermalinks, */resolveFolders, function (url, source, placeholder) {
        return { content: placeholder };
      }];

      hercule.transcludeString(file.contents, { resolvers }, function (err, result) {
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
        return cb(null, Object.assign({}, file, { contents: new Buffer(result) }));
      });

      // cb(null, permalinks ? { ...file, contents } : file);
    };

    async.mapValues(files, process, function (err, res) {
      if (err) throw err;
      Object.keys(files).forEach(function (key) {
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