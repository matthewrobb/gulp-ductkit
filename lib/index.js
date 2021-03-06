var gulp = require('gulp');

var Duct = exports.Duct = require('gulp-ductor');

var source = exports.source = Duct(function (stream, options) {
  options || (options = {});

  var plumber = require('gulp-plumber');

  var pipe = stream.pipe;

  pipe(gulp.src(options.src));
  pipe(plumber({
    handleError: function handleError(err) {
      console.log(err);
      this.emit('end');
    }
  }));
});

var fonts = exports.fonts = Duct(function (stream, options) {
  options || (options = {});

  var rename = require('gulp-rename');
  var flatten = require('gulp-flatten');

  var filter = stream.filter;
  filter('**/*.@(eot|svg|ttf|woff|woff2|otf)')
    .pipe(rename({
      dirname: 'fonts'
    }));
});

var babel = exports.babel = Duct(function (stream, options) {
  options || (options = {});

  var sourcemaps = require('gulp-sourcemaps');
  var babel = require('gulp-babel');

  var filter = stream.filter;
  var pipe = stream.pipe;

  filter(options.filter)
    .pipe(sourcemaps.init())
    .pipe(babel({
      modules: 'system',
      stage: 0
    }))
    .pipe(sourcemaps.write('.'));
});

var preprocess = exports.preprocess = Duct(function (stream, options) {
  options || (options = {});

  var preprocess = require('gulp-preprocess');

  var filter = stream.filter;

  (options.filters || [options.filter]).forEach(function(glob) {
    filter(glob).pipe(preprocess(options));
  });
});

/* Styles */
var styles = exports.styles = Duct(function (stream, options) {
  options || (options = {});

  var ignore = require('gulp-ignore');
  var sourcemaps = require('gulp-sourcemaps');
  var sass = require('gulp-sass');
  var autoprefixer = require('gulp-autoprefixer');

  var filter = stream.filter;
  var pipe = stream.pipe;

  filter(options.filter)
    .pipe(sourcemaps.init())
    .pipe(sass(options.sass).on('error', sass.logError))
    .pipe(sourcemaps.write({ sourceRoot: '.' }))
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(autoprefixer(options.autoprefixer))
    .pipe(sourcemaps.write('.', { sourceRoot: '.' }));

  pipe(ignore('**/*.scss'));
});

var optimize = exports.optimize = Duct(function (stream, options) {
  options || (options = {});

  var sourcemaps = require('gulp-sourcemaps');
  var rename = require('gulp-rename');
  var minifyCss = require('gulp-minify-css');
  var size = require('gulp-size');

  var copy = stream.copy;

  copy('**/!(*-legacy*).css')
    .pipe(rename({ suffix: '.min' }))
    .pipe(size({ title: 'CSS - Unoptimized' }))
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(minifyCss())
    .pipe(size({ title: 'CSS - Optimized' }))
    .pipe(sourcemaps.write('.', { sourceRoot: '.' }));
});

var legacy = exports.legacy = Duct(function (stream, options) {
  options || (options = {});

  var rename = require('gulp-rename');
  var postcss = require('gulp-postcss');
  var bless = require('gulp-bless');
  var wring = require('csswring');

  var copy = stream.copy;

  copy(['**/*.css'])
    .pipe(rename({ suffix: '-legacy' }))
    .pipe(bless({ log: true, sourceMaps: false }))
    .pipe(postcss([
      wring({
        removeAllComments: true,
        preserveHacks: true
      })
    ]));
});

var images = exports.images = Duct(function (stream, options) {
  options || (options = {});

  var imagemin = require('gulp-imagemin');
  var pngquant = require('imagemin-pngquant');
  var size = require('gulp-size');

  var filter = stream.filter;

  filter('images/**')
    .pipe(size({ title: 'Images - Uncompressed' }))
    .pipe(imagemin({
      optimizationLevel: 7,
      progressive: true,
      interlaced: true,
      use: [pngquant()]
    }))
    .pipe(size({ title: 'Images - Compressed' }));
});

var rev = exports.rev = Duct(function (stream, options) {
  options || (options = {});

  var RevAll = require('gulp-rev-all');

  var pipe = stream.pipe;
  var filter = stream.filter;
  var copy = stream.copy;

  var revAll = new RevAll(options.rev);

  filter(options.filter)
    .pipe(revAll.revision())
    .pipe(gulp.dest(options.dest))
    .pipe(revAll.manifestFile())
    .pipe(gulp.dest(options.dest));
});

var diffmerge = exports.diffmerge = Duct(function (stream, options) {
  options || (options = {});

  var filter = require('gulp-filter');
  var deleted = require('gulp-deleted');
  var changed = require('gulp-changed');

  var pipe = stream.pipe;

  pipe(deleted(options.dest, options.filter, { force: true }));
  pipe(changed(options.dest, {
    hasChanged: changed.compareSha1Digest
  }));
  pipe(filter('**/*.*'));
  pipe(gulp.dest(options.dest));
});

/* */

var dist = exports.dist = Duct(function (stream, config) {
  var pipe = stream.pipe;
  var copy = stream.copy;

  pipe(optimize());
  pipe(images());
  
  pipe(rev({
    filter: config.filters.rev,
    rev: config.rev,
    dest: config.path.temp
  }));
});

var build = exports.build = Duct(function (stream, config) {
  var pipe = stream.pipe;

  if (config.preprocess) {
    pipe(preprocess(config.preprocess));
  }
  
  pipe(babel({
    filter: config.filters.babel
  }));

  pipe(styles({
    filter: config.filters.sass,
    autoprefixer: config.autoprefixer,
    sass: config.sass
  }));

  if (config.legacy) {
    pipe(legacy(config));
  }

  pipe(fonts());
});