import angular from 'angular';

let module = angular.module('app', []);

export default module;

angular.element(document).ready(() => {
  angular.bootstrap(document, ['app']);
});
