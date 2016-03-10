import angular from 'angular';

let module = angular.module('app', []);

export default module;

module.config(($interpolateProvider) => {
  $interpolateProvider.startSymbol('{!');
  $interpolateProvider.endSymbol('!}');
});

angular.element(document).ready(() => {
  angular.bootstrap(document, ['app']);
});
