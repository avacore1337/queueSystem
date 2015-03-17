(function(){
  var app = angular.module("queue", [
  'ngRoute',
  'queueControllers'
  ]);
  
  app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/list', {
        templateUrl: 'list.html',
        controller: 'listController'
      }).
      when('/course/:course', {
        templateUrl: 'course.html',
        controller: 'courseController'
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