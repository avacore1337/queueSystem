var queueControllers = angular.module('queueControllers', []);

queueControllers.controller('listController', ['$scope', '$http', '$location', 'WebSocketService', 'UserService',
function ($scope, $http, $location, socket, user) {
  $scope.admin = false;
  $scope.courses = [];
  $http.get('/API/courseList').success(function(response){
    $scope.courses = response.sort(function(a, b) {return a.name.localeCompare(b.name);});
  });

  console.log("API/userData");
  $http.get('/API/userData').success(function(response){
    console.log("user data requested");
    console.log(response);
    user.setName(response.name);
    user.setAdmin(response.admin);
    $scope.admin = user.isAdmin();
  });

  socket.emit('listen', 'lobby');

  // Listen for a person joining a queue.
  socket.on('lobbyjoin', function(queue) {
    console.log("A user joined (lobby) " + queue);
    $scope.$apply(getCourse(queue).length++);
  });

  // Listen for a person leaving a queue.
  socket.on('lobbyleave', function(queue) {
    console.log("A user left (lobby) " + queue);
    $scope.$apply(getCourse(queue).length--);
  });

  // Listen for queue geting purged.
  socket.on('lobbypurge', function(queue) {
    console.log(queue + " was purged (lobby)");
    $scope.$apply(getCourse(queue).length = 0);
  });

  // Listen for a queue being locked.
  socket.on('lobbylock', function(queue) {
    console.log(queue + " was locked (lobby)");
    $scope.$apply(getCourse(queue).locked = true);
  });

  // Listen for a queue being unlocked.
  socket.on('lobbyunlock', function(queue) {
    console.log(queue + " was unlocked (lobby)");
    $scope.$apply(getCourse(queue).locked = false);
  });

  // Listen for a queue going to sleep.
  socket.on('lobbyhibernate', function(queue) {
    console.log(queue + " was sent to sleep (lobby)");
    $scope.$apply(getCourse(queue).hibernating = true);
  });

  // Listen for a queue waking up.
  socket.on('lobbyunhibernate', function(queue) {
    console.log(queue + " was awoken (lobby)");
    $scope.$apply(getCourse(queue).hibernating = false);
  });

  function getCourse (queue) {
    for(var index in $scope.courses){
      if($scope.courses[index].name === queue){
        return $scope.courses[index];
      }
    }
  }
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

queueControllers.controller('statisticsController', ['$scope', '$http',
function ($scope, $http) {
  console.log('entered statistics.html');

// Queue selection
  $scope.courses = [];
  $http.get('/API/courseList').success(function(response){
    $scope.courses = response;
  });

  $scope.selectedQueue = undefined;
  $scope.selectQueue = function(queue){
    $scope.selectedQueue = queue;
    document.getElementById('dropdown').innerHTML = queue;
    console.log("selected queue = " + $scope.selectedQueue);
  };

// Date
  $scope.today = function() {
    $scope.dtFrom = new Date();
    $scope.dtTo = new Date();
    $scope.today = new Date();
  };
  $scope.today();

  $scope.open = function($event, opened) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope[opened] = true;
  };

// Time
  $scope.fromTime = new Date();
  $scope.fromTime.setHours(0);
  $scope.fromTime.setMinutes(0);
  $scope.toTime = new Date();

  $scope.hstep = 1;
  $scope.mstep = 5;

// Statistics
  $scope.getStatistics = function() {
    if($scope.dtFrom !== null && $scope.dtFrom !== undefined && $scope.dtTo !== null && $scope.dtTo !== undefined && $scope.selectedQueue !== undefined){
      $scope.statistics = [{description: "Unique students queueing", data: "50"},
      {description: "Students getting helped", data: "45"},
      {description: "Students left in queue when lab session ended", data: "5"},
      {description: "Number of TAs attending", data: "11"},
      {description: "Average time spent helping students", data: "5m 34s"},
      {description: "Number of students who left before receiving help", data: "7"}];
      console.log("Getting data from " + $scope.dtFrom + " " + $scope.fromTime);
      console.log("Getting data to " + $scope.dtTo + " " + $scope.toTime);
    }
  };

}]);

queueControllers.controller('loginController', ['$scope', '$location', '$http',
function ($scope, $location, $http) {

  $scope.done = function () {
    console.log("Reached done()");
    $http.post('/API/setUser', {
      name: $scope.name,
      admin: $scope.type === 'admin'
    },
    {withCredentials: true}).success(function(response){
      console.log("with credentials success");
      $location.path('list');
      console.log("logged in");
    });
  };

}]);

queueControllers.controller('navigationController', ['$scope', '$location', 'UserService',
function ($scope, $location, user) {
  $scope.location = $location.path();
  
  $scope.loggedIn = user.username !== undefined && user.username !== "";
  $scope.name = user.username;
  $scope.admin = user.admin;

  $scope.$watch(function () { return $location.path(); }, function(newValue, oldValue) {
    $scope.location = newValue;
    console.log("Detected update to $location.path() (oldValue = " + oldValue + ", newValue = " + newValue + ")");
  });
  
  $scope.$watch(function () { return user.username; }, function(newValue, oldValue) {
    $scope.name = newValue;
    $scope.loggedIn = user.username !== undefined && user.username !== "";
    console.log("Detected update to user.username (oldValue = " + oldValue + ", newValue = " + newValue + ")");
  });

  $scope.$watch(function () { return user.admin; }, function(newValue, oldValue) {
    $scope.admin = newValue;
    console.log("Detected update to user.admin (oldValue = " + oldValue + ", newValue = " + newValue + ")");
  });
  

  // This function should direct the user to the wanted page
  $scope.redirect = function(address){
    $location.path('/' + address);
    $scope.location = $location.path();
    console.log("location = " + $scope.location);
  };

  $(document).ready(function () {
    $(".navbar-nav li a").click(function(event) {
      $(".navbar-collapse").collapse('hide');
    });
  });
}]);

queueControllers.controller('adminController', ['$scope', '$location', '$http', '$modal', 'WebSocketService', 'UserService',
function ($scope, $location, $http, $modal, socket, user) {
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

  socket.emit('stopListening', 'lobby');
  socket.emit('listen', 'admin');

  // Listen for an assistant being added to a queue.
  socket.on('addAssistant', function(data) {
    $scope.$apply(getCourse(data.course).assistants.push(data.user));
  });

  // Listen for an teacher being added to a queue.
  socket.on('deleteAssistant', function(data) {
    for (var i = $scope.courses.length - 1; i >= 0; i--) {
      if($scope.courses[i].name == data.queue){
        for (var j = $scope.courses.assistants.length - 1; j >= 0; j--) {
          if($scope.courses.assistants[j] == data.user){
            $scope.$apply($scope.courses.splice(i, 1));
            break;
          }
        };
        break;
      }
    }
  });

  // Listen for an teacher being added to a queue.
  socket.on('addTeacher', function(data) {
    $scope.$apply(getCourse(data.course).teachers.push(data.user));
  });

  // Listen for an teacher being added to a queue.
  socket.on('deleteTeacher', function(data) {
    for (var i = $scope.courses.length - 1; i >= 0; i--) {
      if($scope.courses[i].name == data.queue){
        for (var j = $scope.courses.teachers.length - 1; j >= 0; j--) {
          if($scope.courses.teachers[j] == data.user){
            $scope.$apply($scope.courses.splice(i, 1));
            break;
          }
        };
        break;
      }
    }
  });

  // Listen for a queue being added.
  socket.on('addQueue', function(queue) {
    $scope.$apply($scope.courses.push(queue));
  });

  // Listen for the person leaving a queue event.
  socket.on('deleteQueue', function(queue) {
    for (var i = $scope.courses.length - 1; i >= 0; i--) {
      if(queue === $scope.courses[i].name){
        $scope.$apply($scope.courses.splice(i, 1));
      }
    }
  });

  function getCourse (queue) {
    for(var index in $scope.courses){
      if($scope.courses[index].name === queue){
        return $scope.courses[index];
      }
    }
  }

  $scope.createQueue = function(){
    if($scope.selectedQueue !== ""){
      socket.emit('createQueue', {
        queue:queue
      });
      console.log("Trying to create queue " + $scope.selectedQueue);
      $scope.selectedQueue = '';
    }
  };

  $scope.deleteQueue = function(){
    console.log("Called deleteQueue");
      var modalInstance = $modal.open({
        templateUrl: 'delete.html',
        controller: function ($scope, $modalInstance, title, message) {
          $scope.title = title;
          $scope.message = message;
          $scope.delete = function () {
            $modalInstance.close("delete");
          };
          $scope.doNotDelete = function () {
            $modalInstance.close("");
          };
        },
        resolve: {
          title: function () {
            return "Delete queue";
          },
          message: function () {
            return "Are you sure that you wish to remove " + $scope.selectedQueue + " permanently?";
          }
        }
      });

      modalInstance.result.then(function (message) {
        socket.emit('deleteQueue', {
          queue:queue
        });
        console.log("Trying to delete queue " + $scope.selectedQueue);
        $scope.selectedQueue = '';
      }, function () {});
    };

  $scope.hibernateQueue = function(){
    if($scope.selectedQueue !== ""){
      socket.emit('hibernate', {
        queue:queue
      });
      console.log("Trying to hibernate queue " + $scope.selectedQueue);
      $scope.selectedQueue = '';
    }
  };

  $scope.unhibernateQueue = function(){
    if($scope.selectedQueue !== ""){
      socket.emit('unhibernate', {
        queue:queue
      });
      console.log("Trying to unhibernate queue " + $scope.selectedQueue);
      $scope.selectedQueue = '';
    }
  };

  $scope.addAdmin = function(){
    if($scope.newAdmin !== ""){
      socket.emit('addAdmin', {
        name:$scope.newAdmin
      });
      console.log("Adding admin " + $scope.newAdmin);
      $scope.newAdmin = '';
    }
  };

  $scope.removeAdmin = function(){
    if($scope.newAdmin !== ""){
      socket.emit('removeAdmin', {
        name:$scope.newAdmin
      });
      console.log("Removing admin " + $scope.newAdmin);
      $scope.newAdmin = '';
    }
  };

  $scope.addTeacher = function(){
    if($scope.newTeacher !== "" && $scope.selectedQueue !== undefined){
      socket.emit('addTeacher', {
        name:$scope.newTeacher,
        course:$scope.selectedQueue
      });
      console.log("Adding teacher " + $scope.newTeacher + " in the course " + $scope.selectedQueue);
      $scope.newTeacher = '';
    }
  };

  $scope.removeTeacher = function(){
    if($scope.newTeacher !== "" && $scope.selectedQueue !== undefined){
      socket.emit('removeTeacher', {
        name:$scope.newTeacher,
        course:$scope.selectedQueue
      });
      console.log("Removing teacher " + $scope.newTeacher + " in the course " + $scope.selectedQueue);
      $scope.newTeacher = '';
    }
  };

  $scope.addAssistant = function(){
    if($scope.newAssistant !== "" && $scope.selectedQueue !== undefined){
      socket.emit('addAssistant', {
        name:$scope.newAssistant,
        course:$scope.selectedQueue
      });
      console.log("Adding assistant " + $scope.newAssistant  + " in the course " + $scope.selectedQueue);
      $scope.newAssistant = '';
    }
  };

    $scope.removeAssistant = function(){
    if($scope.newAssistant !== "" && $scope.selectedQueue !== undefined){
      socket.emit('removeAssistant', {
        name:$scope.newAssistant,
        course:$scope.selectedQueue
      });
      console.log("Removing assistant " + $scope.newAssistant  + " in the course " + $scope.selectedQueue);
      $scope.newAssistant = '';
    }
  };

  $scope.selectQueue = function(queue){
    $scope.selectedQueue = queue;
    document.getElementById('dropdown').innerHTML = queue;
    console.log("selected queue = " + $scope.selectedQueue);
  };

}]);