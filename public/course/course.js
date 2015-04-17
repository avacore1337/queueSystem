(function(){
  var app = angular.module("queue.course", [
  'ngRoute'
  ]);
  
  app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/course/:course', {
        templateUrl: 'course/course.html',
        controller: 'courseController'
      });
  }])


  .controller('courseController', ['$scope', '$http', '$routeParams', 'WebSocketService', 'UserService',
  function ($scope, $http, $routeParams, socket, user) {
    $scope.course = $routeParams.course;
    $scope.name = user.getName();
    $scope.location = '';
    $scope.comment = '';
    $scope.users = [];
    $scope.bookedUsers = [];
    $scope.admin = user.isAdmin();
    $scope.loggedIn = user.getName() !== "";
    $scope.enqueued = false;

    $scope.locked = true;
    $scope.hibernating = true;
    $scope.motd = "";
    $http.get('/API/queue/' + $routeParams.course)
    .success(function(response) {
      $scope.users = response.queue;
      $scope.locked = response.locked;
      $scope.hibernating = response.hibernating;
      $scope.motd = response.motd;
      for (var i = 0; i < $scope.users.length; i++) {
        $scope.users[i].optionsActivated = false;
        if($scope.users[i].name === $scope.name){
          $scope.enqueued = true;
        }
      }
      //if($scope.motd !== ""){
      //  alert($scope.motd);
      //}
    });

    $scope.bookedUsers = [
      {name:'Anton',  place:"Red 01" , comment:"Labb 1", time:"15:00"},
      {name:'Joakim',  place:"Red 06" , comment:"Labb 3", time:"15:30"},
      {name:'Per',  place:"Red 07" , comment:"Labb 2", time:"16:00"}
    ];

    //$http.get('/API/booked/' + $routeParams.course)
    //  .success(function(response) {
    //  $scope.bookedUsers = response;
    //});

    $scope.newUser = true;

    socket.emit('stopListening', 'lobby');
    socket.emit('listen', $routeParams.course);

    console.log('testing');

    // Listen for the person joining a queue event.
    socket.on('join', function(data) {
      $scope.$apply($scope.users.push({name:data.name, place:data.place, comment:data.comment, startTime:data.startTime}));
      console.log("data in course join = " + data);
      console.log($scope.users);
    });

    // Listen for the person leaving a queue event.
    socket.on('leave', function(data) {
      $scope.enqueued = false;
      for(var i = $scope.users.length - 1; i >= 0; i--) {
        if($scope.users[i].name === data.name) {
          $scope.$apply($scope.users.splice(i, 1));
        }
      }
    });

    // Listen for the person updateing a queue event.
    socket.on('update', function(data) {
      console.log(data);
      for(var i = $scope.users.length - 1; i >= 0; i--) {
        if($scope.users[i].name === data.name) {
          $scope.$apply($scope.users[i].comment = data.comment);
          $scope.$apply($scope.users[i].place = data.place);
          break;
        }
      }
      console.log($scope.users);
    });

    // Listen for an admin purging the queue.
    socket.on('purge', function() {
      $scope.$apply($scope.users = []);
      $scope.$apply($scope.enqueued = false);
    });

    // Listen for a message.
    socket.on('msg', function(data) {
      alert(data);
    });

    // Listen for a user getting flagged
    socket.on('flag', function(data) {
      for(var i = $scope.users.length - 1; i >= 0; i--) {
        if($scope.users[i].name === data.name) {
          $scope.$apply($scope.users[i].messages.push(data.message));
          break;
        }
      }
    });

    // Listen for a person getting help.
    socket.on('help', function(data) {
      for(var i = 0; i < $scope.users.length; i++){
        if($scope.users[i] === data.person){
          $scope.$apply($scope.users[i].gettingHelp = true);
          $scope.$apply($scope.users[i].helper = data.helper);
          break;
        }
      }
    });

    // Listen for locking the queue
    socket.on('lock', function(){
      $scope.$apply($scope.locked = true);
    });

    // Listen for unlocking the queue
    socket.on('unlock', function(){
      $scope.$apply($scope.locked = false);
    });

    // Listen for a badLocation warning
    socket.on('badLocation', function() {
      alert("You have to enter a more descriptive location.");
    });

    $scope.addUser = function(){
      if(!$scope.locked && !$scope.hibernating){
        if($scope.location === ""){
          alert("You must enter a place.");
        }else{
          $scope.enqueued = true;
          console.log("Current time = " + Date.now());
          socket.emit('join',
          {
            queue:$routeParams.course,
            user:{name:$scope.name, place:$scope.location, comment:$scope.comment, startTime:Math.round(Date.now()/1000)}
          });
          console.log("Called addUser");
        }
      }
    };

    $scope.updateUser = function(){
      if($scope.location === ""){
        alert("You must enter a place.");
      }else{
        socket.emit('update', {
          queue:$routeParams.course,
          user:{name:$scope.name, place:$scope.location, comment:$scope.comment}
        });
        console.log("Called updateUser");
      }
    };

    $scope.removeUser = function(name){
      var tempPlace = '';
      var tempComment = '';
      for(var user in $scope.users){
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
    };

    // This function should remove every person in the queue
    $scope.purge = function(){
      socket.emit('purge', {
        queue:$routeParams.course
      });
      console.log("Called purge");
    };

    // This function should lock the queue, preventing anyone from queueing
    $scope.lock = function(){
      console.log("Called lock");
      socket.emit('lock', {
        queue:$routeParams.course
      });
      console.log("Leaving lock");
    };

    // This function should unlock the queue, alowing people to join the queue
    $scope.unlock = function(){
      socket.emit('unlock', {
        queue:$routeParams.course
      });
      console.log("Called unlock");
    };

    // This function should hibernate the queue
    $scope.hibernate = function(){
      socket.emit('hibernate', {
        queue:$routeParams.course
      });
      console.log("Called hibernate");
    };

    // This function should wakeup the queue
    $scope.wakeup = function(){
      socket.emit('unhibernate', {
        queue:$routeParams.course
      });
      console.log("Called wakeup");
    };

    // Mark the user as being helped
    $scope.helpUser = function(name){
      socket.emit('help', {
        queue:$routeParams.course,
        name:name,
        helper:$scope.name
      });
      console.log("Called helpUser");
    };

    // Function to send a message to a user
    $scope.messageUser = function(name){
      var message = prompt("Enter a message for the user.","");
      if(message !== null){
        socket.emit('messageUser', {
          queue:$routeParams.course,
          sender:$scope.name,
          name:name,
          message:message
        });
      }
      console.log("Called messageUser");
    };

    // Function to add a message about that user
    $scope.flag = function(name){
      var message = prompt("Enter a comment.","");
      if(message !== null){
        socket.emit('flag', {
          queue:$routeParams.course,
          sender:$scope.name,
          name:name,
          message:message
        });
      }
      console.log("Called flag user");
    };

    // Function to read comments about a user
    $scope.readMessages = function(name){
      var string = "";
      for(var user in $scope.users){
        if(user.name == name){
          for(var s in user.comments){
            string = string + s + "\n";
          }
          break;
        }
      }
      alert(string);
      console.log("Called readMessages");
    };

    // Function to send a message to every user in the queue
    $scope.broadcast = function(){
      var message = prompt("Enter a message to broadcast.","");
      if(message !== null){
        socket.emit('broadcast', {
          queue:$routeParams.course,
          message:message,
          sender: $scope.name
        });
        console.log("Sent message : " + message);
      }
      console.log("Called broadcast");
    };

    // Function to send a message to every TA handeling the queue
    $scope.broadcastTA = function(){
      var message = prompt("Enter a message to broadcast.","");
      if(message !== null){
        socket.emit('broadcastTA', {
          queue:$routeParams.course,
          message:message,
          sender: $scope.name
        });
        console.log("Sent message : " + message);
      }
      console.log("Called broadcast");
    };

    // Function to send a message to a user
    $scope.badLocation = function(name){
      socket.emit('badLocation', {
        queue:$routeParams.course,
        name:name
      });
      console.log("Called badLocation");
    };

    // When an admin wants to see the admin options
     $scope.changeVisibility = function(name){
      for(var i = 0; i < $scope.users.length; i++){
        if($scope.users[i].name === name){
          $scope.users[i].optionsActivated = !$scope.users[i].optionsActivated;
          break;
        }
      }
    };

    // When aa teacher wants to remove the queue completely
     $scope.removeQueue = function(){
      if (confirm('Are you sure you want to remove this queue permanently?')) {
        socket.emit('removeQueue', {
          queue:$routeParams.course,
        });
      }
    };

  }]);
})();