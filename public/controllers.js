var queueControllers = angular.module('queueControllers', []);

queueControllers.controller('listController', ['$scope', '$http', '$location', 'UserService',
function ($scope, $http, $location, user) {
  $scope.admin = false;
  $scope.courses = [];
  $http.get('/API/courseList').success(function(response){
    $scope.courses = response.sort(function(a, b) {return a.name.localeCompare(b.name);});
  });

  $http.get('/API/userData').success(function(response){
    console.log("user data requested");
    console.log(response);
    user.setName(response.name);
    user.setAdmin(response.admin);
    $scope.admin = user.isAdmin();
  });

  console.log('listing');

  // This function should direct the user to the wanted page
  $scope.redirect = function(course){
    for(var index in $scope.courses){
      if($scope.courses[index].name === course){
        if(!$scope.courses[index].locked || $scope.admin){
          $location.path('/course/' + course);
        }
        break;
      }
    }
    //console.log("User wants to enter " + course);
  };
}]);

queueControllers.controller('aboutController', ['$scope', '$http',
function ($scope, $http) {
  console.log('entered about.html');
}]);

queueControllers.controller('helpController', ['$scope', '$http',
function ($scope, $http) {
  console.log('entered help.html');
}]);

queueControllers.controller('loginController', ['$scope', '$location', '$http',
function ($scope, $location, $http) {

  $scope.done = function () {
    $http.post('/API/setUser', {
      name: $scope.name,
      admin: $scope.type === 'admin'
    },
    {withCredentials: true}).success(function(response){
      console.log("with credentials success");
      $location.path('search');
      console.log("logged in");
    });
  };

}]);

queueControllers.controller('navigationController', ['$scope', '$location', 'UserService',
function ($scope, $location, user) {
  $scope.location = $location.path();
  
  // Robert look from here
  $scope.loggedIn = user.getName() !== "";
  $scope.name = user.getName();
  console.log("user = " + $scope.name);
  // Robert look to here

  // This function should direct the user to the wanted page
  $scope.redirect = function(address){
    $location.path('/' + address);
    $scope.location = $location.path();
    console.log("location = " + $scope.location);
  };
}]);

queueControllers.controller('adminController', ['$scope', '$location', '$http', 'UserService',
function ($scope, $location, $http, user) {
  console.log("Entered admin.html");
  $scope.admin = user.isAdmin();
  $scope.selectedQueue = undefined;
  $scope.dropdown = undefined;
  $scope.newAdmin = '';
  $scope.admins = [
    {name:'Anton',  id:'antbac'},
    {name:'Robert',  id:'robertwb'},
    {name:'Per',  id:'pernyb'}
  ];
  $scope.courses = [];
  $http.get('/API/courseList').success(function(response){
    $scope.courses = response;
  });

  //if(!$scope.admin){
  //  $location.path('/list');
    //Call unauthorized in listController
  //}

  $scope.createQueue = function(){
    if($scope.courseName !== ""){
      //socket.emit('createQueue', {
      //  name:queue
      //});
      console.log("Trying to create queue " + $scope.courseName);
      $scope.courseName = '';
    }
  };

  $scope.addAdmin = function(){
    if($scope.newAdmin !== ""){
      //socket.emit('addAdmin', {
      //  name:$scope.newAdmin
      //});
      console.log("Adding admin " + $scope.newAdmin);
      $scope.newAdmin = '';
    }
  };

  $scope.addTeacher = function(){
    if($scope.newTeacher !== "" && $scope.selectedQueue !== undefined){
      //socket.emit('addTeacher', {
      //  name:$scope.newTeacher,
      //  course:$scope.selectedQueue
      //});
      console.log("Adding teacher " + $scope.newTeacher + " in the course " + $scope.selectedQueue);
      $scope.newTeacher = '';
    }
  };

  $scope.addAssistant = function(){
    if($scope.newAssistant !== "" && $scope.selectedQueue !== undefined){
      //socket.emit('addAssistant', {
      //  name:$scope.newAssistant,
      //  course:$scope.selectedQueue
      //});
      console.log("Adding assistant " + $scope.newAssistant  + " in the course " + $scope.selectedQueue);
      $scope.newAssistant = '';
    }
  };

  $scope.selectQueue = function(queue){
    $scope.selectedQueue = queue;
    document.getElementById('dropdown').innerHTML = queue;
    console.log("selected queue = " + $scope.selectedQueue);
  };

}]);