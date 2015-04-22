(function(){
  var app = angular.module("queue", [
  'ngRoute',
  'queueControllers',
  'queue.course'
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
      when('/admin', {
        templateUrl: 'admin.html',
        controller: 'adminController'
      }).
      when('/statistics', {
        templateUrl: 'statistics.html',
        controller: 'statisticsController'
      }).
      otherwise({
        redirectTo: '/list'
      });
  }]);
})();