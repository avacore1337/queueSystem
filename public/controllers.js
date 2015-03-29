var queueControllers = angular.module('queueControllers', []);

queueControllers.controller('courseController', ['$scope', '$http', '$routeParams', 'WebSocketService', 'UserService',
function ($scope, $http, $routeParams, socket, user) {
  $scope.course = $routeParams.course;
  $scope.name = user.getName();
  $scope.place = '';
  $scope.comment = '';
  $scope.users = [];
  $scope.bookedUsers = [];
  $scope.admin = user.isAdmin();
  $scope.loggedIn = !(user.getName() === "");
  $scope.enqueued = false;

  $http.get('/API/queue/' + $routeParams.course)
  .success(function(response) {
    $scope.users = response;
    for (var i = 0; i < $scope.users.length; i++) {
      if($scope.users[i].name === $scope.name){
        $scope.enqueued = true;
      }
    };
  });

  $scope.bookedUsers = [
    {name:'Anton',  place:"Red 01" , comment:"Labb 1", time:"15:00"},
    {name:'Joakim',  place:"Red 06" , comment:"Labb 3", time:"15:30"},
    {name:'Per',  place:"Red 07" , comment:"Labb 2", time:"16:00"}
  ];

  $scope.newUser = true;

  socket.emit('listen', $routeParams.course)

  console.log('testing');

  // Listen for the person joining a queue event.
  socket.on('join', function(data) {
    console.log(data);
    $scope.$apply($scope.users.push({name:data.name, place:data.place, comment:data.comment}));
    console.log($scope.users);
  })

  // Listen for the person leaving a queue event.
  socket.on('leave', function(data) {
    $scope.enqueued = false;
    for(var i = $scope.users.length - 1; i >= 0; i--) {
      if($scope.users[i].name === data.name) {
        $scope.$apply($scope.users.splice(i, 1));
      }
    }
  })

  // Listen for the person updateing a queue event.
  socket.on('update', function(data) {
    console.log(data);
    for(var i = $scope.users.length - 1; i >= 0; i--) {
      if($scope.users[i].name === data.name) {
        $scope.$apply($scope.users[i].comment = data.comment);
        $scope.$apply($scope.users[i].place = data.place);
      }
    }
    console.log($scope.users);
  })

  // Listen for an admin purging the queue.
  socket.on('purge', function() {
    $scope.$apply($scope.users = []);
  })

  // Listen for a message.
  socket.on('msg', function(data) {
    alert(data);
  })

  // Listen for a person getting help.
  socket.on('help', function(data) {
    for(var i = 0; i < $scope.users.length; i++){
      if($scope.users[i] === data.person){
        $scope.$apply($scope.users[i].gettingHelp = true);
        $scope.$apply($scope.users[i].helper = data.helper);
        break;
      }
    }
  })

  // Listen for a badLocation warning
  socket.on('badLocation', function() {
    alert("You have to enter a more descriptive location.");
  })

  $scope.addUser = function(){
    if($scope.place === ""){
      alert("You must enter a place.");
    }else{
      $scope.enqueued = true;
      // $scope.users.push({id:$scope.users.length, name:$scope.name, place:$scope.place, comment:$scope.comment});
      socket.emit('join', 
        {
          queue:$routeParams.course,
          user:{name:$scope.name, place:$scope.place, comment:$scope.comment}
        })
      console.log("Called addUser");
    }
  }

  $scope.updateUser = function(){
    // $scope.users.push({id:$scope.users.length, name:$scope.name, place:$scope.place, comment:$scope.comment});
    socket.emit('update', {
      queue:$routeParams.course,
      user:{name:$scope.name, place:$scope.place, comment:$scope.comment}
    })
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
    socket.emit('leave', {
      queue:$routeParams.course,
      user:{name:name, place:tempPlace, comment:tempComment}
    });
    $scope.comment = '';
    console.log("Called removeUser");
  }

  // This function should remove every person in the queue
  $scope.purge = function(){
    socket.emit('purge', {
      queue:$routeParams.course
    });
    console.log("Called purge");
  }

  // This function should lock the queue, preventing anyone from queueing
  $scope.lock = function(){
    socket.emit('lock', {
      queue:$routeParams.course
    });
    console.log("Called lock");
  }

  // Mark the user as being helped
  $scope.helpUser = function(name){
    socket.emit('help', {
      queue:$routeParams.course,
      name:name,
      helper:$scope.name
    });
    console.log("Called helpUser");
  }

  // Function to send a message to a user
  $scope.messageUser = function(name){
    var message = prompt("Enter a message for the user.","");
    if(message != null){
      socket.emit('messageUser', {
        queue:$routeParams.course,
        name:name,
        message:message
      });
    }
    console.log("Called messageUser");
  }

  // Function to send a message to every user in the queue
  $scope.broadcast = function(){
    var message = prompt("Enter a message to broadcast.","");
    if(message != null){
      socket.emit('broadcast', {
        queue:$routeParams.course,
        message:message
      });
      console.log("Sent message : " + message);
    }
    console.log("Called broadcast");
  }

  // Function to send a message to a user
  // TODO : Should also take an argument containing the message
  $scope.badLocation = function(name){
    socket.emit('badLocation', {
      queue:$routeParams.course,
      name:name
    });
    console.log("Called badLocation");
  }

}]);

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
  }

  $scope.unauthorized = function(){
    alert("You do not have the rights to enter that page.");
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

}])

