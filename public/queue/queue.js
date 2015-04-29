(function(){
  var app = angular.module("queue.queue", [
  'ui.bootstrap',
  'ngRoute'
  ]);
  
  app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/queue/:queue', {
        templateUrl: 'queue/queue.html',
        controller: 'queueController'
      });
  }])


  .controller('queueController', ['$scope', '$http', '$routeParams', '$location', '$modal', 'WebSocketService', 'UserService',
  function ($scope, $http, $routeParams, $location, $modal, socket, user) {
    $scope.queue = $routeParams.queue;
    $scope.name = user.getName();
    $scope.location = '';
    $scope.comment = '';
    $scope.users = [];
    $scope.bookedUsers = [];
    $scope.admin = user.isAdmin();
    $scope.loggedIn = user.getName() !== null && user.getName() !== "" && user.getName() !== undefined;
    $scope.enqueued = false;

    $scope.locked = true;
    $scope.hibernating = true;
    $scope.motd = "";
    $http.get('/API/queue/' + $routeParams.queue)
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

    //$http.get('/API/booked/' + $routeParams.queue)
    //  .success(function(response) {
    //  $scope.bookedUsers = response;
    //});

    $scope.newUser = true;

    socket.emit('stopListening', 'lobby');
    socket.emit('listen', $routeParams.queue);

    console.log('testing');

    // Listen for the person joining a queue event.
    socket.on('join', function(data) {
      if(data.name === $scope.name){
        $scope.enqueued = true;
      }
      $scope.$apply($scope.users.push({name:data.name, place:data.place, comment:data.comment, startTime:data.startTime}));
      console.log("data in queue join = " + data);
      console.log($scope.users);
    });

    // Listen for the person leaving a queue event.
    socket.on('leave', function(data) {
      if(data.name === $scope.name){
        $scope.enqueued = false;
      }
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
      console.log("Received message : " + data);
      var modalInstance = $modal.open({
        templateUrl: 'receiveMessage.html',
        controller: function ($scope, $modalInstance, title, message, sender) {
          $scope.title = title;
          $scope.message = message;
          $scope.sender = sender;
        },
        resolve: {
          title: function () {
            return "Message";
          },
          message: function () {
            return data.message;
          },
          sender: function () {
            return data.sender;
          }
        }
      });
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
      var modalInstance = $modal.open({
        templateUrl: 'receiveMessage.html',
        controller: function ($scope, $modalInstance, title, message, sender) {
          $scope.title = title;
          $scope.message = message;
          $scope.sender = sender;
        },
        resolve: {
          title: function () {
            return "Unclear location";
          },
          message: function () {
            return "You have to enter a more descriptive location.";
          },
          sender: function () {
            return "Anton Bäckström";
          }
        }
      });
    });

    $scope.addUser = function(){
      if(!$scope.locked && !$scope.hibernating){
        if($scope.location === ""){
          alert("You must enter a place.");
        }else{
          console.log("Current time = " + Date.now());
          socket.emit('join',
          {
            queue:$routeParams.queue,
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
          queue:$routeParams.queue,
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
        queue:$routeParams.queue,
        user:{name:name, place:tempPlace, comment:tempComment}
      });
      $scope.comment = '';
      console.log("Called removeUser");
    };

    // This function should remove every person in the queue
    $scope.purge = function(){
      console.log("Called purge");
      var modalInstance = $modal.open({
        templateUrl: 'purgeQueue.html',
        controller: function ($scope, $modalInstance) {
          $scope.purge = function () {
            $modalInstance.close("purge");
          };
          $scope.doNotPurge = function () {
            $modalInstance.close("");
          };
        },
        resolve: {}
      });

      modalInstance.result.then(function (message) {
        if(message === "purge"){
          socket.emit('purge', {
            queue:$routeParams.queue
          });
        }
      }, function () {});
    };

    // This function should lock the queue, preventing anyone from queueing
    $scope.lock = function(){
      console.log("Called lock");
      socket.emit('lock', {
        queue:$routeParams.queue
      });
      console.log("Leaving lock");
    };

    // This function should unlock the queue, alowing people to join the queue
    $scope.unlock = function(){
      socket.emit('unlock', {
        queue:$routeParams.queue
      });
      console.log("Called unlock");
    };

    // Mark the user as being helped
    $scope.helpUser = function(name){
      socket.emit('help', {
        queue:$routeParams.queue,
        name:name,
        helper:$scope.name
      });
      console.log("Called helpUser");
    };

    $scope.messageUser = function (name) {
      console.log("Entered messageUser");
      var modalInstance = $modal.open({
        templateUrl: 'enterMessage.html',
        controller: function ($scope, $modalInstance, title, buttonText) {
          $scope.title = title;
          $scope.buttonText = buttonText;
          $scope.ok = function () {
            $modalInstance.close($scope.message);
          };
        },
        resolve: {
          title: function () {
            return "Enter a message to " + name;
          },
          buttonText: function () {
            return "Send";
          }
        }
      });

      modalInstance.result.then(function (message) {
        console.log("Message = " + message);
        if(message !== null && message !== undefined){
          socket.emit('messageUser', {
            queue:$routeParams.queue,
            sender:$scope.name,
            name:name,
            message:message
          });
        }
      }, function () {});
    };

    // Function to add a message about that user
    $scope.flag = function(name){
      console.log("Entered flag");
      var modalInstance = $modal.open({
        templateUrl: 'enterMessage.html',
        controller: function ($scope, $modalInstance, title, buttonText) {
          $scope.title = title;
          $scope.buttonText = buttonText;
          $scope.ok = function () {
            $modalInstance.close($scope.message);
          };
        },
        resolve: {
          title: function () {
            return "Enter a comment about " + name;
          },
          buttonText: function () {
            return "Add comment";
          }
        }
      });

      modalInstance.result.then(function (message) {
        console.log("Message = " + message);
        if(message !== null && message !== undefined){
          socket.emit('flag', {
            queue:$routeParams.queue,
            sender:$scope.name,
            name:name,
            message:message
          });
        }
      }, function () {});
    };

    // Function to read comments about a user
    $scope.readMessages = function(name){
      console.log("Called readMessages");
      for(var index in $scope.users){
        if($scope.users[index].name == name){
          var modalInstance = $modal.open({
            templateUrl: 'readMessages.html',
            controller: function ($scope, $modalInstance, messages) {
              $scope.messages = messages;
            },
            resolve: {
              messages: function () {
                //return $scope.users[index].messages;
                return ["He is the greatest.","I have never met anyone more stupid.","Wow, what a genious.","F***ing moron ...","Hello, World!"];
              }
            }
          });
          break;
        }
      }
    };

    // Function to send a message to every user in the queue
    $scope.broadcast = function(){
      console.log("Called broadcast");
      var modalInstance = $modal.open({
        templateUrl: 'enterMessage.html',
        controller: function ($scope, $modalInstance, title, buttonText) {
          $scope.title = title;
          $scope.buttonText = buttonText;
          $scope.ok = function () {
            $modalInstance.close($scope.message);
          };
        },
        resolve: {
          title: function () {
            return "Enter a message to broadcast";
          },
          buttonText: function () {
            return "Broadcast";
          }
        }
      });

      modalInstance.result.then(function (message) {
        console.log("Message = " + message);
        if(message !== null && message !== undefined){
          socket.emit('broadcast', {
            queue:$routeParams.queue,
            message:message,
            sender: $scope.name
          });
        }
      }, function () {});
    };

    // Function to send a message to every TA handeling the queue
    $scope.broadcastTA = function(){
      console.log("Called broadcast");
      var modalInstance = $modal.open({
        templateUrl: 'enterMessage.html',
        controller: function ($scope, $modalInstance, title, buttonText) {
          $scope.title = title;
          $scope.buttonText = buttonText;
          $scope.ok = function () {
            $modalInstance.close($scope.message);
          };
        },
        resolve: {
          title: function () {
            return "Enter a message to broadcast to TAs";
          },
          buttonText: function () {
            return "Broadcast";
          }
        }
      });

      modalInstance.result.then(function (message) {
        console.log("Message = " + message);
        if(message !== null && message !== undefined){
          socket.emit('broadcastTA', {
            queue:$routeParams.queue,
            message:message,
            sender: $scope.name
          });
        }
      }, function () {});
    };

    // Function to send a message to a user
    $scope.badLocation = function(name){
      socket.emit('badLocation', {
        queue:$routeParams.queue,
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

  // This function should direct the user to the wanted page
  $scope.redirect = function(address){
    $location.path('/' + address);
    $scope.location = $location.path();
    console.log("location = " + $scope.location);
  };

  }]);
})();