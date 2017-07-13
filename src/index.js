const debug = require('debug')('metalsmith:transclude');
const hercule = require('hercule');
const async = require('async');
const path = require('path');
const minimatch = require('minimatch');
const stream = require('stream');
const matter = require('gray-matter');
const pointer = require('json-pointer');

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
  const { pattern = '**/*.md', permalink = false, comments = false, frontmatter = false, verbose = true } =
    options || {};

  return function(files, metalsmith, done) {
    const processedFiles = {};

    async.eachOfSeries(
      files,
      (file, key, cb) => {
        debug('>> Processing %s', key);

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

        // TODO: Submit issue to hercule to allow returning context from resolver to avoid mutable state.
        const current_metadata = {};

        //

        function resolveMetalsmith(url, sourcePath) {
          debug('>>> resolveMetalsmith             :', url);
          sourcePath !== 'string' && debug('>>> SourcePath                    :', sourcePath);
          // sourcePath is not needed as we are resolve files that are in the metalsmith file tree
          const isLocalUrl = /^[^ ()"']+/;
          if (!isLocalUrl.test(url)) return null;

          // const relativePath = path.dirname(sourcePath);
          const targetKey = path.join(path.dirname(key), url);
          const resolvedKey = (files[targetKey] && targetKey) || (files[targetKey + '.md'] && targetKey + '.md');
          if (!resolvedKey) return null;
          debug('>>> Found target file          :', resolvedKey);

          const { content: transcluded, metadata = {} } = frontmatter
            ? extractFrontmatter(files[resolvedKey])
            : files[resolvedKey];
          // debug('Processes frontmatter. metadata', metadata);
          // debug('Processes frontmatter. transcluded', transcluded);

          // Local mutation.
          // current_metadata = { [url]: metadata };
          pointer.set(current_metadata, '/' + resolvedKey, metadata);

          const content = new stream.Readable({ encoding: 'utf8' });
          if (comments)
            content.push(
              `<!-- transcluded from ${resolvedKey} ${verbose ? 'with resolveMetalsmith.url(' + url + ')' : ''} -->\n`
            );
          content.push(transcluded.toString());
          content.push(null);

          return {
            content,
            url: sourcePath === 'string' ? resolvedKey : path.join(sourcePath, resolvedKey)
          };
        }

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

        // Resolve folder names (could happen earlier in the pipeline via views)

        function resolveMetalsmithPattern(url, sourcePath) {
          debug('>>> resolveMetalsmithPattern      :', url);
          sourcePath !== 'string' && debug('>>> SourcePath                    :', sourcePath);
          const isLocalUrl = /^[^ ()"']+/;
          if (!isLocalUrl.test(url)) return null;

          const targetKey = path.join(path.dirname(key), url);

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

          // TODO: Restrict this very broad string matching resolution.
          const matches = Object.keys(files).filter(key => key.match(targetKey));
          debug('>>> Using targetKey               :', targetKey);
          if (matches.length == 0) {
            debug('>>> No target files found');
            return null;
          }
          debug('>>> Found target files            :', matches.join(' '));

          const content = new stream.Readable({ encoding: 'utf8' });

          matches.forEach(key => {
            const { content: transcluded, metadata = {} } = frontmatter ? extractFrontmatter(files[key]) : files[key];
            // debug('Processes frontmatter.', metadata);

            // Local mutation.

            // Use json-pointer approach to construct a metadata tree
            // which mimics the file structure with the base path pointing to where
            // the file is transcluded.

            pointer.set(current_metadata, '/' + key, metadata);
            // current_metadata = {
            //   ...current_metadata,
            //   [url]: { ...current_metadata[url], [key.split('.')[0]]: metadata }
            // };

            content.push(
              `<!-- transcluded from ${key} ${verbose ? 'with resolveMetalsmithPattern.url(' + url + ')' : ''} ${verbose
                ? JSON.stringify(metadata)
                : ''} -->\n`
            );
            content.push(transcluded.toString());
          });

          content.push(null);

          return {
            content,
            url: sourcePath === 'string' ? targetKey + '/' : path.join(sourcePath, targetKey, '/')
          };
        }

        // Return placeholder content if the target cannot be resolved.
        function catchAll(url) {
          debug('>>> catchAll resolver             :', url);

          const content = new stream.Readable({ encoding: 'utf8' });
          content.push(url.toString());
          content.push(null);

          return {
            content,
            url
          };
        }

        const resolvers = [resolveMetalsmith, resolveMetalsmithPattern, catchAll];

        hercule.transcludeString(file.contents, { resolvers }, (err, result) => {
          // if (err && err.code === 'ENOENT') {
          //   debug("Couldn't find the following file and skipped it. " + err.path);
          //   return cb();
          // }
          if (err) {
            console.error(err);
            return cb(err);
          }
          // mutate global files array.
          debug('<< Finished processing file: ', key);
          processedFiles[key] = {};
          if (frontmatter) processedFiles[key].metadata = current_metadata;
          if (result) processedFiles[key].contents = result;
          return cb();
        });
      },
      err => {
        if (err) return done(err);
        Object.keys(processedFiles).forEach(key => {
          // TODO: might be best to avoid parsing twice the parent...
          // Add frontmatter to the end of the parent frontmatter
          const parsed = matter(processedFiles[key].contents.toString());
          // debug('matter. parsed', parsed);
          const contents = matter.stringify(parsed.content, Object.assign(parsed.data, processedFiles[key].metadata));
          // debug('matter.stringify contents', contents);

          // Add frontmatter as metadata as well.
          files[key] = Object.assign(files[key], processedFiles[key].metadata, {
            contents
          });
        });

        debug('Transcluded!');
        done();
      }
    );
  };

  // Based on metalsmith-matters

  /**
   * Assign metadata in `file` based on the YAML frontmatter in `file.contents`.
   *
   * @param {Object} file The Metalsmith file object to extract frontmatter from
   * @param {string} filePath The path to the file represented by `file`
   * @param {Object} options Options for the extraction routine
   * @param {Object} grayMatterOptions Options for gray-matter
   */

  function extractFrontmatter(file /*, filePath, grayMatterOptions*/) {
    // if (utf8(file.contents)) {
    let parsed;

    try {
      parsed = matter(file.contents.toString(), {} /* grayMatterOptions*/);
    } catch (e) {
      const errMsg = 'Invalid frontmatter in file';
      // if (filePath !== undefined) errMsg += ': ' + filePath;
      const err = new Error(errMsg);
      err.code = 'invalid_frontmatter';
      err.cause = e;
      throw err;
    }
    // require('debug')('test')('extractFrontmatter.parsed.content', parsed.content);
    // Return instead of mutating file.
    return { content: parsed.content, metadata: parsed.data };
  }
  // }
}
