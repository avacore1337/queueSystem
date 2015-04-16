var queueControllers = angular.module('queueControllers', []);

queueControllers.controller('listController', ['$scope', '$http', '$location', 'UserService',
function ($scope, $http, $location, user) {
  $scope.courses = [];
  $http.get('/API/courseList').success(function(response){
    $scope.courses = response;
  });

  $http.get('/API/userData').success(function(response){
    console.log("user data requested");
    console.log(response);
    user.setName(response.name);
    user.setAdmin(response.admin);
  });

  console.log('listing');

  // This function should direct the user to the wanted page
  $scope.redirect = function(course){
    $location.path('/course/' + course);
    //console.log("User wants to enter " + course);
  };

  $scope.unauthorized = function(){
    alert("You do not have the rights to enter that page.");
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



















/* other prototypes


  // försökte implementera en funktion att placera någon längst ner i kön
  // reason: se ifall det gick att implementera nya metoder, det gick inte
  $scope.bottomUser = function(){
    socket.emit('bottom', {
      queue:$routeParams.course,
      user:{name:$scope.name, place:$scope.location, comment:$scope.comment}
    });
    $scope.name = '';
    $scope.comment = '';
    $scope.location = '';
  }


    // This function should remove the queue, and it should prompt the user for another accept
  $scope.removeQueue = function(){
    //socket.emit('removeQueue', {
    //  queue:$routeParams.course
    //});
    console.log("Called removeQueue");
  }


  // Listen for a message
  //socket.on('messageUser', function(data) {
  //  $scope.message = data;
  //})

  // Listen the help message.
  //socket.on('help', function(data) {
  //  $scope.$apply($scope.users = data);
  //})

  // Listen for the person being put to the bottom of queue event.
  socket.on('bottom', function(data) {
    for(var i = $scope.users.length - 1; i >= 0; i--) {
      if($scope.users[i].name === data.name) {
        var user = $scope.users[i];
        $scope.$apply($scope.users.splice(i, 1));
      }
    }
    console.log(data);
    $scope.$apply($scope.users.push(user));
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
    $scope.location = user.place;
    $scope.comment = user.comment;
    console.log("Called editUser");
  }


  //$http.get('/API/queue/booked/' + $routeParams.course)
  //.success(function(response) {
  //  $scope.bookedUsers = response;
  //});


*/
