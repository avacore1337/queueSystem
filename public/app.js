(function(){
  var app = angular.module("queue", [
  'ngRoute',
  'queueControllers',
  'ui.bootstrap',
  'queue.queue',
  'admin.admin',
  'statistics.statistics',
  'googlechart'
  ]);

  app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/list', {
        templateUrl: 'list.html',
        controller: 'listController'
      }).
      when('/about', {
        templateUrl: 'about.html',
        controller: 'aboutController'
      }).
      when('/help', {
        templateUrl: 'help.html',
        controller: 'helpController'
      }).
      when('/login', {
        templateUrl: 'login.html',
        controller: 'loginController'
      }).
      otherwise({
        redirectTo: '/list'
      });
  }]);
})();
