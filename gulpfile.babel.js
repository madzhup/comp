import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import del from 'del';
import babel from 'rollup-plugin-babel';
import lazypipe from 'lazypipe';
import mainBowerFiles from 'main-bower-files';

import proxyMiddleware from 'http-proxy-middleware';

const $ = gulpLoadPlugins();

const srcFilesPaths = [
  'app/**/*.js',
  'app/**/*.less'
];

const tmpFilesPaths = [
  '.tmp/**/*.js',
  '.tmp/**/*.css',
  '.tmp/**/*.html'
];

const stylesPipe = lazypipe()
  .pipe($.sourcemaps.init)
  .pipe($.less, {
    paths: ['./']
  })
  .pipe($.autoprefixer, {
    browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']
  })
  .pipe($.sourcemaps.write)
  .pipe(browserSync.stream, {match: '**/*.css'});

const scriptsPipe = lazypipe()
  .pipe($.rollup, {
    format: 'umd',
    moduleName: 'app',
    sourceMap: true,
    plugins: [
      babel({
        presets: 'es2015-rollup',
        babelrc: false
      })
    ]
  })
  .pipe($.sourcemaps.write)
  .pipe(browserSync.stream, {match: '**/*.js', once: true});

gulp.task('modules', () => {
  return gulp.src(srcFilesPaths)
    .pipe($.plumber())
    .pipe($.changed('.tmp', {
      extension: '.css'
    }))
    .pipe($.if('*.js', scriptsPipe()))
    .pipe($.if('*.less', stylesPipe()))
    .pipe(gulp.dest('.tmp'));
});

gulp.task('templates', ['modules'], () => {
  let modules = gulp.src(tmpFilesPaths, {read: false});
  let bowerFiles = gulp.src(mainBowerFiles(), {read: false});

  return gulp.src('app/pages/**/*.html')
    .pipe($.plumber())
    .pipe($.changed('.tmp'))
    .pipe($.debug())
    .pipe($.twig())
    .pipe($.inject(modules, {ignorePath: '.tmp'}))
    .pipe($.inject(bowerFiles, {name: 'bower'}))
    .pipe(gulp.dest('.tmp'));
});

gulp.task('html', ['templates'], () => {
  return gulp.src('.tmp/*.html')
    .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe($.if('*.js', $.uglify()))
    .pipe($.if('*.css', $.cssnano()))
    .pipe($.if('*.html', $.htmlmin({collapseWhitespace: true})))
    .pipe(gulp.dest('dist'));
});

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
    .pipe($.if($.if.isFile, $.cache($.imagemin({
      progressive: true,
      interlaced: true,
      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{cleanupIDs: false}]
    }))
    .on('error', function(err) {
      console.log(err);
      this.end();
    })))
    .pipe(gulp.dest('dist/images'));
});

gulp.task('fonts', () => {
  return gulp.src(mainBowerFiles('**/*.{eot,svg,ttf,woff,woff2}', (err) => {})
    .concat('app/fonts/**/*'))
    .pipe(gulp.dest('.tmp/fonts'))
    .pipe(gulp.dest('dist/fonts'));
});

gulp.task('extras', () => {
  return gulp.src([
    'app/*.*',
    '!app/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('nodemon', (cb) => {
  return $.nodemon({
    script: 'server/app.js',
    watch: 'server',
    exec: './node_modules/.bin/babel-node'
  }).once('start', cb);
});

gulp.task('serve', ['nodemon', 'templates', 'fonts'], () => {
  browserSync({
    notify: false,
    open: false,
    port: 9000,
    server: {
      baseDir: ['.tmp', 'app'],
      routes: {
        '/bower_components': 'bower_components'
      },
      middleware: proxyMiddleware('/api', {target: 'http://localhost:5001'})
    }
  });

  gulp.watch(['app/**/*.html', 'bower.json'], ['templates']);
  gulp.watch(srcFilesPaths, ['modules']);
  gulp.watch(['app/fonts/**/*', 'bower.json'], ['fonts']);
});

gulp.task('serve:dist', () => {
  browserSync({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['dist']
    },
    open: false
  });
});

gulp.task('build', ['lint', 'html', 'images', 'fonts', 'extras'], () => {
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('default', ['clean'], () => {
  gulp.start('build');
});
