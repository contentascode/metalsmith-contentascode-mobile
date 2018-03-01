const debug = require('debug')('metalsmith:contentascode_mobile');
const async = require('async');
const path = require('path');
const match = require('multimatch');
const spawnSync = require('child_process').spawnSync;
const spawn = require('child_process').spawn;
const fs = require('fs-extra');
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
  const {
    destination,
    patterns = ['**/*.md'],
    install = true,
    start = true,
    expo: { name, slug, privacy = 'private' } = {}
  } =
    options || {};

  return function contentascode_mobile(files, metalsmith, done) {
    const transform = (file, key, cb) => {
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
          .filter(
            k =>
              k.startsWith(prefix) &&
              (k.endsWith('.png') || k.endsWith('.jpg') || k.endsWith('.jpeg') || k.endsWith('.gif'))
          )
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
    const pkg = require(path.join(metalsmith._destination, '..', 'package.json'));

    const expo = {
      name: name || pkg.description,
      slug: slug || pkg.name,
      privacy,
      android: {
        package: `com.apprentice.${(slug || pkg.name).replace(/-/g, '_')}`,
        versionCode: parseInt(pkg.version.replace('.', '')),
        permissions: ['com.android.launcher.permission.INSTALL_SHORTCUT']
      }
    };

    debug('metalsmith', metalsmith);

    const json = require(path.join(metalsmith._destination, 'app.json'));

    const app = { ...json, expo: { ...json.expo, ...expo } };

    debug('app.json', JSON.stringify(app, true, 2));
    fs.writeFileSync(path.join(metalsmith._destination, 'app.json'), JSON.stringify(app, true, 2), 'utf-8');

    async.mapValuesSeries(files, transform, (err, res) => {
      if (err) throw err;
      Object.keys(files).forEach(key => {
        // debug('<< File keys: ', Object.keys(files[key]));
        // debug('<< Res keys: ', Object.keys(res[key]));
        if (match(key, patterns).length === 0) {
          debug('move', key);
          files[path.join(destination, key)] = files[key];
          delete files[key];
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
          .map(k => `[\`${path.relative('content', k)}\`]: require("./${path.relative('content', k)}")`)
          .join(',\n') +
        `}; \n export default index;`;

      files[path.join(destination, 'index.js')] = {
        contents: new Buffer(index)
      };

      const { watch, watchRun } = metalsmith.metadata();
      debug('watchRun', watchRun);
      if (watchRun !== true) {
        const npmInstall =
          install &&
          spawnSync('npm', ['install', '--silent'], {
            cwd: path.join(metalsmith._destination),
            stdio: 'inherit'
          });

        if (npmInstall.signal === 'SIGINT') {
          process.kill(process.pid, 'SIGINT');
        } else {
          const npmStart =
            start &&
            watch &&
            spawn('npm', ['start'], {
              cwd: path.join(metalsmith._destination),
              detached: true,
              stdio: 'inherit'
            });

          npmStart &&
            npmStart.on('exit', () => {
              process.kill(process.pid, 'SIGINT');
            });
        }
      }
      done();
    });
  };
}
