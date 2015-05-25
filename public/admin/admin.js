(function(){
  var app = angular.module("admin.admin", [
    'ui.bootstrap',
    'ngRoute'
    ])
  
  .config(['$routeProvider',
    function($routeProvider) {
      $routeProvider.
      when('/administration', {
        templateUrl: 'admin/administration.html',
        controller: 'adminController'
      });
    }])


  .controller('adminController', ['$scope', '$location', '$http', '$modal', 'WebSocketService', 'UserService', 'TitleService',
    function ($scope, $location, $http, $modal, socket, user, title) {
      $scope.$on('$destroy', function (event) {
        socket.removeAllListeners();
      });
      title.title = "Admin | Stay A While";
      console.log("Entered admin.html");
      $scope.name = user.getName();
      $scope.selectedQueue = undefined;
      $scope.dropdown = undefined;
      $scope.admins = [];
      $http.get('/API/adminList').success(function(response){
        $scope.admins = response;
      });

      $scope.queues = [];
      $http.get('/API/queueList').success(function(response){
        for (var i in response) {
          if(user.isAdmin() || user.isTeacher(response[i].name)){
            $http.get('/API/queue/' + response[i].name).success(function(resp){ 
              $scope.queues.push(resp);
              $scope.queues = $scope.queues.sort(function(a, b) {return a.name.localeCompare(b.name);});
            });
          }
        }
      });

    socket.emit('stopListening', 'lobby');
    socket.emit('listen', 'admin');

    // Listen for an assistant being added to a queue.
    socket.on('addAssistant', function (data) {
      console.log("adding assistant (from backend) queueName = " + data.queueName + ", name = " + data.name + ", username = " + data.username);
      var queue = getQueue(data.queueName);
      if(queue){
        getQueue(data.queueName).assistant.push({name:data.name, username:data.username});
      }
    });

    // Listen for a teacher being added to a queue.
    socket.on('removeAssistant', function (data) {
      console.log("Backend wants to remove the assistant " + data.username + " from the queue " + data.queueName);
      for (var i = $scope.queues.length - 1; i >= 0; i--) {
        if($scope.queues[i].name === data.queueName){
          for (var j = $scope.queues[i].assistant.length - 1; j >= 0; j--) {
            if($scope.queues[i].assistant[j].username === data.username){
              $scope.queues[i].assistant.splice(j, 1);
              break;
            }
          }
          break;
        }
      }
    });

    // Listen for an teacher being added to a queue.
    socket.on('addAdmin', function (admin) {
      $scope.admins.push(admin);
      console.log("adding admin (from backend) name = " + admin.name + ", username = " + admin.username + ", addedBy = " + admin.addedBy);
    });

    // Listen for an teacher being added to a queue.
    socket.on('removeAdmin', function (username) {
      console.log("Backend wants to remove the admin " + username);
      for (var i = $scope.admins.length - 1; i >= 0; i--) {
        if($scope.admins[i].username === username){
          $scope.admins.splice(i, 1);
          break;
        }
      }
    });

    // Listen for an teacher being added to a queue.
    socket.on('addTeacher', function (data) {
      console.log("adding teacher (from backend) queueName = " + data.queueName + ", name = " + data.name + ", username = " + data.username);
      var queue = getQueue(data.queueName);
      if(queue){
        getQueue(data.queueName).teacher.push({name:data.name, username:data.username});
      }
    });

    // Listen for an teacher being added to a queue.
    socket.on('removeTeacher', function (data) {
      console.log("Backend wants to remove the teacher " + data.username + " from the queue " + data.queueName);
      for (var i = $scope.queues.length - 1; i >= 0; i--) {
        if($scope.queues[i].name === data.queueName){
          for (var j = $scope.queues[i].teacher.length - 1; j >= 0; j--) {
            if($scope.queues[i].teacher[j].username === data.username){
              $scope.queues[i].teacher.splice(j, 1);
              break;
            }
          }
          break;
        }
      }
    });

    // Listen for a queue being hibernated.
    socket.on('hibernate', function (queue) {
      console.log("I will go to sleep (because backend)");
      for (var i = $scope.queues.length - 1; i >= 0; i--) {
        if(queue === $scope.queues[i].name){
          $scope.queues[i].hibernating = true;
        }
      }
    });

    // Listen for a queue being unhibernated.
    socket.on('unhibernate', function (queue) {
      console.log("I will wake up (because backend)");
      for (var i = $scope.queues.length - 1; i >= 0; i--) {
        if(queue === $scope.queues[i].name){
          $scope.queues[i].hibernating = false;
        }
      }
    });

    // Listen for a queue being added.
    socket.on('addQueue', function (queue) {
      console.log("Backend wants to add the queue " + queue.name);
      $scope.queues.push(queue);
    });

    // Listen for the person leaving a queue event.
    socket.on('removeQueue', function (queue) {
      console.log("Backend wants to remove queue " + queue);
      for (var i = $scope.queues.length - 1; i >= 0; i--) {
        if(queue === $scope.queues[i].name){
          $scope.queues.splice(i, 1);
        }
      }
    });

    function getQueue (queue) {
      for(var index in $scope.queues){
        if($scope.queues[index].name === queue){
          return $scope.queues[index];
        }
      }
    }

    $scope.addQueue = function(){
      if($scope.newQueue){
        socket.emit('addQueue', {
          queueName:$scope.newQueue
        });
        $scope.newQueue = "";
      }
    };

    $scope.removeQueue = function(){
      console.log("Called removeQueue");
      var modalInstance = $modal.open({
        templateUrl: 'warning.html',
        controller: function ($scope, $modalInstance, title, message, safeButtonText, dangerButtonText) {
          $scope.title = title;
          $scope.message = message;
          $scope.safeButtonText = safeButtonText;
          $scope.dangerButtonText = dangerButtonText;
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
            return "Are you sure that you wish to remove " + $scope.selectedQueue.name + " permanently?";
          },
          safeButtonText: function () {
            return "No, I made a mistake.";
          },
          dangerButtonText: function () {
            return "Yes, I never want to see it again.";
          }
        }
      });

      modalInstance.result.then(function (message) {
        if(message === "delete"){
          socket.emit('removeQueue', {
            queueName:$scope.selectedQueue.name
          });
          console.log("Trying to delete queue " + $scope.selectedQueue.name);
          document.getElementById('dropdown').innerHTML = "Select Queue";
          $scope.selectedQueue = undefined;
        }
      }, function () {});
    };

    $scope.hibernateQueue = function(){
      console.log("Called hibernateQueue");
      var modalInstance = $modal.open({
        templateUrl: 'warning.html',
        controller: function ($scope, $modalInstance, title, message, safeButtonText, dangerButtonText) {
          $scope.title = title;
          $scope.message = message;
          $scope.safeButtonText = safeButtonText;
          $scope.dangerButtonText = dangerButtonText;
          $scope.delete = function () {
            $modalInstance.close("hibernate");
          };
          $scope.doNotDelete = function () {
            $modalInstance.close("");
          };
        },
        resolve: {
          title: function () {
            return "Hide queue";
          },
          message: function () {
            return "Are you sure that you wish to hide " + $scope.selectedQueue.name + "? This means that only teachers and admins can enter and see the queue.";
          },
          safeButtonText: function () {
            return "No, keep it visible.";
          },
          dangerButtonText: function () {
            return "Yes, and conceal it well.";
          }
        }
      });

  modalInstance.result.then(function (message) {
    if(message === "hibernate"){
      socket.emit('purge', {
        queue:$scope.selectedQueue.name
      });
      socket.emit('hibernate', {
        queue:$scope.selectedQueue.name
      });
      console.log("Trying to hibernate queue " + $scope.selectedQueue.name);
    }
  }, function () {});
  };

  $scope.unhibernateQueue = function(){
    console.log("Called unhibernateQueue");
    var modalInstance = $modal.open({
      templateUrl: 'warning.html',
      controller: function ($scope, $modalInstance, title, message, safeButtonText, dangerButtonText) {
        $scope.title = title;
        $scope.message = message;
        $scope.safeButtonText = safeButtonText;
        $scope.dangerButtonText = dangerButtonText;
        $scope.delete = function () {
          $modalInstance.close("unhibernate");
        };
        $scope.doNotDelete = function () {
          $modalInstance.close("");
        };
      },
      resolve: {
        title: function () {
          return "Reveal queue";
        },
        message: function () {
          return "Are you sure that you wish to reveal " + $scope.selectedQueue.name + "? This means that anyone can see and enter the queue.";
        },
        safeButtonText: function () {
          return "No, keep it from prying eyes.";
        },
        dangerButtonText: function () {
          return "Yes, show yourself!";
        }
      }
    });

    modalInstance.result.then(function (message) {
      if(message === "unhibernate"){
        socket.emit('unhibernate', {
          queue:$scope.selectedQueue.name
        });
        console.log("Trying to unhibernate queue " + $scope.selectedQueue.name);
      }
    }, function () {});
  };

  $scope.addAdmin = function(){
    if($scope.newAdmin){
      socket.emit('addAdmin', {
        username:$scope.newAdmin,
        addedBy:$scope.name
      });
      console.log("Adding admin " + $scope.newAdmin);
      $scope.newAdmin = '';
    }
  };

  $scope.removeAdmin = function(username){
    socket.emit('removeAdmin', {
      username:username
    });
    console.log("Removing admin " + username);
  };

  $scope.addTeacher = function(){
    console.log("Trying to add a new teacher by the name '" + $scope.newTeacher + "'");
    if($scope.newTeacher){
      socket.emit('addTeacher', {
        username:$scope.newTeacher,
        queueName:$scope.selectedQueue.name,
        addedBy:$scope.name
      });
      console.log("Adding teacher " + $scope.newTeacher + " in the queue " + $scope.selectedQueue.name);
      $scope.newTeacher = '';
    }
  };

  $scope.removeTeacher = function(username){
    socket.emit('removeTeacher', {
      username:username,
      queueName:$scope.selectedQueue.name
    });
    console.log("Removing teacher " + name + " in the queue " + $scope.selectedQueue.name);
  };

  $scope.addAssistant = function(){
    if($scope.newAssistant){
      socket.emit('addAssistant', {
        username:$scope.newAssistant,
        queueName:$scope.selectedQueue.name,
        addedBy:$scope.name
      });
      console.log("Adding assistant " + $scope.newAssistant  + " in the queue " + $scope.selectedQueue.name);
      $scope.newAssistant = '';
    }
  };

  $scope.removeAssistant = function(username){
    socket.emit('removeAssistant', {
      username:username,
      queueName:$scope.selectedQueue.name
    });
    console.log("Removing assistant " + name  + " in the queue " + $scope.selectedQueue.name);
  };

  $scope.addServerMessage = function(){
    console.log("Called addServerMessage");
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
            return "Enter a message to show users upon loggin in";
          },
          buttonText: function () {
            return "Add message";
          }
        }
      });

      modalInstance.result.then(function (message) {
        console.log("Message = " + message);
        if(message){
          socket.emit('addServerMessage', {
            sender:$scope.name,
            message:message
          });
        }
      }, function () {});
  };

  $scope.selectQueue = function(queue){
    $scope.selectedQueue = queue;
    document.getElementById('dropdown').innerHTML = queue.name;
    console.log("selected queue = " + $scope.selectedQueue.name);
  };

  $scope.accessLevel = function() {
    return user.accessLevel();
  };


  }]);
})();