queueControllers.controller('navigationController', ['$scope', '$location',
function ($scope, $location) {
  $scope.location = $location.path();

  // This function should direct the user to the wanted page
  $scope.redirect = function(address){
    $location.path('/' + address);
    $scope.location = $location.path();
    console.log("location = " + $scope.location);
  }
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
    if($scope.courseName != ""){
      //socket.emit('createQueue', {
      //  name:queue
      //});
      console.log("Trying to create queue " + $scope.courseName);
      $scope.courseName = '';
    }
  }

  $scope.addAdmin = function(){
    if($scope.newAdmin != ""){
      //socket.emit('addAdmin', {
      //  name:$scope.newAdmin
      //});
      console.log("Adding admin " + $scope.newAdmin);
      $scope.newAdmin = '';
    }
  }

  $scope.addTeacher = function(){
    if($scope.newTeacher != "" && $scope.selectedQueue != undefined){
      //socket.emit('addTeacher', {
      //  name:$scope.newTeacher,
      //  course:$scope.selectedQueue
      //});
      console.log("Adding teacher " + $scope.newTeacher + " in the course " + $scope.selectedQueue);
      $scope.newTeacher = '';
    }
  }

  $scope.addAssistant = function(){
    if($scope.newAssistant != "" && $scope.selectedQueue != undefined){
      //socket.emit('addAssistant', {
      //  name:$scope.newAssistant,
      //  course:$scope.selectedQueue
      //});
      console.log("Adding assistant " + $scope.newAssistant  + " in the course " + $scope.selectedQueue);
      $scope.newAssistant = '';
    }
  }

  $scope.selectQueue = function(queue){
    $scope.selectedQueue = queue;
    document.getElementById('dropdown').innerHTML = queue;
    console.log("selected queue = " + $scope.selectedQueue);
  }

}]);



















/* other prototypes


  // försökte implementera en funktion att placera någon längst ner i kön
  // reason: se ifall det gick att implementera nya metoder, det gick inte
  $scope.bottomUser = function(){
    socket.emit('bottom', {
      queue:$routeParams.course,
      user:{name:$scope.name, place:$scope.place, comment:$scope.comment}
    });
    $scope.name = '';
    $scope.comment = '';
    $scope.place = '';
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
    $scope.place = user.place;
    $scope.comment = user.comment;
    console.log("Called editUser");
  }


  //$http.get('/API/queue/booked/' + $routeParams.course)
  //.success(function(response) {
  //  $scope.bookedUsers = response;
  //});


*/
