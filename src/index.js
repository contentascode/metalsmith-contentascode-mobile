const debug = require('debug')('metalsmith:contentascode_mobile');
const async = require('async');
const path = require('path');
const match = require('multimatch');

/**
 * Expose `plugin`.
 */

module.exports = plugin;

/**
 * Metalsmith plugin to transform content for a contentascode mobile pipeline.
 *
 *
 * @param {Object} options
 *
 * @return {Function}
 */

function plugin(options) {
  const { destination, patterns = ['**/*.md'], install = true, expo: { name, slug, privacy } } = options || {};

  return function contentascode_mobile(files, metalsmith, done) {
    const process = (file, key, cb) => {
      if (match(key, patterns).length === 0) {
        debug('skip', key);
        return cb(); // do nothing
      }

      const { contents, raw, mode, paths, stats, ...metadata } = files[key];

      // Include markdown and metadata as symbols.
      const md = `const md = \`${contents.toString().replace(/`/g, '\\`')}\``;
      const meta = `const meta = { ${Object.keys(metadata)
        .map(k => `[\`${k}\`]: ${JSON.stringify(metadata[k])}`)
        .join(',')} }`;

      // Include images as a dictionary of requires
      const prefix = key
        .split('/')
        .slice(0, -1)
        .join('/');
      debug('prefix', prefix);

      const images =
        `const images = {` +
        Object.keys(files)
          .filter(k => k.startsWith(prefix) && (k.endsWith('.png') || k.endsWith('.jpg') || k.endsWith('.jpeg')))
          .map(k => k.replace(prefix, ''))
          .map(k => `[\`${path.join('.', k)}\`]: require("./${path.join('.', k)}")`)
          .join(',') +
        `}`;

      debug('images', images);
      // const images = { [`1_introduction.png`]: require('./1_introduction.png') };

      const js = md + '\n' + meta + '\n' + images + '\nexport { md, meta, images};';
      // Rename .md as .md.js

      return cb(null, { ...file, contents: new Buffer(js) });
    };

    // Add info for publishing on expo.io

    const expo = { name: name || metalsmith.pkg.description, slug: slug || metalsmith.pkg.name, privacy };

    debug('metalsmith', metalsmith);

    const json = require(path.join(metalsmith._destination, 'app.json'));

    const app = { ...json, expo: { ...json.expo, ...expo } };

    debug('app.json', JSON.stringify(app, true, 2));
    files['app.json'] = { contents: new Buffer(JSON.stringify(app, true, 2)) };

    async.mapValuesSeries(files, process, (err, res) => {
      if (err) throw err;
      Object.keys(files).forEach(key => {
        // debug('<< File keys: ', Object.keys(files[key]));
        // debug('<< Res keys: ', Object.keys(res[key]));
        if (match(key, patterns).length === 0) {
          debug('skip', key);
        } else if (res[key]) {
          delete files[key];
          files[path.join(destination, key + '.js')] = res[key];
        }
      });

      // Create overall index.js file with require dictionary.

      const index =
        `const index = {` +
        Object.keys(files)
          .filter(k => k.endsWith('.md.js'))
          .map(k => `[\`${path.join('.', k)}\`]: require("./${path.join('.', k)}")`)
          .join(',\n') +
        `}; \n export default index;`;

      files[path.join(destination, 'index.js')] = {
        contents: new Buffer(index)
      };

      done();
    });
  };
}
