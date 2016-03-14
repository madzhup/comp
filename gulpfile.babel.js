import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import del from 'del';
import babel from 'rollup-plugin-babel';
import mainBowerFiles from 'main-bower-files';

import proxyMiddleware from 'http-proxy-middleware';
import runSequence from 'run-sequence';

const $ = gulpLoadPlugins();

const injectFilesPaths = [
  '.tmp/**/*.js',
  '.tmp/**/*.css'
];

const bs = browserSync.create('Dev server');

let changedLayout = false;

gulp.task('styles', () => {
  return gulp.src('app/**/*.less')
    .pipe($.plumber())
    .pipe($.changed('.tmp', {extension: '.css'}))
    .pipe($.sourcemaps.init())
    .pipe($.less({
      paths: ['./']
    }))
    .pipe($.autoprefixer({
      browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']
    }))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('.tmp'))
    .pipe(bs.stream());
});

gulp.task('scripts', () => {
  return gulp.src('app/modules/main/main.js')
    .pipe($.plumber())
    .pipe($.rollup({
      format: 'umd',
      moduleName: 'app',
      sourceMap: true,
      plugins: [
        babel({
          presets: 'es2015-rollup',
          babelrc: false
        })
      ]
    }))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('.tmp'))
    .pipe(bs.stream());
});

gulp.task('templates', () => {
  return gulp.src(['app/pages/**/*.twig'])
    .pipe($.plumber())
    .pipe($.twig({
      data: {
        injectPath: '.tmp'
      }
    }))
    .pipe(gulp.dest('.tmp'))
    .pipe(bs.stream());
});

gulp.task('inject', () => {
  let modules = gulp.src(injectFilesPaths, {read: false});
  let bowerFiles = gulp.src(mainBowerFiles(), {read: false});

  return gulp.src(['app/_partials/scripts.twig', 'app/_partials/styles.twig'])
    .pipe($.inject(modules, {ignorePath: '.tmp'}))
    .pipe($.inject(bowerFiles, {name: 'bower'}))
    .pipe(gulp.dest('.tmp/_partials'));
});

gulp.task('modules', (cb) => {
  runSequence(['styles', 'scripts'], 'inject', 'templates', cb);
});

gulp.task('html', () => {
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

gulp.task('serve', ['nodemon', 'modules', 'fonts'], (cb) => {
  bs.init({
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

  gulp.watch([
    'app/**/*.{html,less,js}',
  ]).on('change', (event) => {
    if (event.type === 'added' || event.type === 'deleted') {
      gulp.start('inject');
    }
  });

  gulp.watch('app/**/*.twig', ['templates']);
  gulp.watch('app/**/*.less', ['styles']);
  gulp.watch('app/**/*.js', ['scripts']);
  gulp.watch('bower.json', ['inject']);
  gulp.watch(['app/fonts/**/*', 'bower.json'], ['fonts']);
});

gulp.task('serve:dist', () => {
  bs.init({
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
