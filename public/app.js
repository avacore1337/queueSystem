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
        controller: 'queueListController'
      }).
      when('/course/:course', {
        templateUrl: 'course.html',
        controller: 'courseController'
      }).
      otherwise({
        redirectTo: '/list'
      });
  }]);
})();