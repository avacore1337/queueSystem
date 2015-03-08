var queueControllers = angular.module('queueControllers', []);

queueControllers.controller('courseController', ['$scope', '$http', '$routeParams',
function ($scope,$http,$routeParams) {
  $scope.name = '';
  $scope.place = '';
  $scope.comment = '';
  $scope.users = [];
  $scope.admin = true;
  $http.get('/API/queue/' + $routeParams.course)
  .success(function(response) {
    $scope.users=response;
  });

  $scope.newUser = true;

  $scope.io = io.connect();

  $scope.io.emit('listen', $routeParams.course)

  console.log('testing')

  // Listen for the person joining a queue event.
  $scope.io.on('join', function(data) {
    console.log(data);
    $scope.$apply($scope.users.push({name:data.name, place:data.place, comment:data.comment}));
    console.log($scope.users);
  })

  // Listen for the person leaving a queue event.
  $scope.io.on('leave', function(data) {
    for(var i = $scope.users.length - 1; i >= 0; i--) {
      if($scope.users[i].name === data.name) {
        $scope.$apply($scope.users.splice(i, 1));
      }
    }
  })

  // Listen for the person updateing a queue event.
  $scope.io.on('update', function(data) {
    console.log(data);
    for(var i = $scope.users.length - 1; i >= 0; i--) {
      if($scope.users[i].name === data.name) {
        $scope.$apply($scope.users[i].comment = data.comment);
        $scope.$apply($scope.users[i].place = data.place);
      }
    }
    console.log($scope.users);
  })

  $scope.editUser = function(name) {
    var user;
    for (var i = 0; i < $scope.users.length; i++) {
      if($scope.users[i].name == name){
        user=$scope.users[i];
      }
    };
    $scope.newUser = false;
    $scope.name = user.name;
    $scope.place = user.place;
    $scope.comment = user.comment;
    console.log("Called editUser");
  }

  $scope.addUser = function(){
    // $scope.users.push({id:$scope.users.length, name:$scope.name, place:$scope.place, comment:$scope.comment});
      $scope.io.emit('join', 
        {
          queue:$routeParams.course,
          user:{name:$scope.name, place:$scope.place, comment:$scope.comment}
        })
      $scope.name = '';
      $scope.comment = '';
      $scope.place = '';
      console.log("Called addUser");
  }

  $scope.updateUser = function(){
    // $scope.users.push({id:$scope.users.length, name:$scope.name, place:$scope.place, comment:$scope.comment});
    $scope.io.emit('update', {
      queue:$routeParams.course,
      user:{name:$scope.name, place:$scope.place, comment:$scope.comment}
    })
    $scope.name = '';
    $scope.comment = '';
    $scope.place = '';
    $scope.newUser = true;
    console.log("Called updateUser");
  }

  $scope.removeUser = function(name){
    var tempPlace = '';
    var tempComment = '';
    for(user in $scope.users){
      if(name == user.name){
        tempPlace = user.place;
        tempComment = user.comment;
        break;
      }
    }
    console.log("tempPlace = " + tempPlace + " :  tempPlace = " + tempComment);
    $scope.io.emit('leave', {
      queue:$routeParams.course,
      user:{name:name, place:tempPlace, comment:tempComment}
    });
    $scope.name = '';
    $scope.comment = '';
    $scope.place = '';
    console.log("Called removeUser");
  }

  $scope.adminify = function(){
    $scope.admin = !$scope.admin;
  }

  // försökte implementera en funktion att placera någon längst ner i kön
  // reason: se ifall det gick att implementera nya metoder, det gick inte
  $scope.bottomUser = function(){
    $scope.io.emit('bottom', {
      queue:$routeParams.course,
      user:{name:$scope.name, place:$scope.place, comment:$scope.comment}
    });
    $scope.name = '';
    $scope.comment = '';
    $scope.place = '';
  }

}]);

queueControllers.controller('listController', ['$scope', '$http', '$location',
function ($scope, $http, $location) {
  // This should be taken from the backend
//  $scope.courses = ["dbas", "inda", "logik", "numme", "mvk"];                 //  <====== ersätt detta med backen, läsa?
  $scope.courses = [];
  $http.get('/API/courseList').success(function(response){
    $scope.courses = response;
  });

  console.log('testing');

  // This function should direct the user to the wanted page
  $scope.redirect = function(course){
    $location.path('/course/' + course);
    //console.log("User wants to enter " + course);
  }
}]);

queueControllers.controller('aboutController', ['$scope', '$http',
function ($scope, $http) {
  console.log('entered about.html');
}]);

queueControllers.controller('helpController', ['$scope', '$http',
function ($scope, $http) {
  console.log('entered help.html');
}]);
