var queueControllers = angular.module('queueControllers', []);

queueControllers.controller('listController', ['$scope', 'HttpService', '$location', 'WebSocketService', 'UserService', 'TitleService',
  function($scope, http, $location, socket, user, title) {
    $scope.$on('$destroy', function (event) {
      socket.removeAllListeners();
      socket.emit('stopListening', 'lobby');
    });
    socket.emit('listen', 'lobby');

    title.title = "Stay A While";
    $scope.queues = [];
    http.get('queueList', function(response) {
      $scope.queues = response.sort(function(a, b) {
        return a.name.localeCompare(b.name);
      });
      for (var index in $scope.queues) {
        http.get('queue/' + $scope.queues[index].name, apiGetQueue);
      }
    });

    function apiGetQueue(resp) {
      var queue = getQueue(resp.name);
      queue.position = -1;
      queue.queue = resp.queue;
      for (var i in queue.queue) {
        if (queue.queue[i].name === user.getName()) {
          queue.position = parseInt(i, 10) + 1;
          break;
        }
      }
    }
    user.updateUserData();

    // Listen for a person joining a queue.
    socket.on('lobbyjoin', function(data) {
      console.log("A user joined (lobby) " + data.queueName);
      var queue = getQueue(data.queueName);
      queue.queue.push({
        name: data.username
      });
      queue.length++;
      if (data.username === user.getName()) {
        getQueue(data.queueName).position = getQueue(data.queueName).length;
      }
    });

    // Listen for a person leaving a queue.
    socket.on('lobbyleave', function(data) {
      console.log("A user left (lobby) " + data.queueName);
      var queue = getQueue(data.queueName);
      queue.length--;
      for (var i in queue.queue) {
        if (queue.queue[i].name === data.username) {
          queue.queue.splice(i, 1);
          if (parseInt(i, 10) + 1 === queue.position) {
            queue.position = -1;
          } else if (parseInt(i, 10) + 1 < queue.position) {
            queue.position--;
          }
          break;
        }
      }
    });

    // Listen for queue geting purged.
    socket.on('lobbypurge', function(queueName) {
      console.log(queueName + " was purged (lobby)");
      var queue = getQueue(queueName);
      queue.length = 0;
      queue.queue = [];
      queue.position = -1;
    });

    // Listen for a queue being locked.
    socket.on('lobbylock', function(queue) {
      console.log(queue + " was locked (lobby)");
      getQueue(queue).locked = true;
    });

    // Listen for a queue being unlocked.
    socket.on('lobbyunlock', function(queue) {
      console.log(queue + " was unlocked (lobby)");
      getQueue(queue).locked = false;
    });

    // Listen for a queue going to sleep.
    socket.on('lobbyhide', function(queue) {
      console.log(queue + " was sent to sleep (lobby)");
      getQueue(queue).hiding = true;
    });

    // Listen for a queue waking up.
    socket.on('lobbyshow', function(queue) {
      console.log(queue + " was awoken (lobby)");
      getQueue(queue).hiding = false;
    });

    function getQueue(queue) {
      for (var index in $scope.queues) {
        if ($scope.queues[index].name === queue) {
          return $scope.queues[index];
        }
      }
    }
      // This function should direct the user to the wanted page
    $scope.redirect = function(queue) {
      console.log("Trying to enter queue : " + queue.name);
      if (!queue.locked || $scope.accessLevel(queue.name) > 0) {
        console.log("Allowed to enter queue : " + queue.name);
        $location.hash("");
        $location.path('/queue/' + queue.name);
      }
    };

    $scope.accessLevel = function(queueName) {
      if (user.isAdmin()) {
        return 3;
      }
      return user.accessLevelFor(queueName);
    };

    $scope.noMatch = function(queueName) {
      if (!$scope.search) {
        return false;
      }
      return !(new RegExp($scope.search).test(queueName));
    };

  }
]);

queueControllers.controller('aboutController', ['$scope', 'TitleService', 'HttpService',
  function($scope, title, http) {
    title.title = "About | Stay A While";
    console.log('entered about.html');
    $scope.contributors = {StayAWhile:[], QWait:[]};
    http.get('../aboutData.json', function(data) {
      console.log("Aboutdata: ");
      console.log(data);
      $scope.contributors = data;
    });
  }
]);

queueControllers.controller('helpController', ['$scope', 'TitleService', 'UserService',
  function($scope, title, user) {
    title.title = "Help | Stay A While";
    console.log('entered help.html');
    $scope.accessLevel = user.accessLevel();
    console.log("$scope.accessLevel = " + $scope.accessLevel);
  }
]);

queueControllers.controller('statisticsController', ['$scope', 'HttpService', 'WebSocketService', 'TitleService', 'UserService',
  function($scope, http, socket, title, user) {
    $scope.$on('$destroy', function (event) {
      socket.removeAllListeners();
      console.log("Leaving statistics");
      socket.emit('stopListening', 'statistics');
    });
    socket.emit('listen', 'statistics');
    
    title.title = "Statistics | Stay A While";
    $scope.name = user.getName();
    
    socket.on('getStatistics', function(data) {
      console.log("The server gave me some statistics =)");

      // rawJSON
      $scope.rawJSON = data.rawJSON;
      $scope.showJSONField = true;

      // averageQueueTime
      formatQueueTime(data.averageTime);

      // peopleLeftQueue
      $scope.attendingAssistants = data.attendingAssistants;
    });
    $scope.showJSONField = false;
    $scope.rawJSON = [];
    $scope.averageQueueTime = "";
    $scope.attendingAssistants = [];

    // Listen for new statistics.
    function formatQueueTime(milliseconds) {
      var seconds = (milliseconds / 1000) % 60;
      var minutes = (milliseconds / (1000 * 60)) % 60;
      var hours = (milliseconds / (1000 * 60 * 60)) % 24;
      if (hours > 1) {
        $scope.averageQueueTime = Math.floor(hours) + "h " + Math.floor(minutes) + "m " + Math.floor(seconds) + "s";
      } else if (minutes > 1) {
        $scope.averageQueueTime = Math.floor(minutes) + "m " + Math.floor(seconds) + "s";
      } else if (seconds > 1) {
        $scope.averageQueueTime = Math.floor(seconds) + "s";
      } else {
        $scope.averageQueueTime = "0s";
      }
    }

    // Queue selection
    $scope.queues = [];
    http.get('queueList', function(response) {
      var temp = response.sort(function(a, b) {return a.name.localeCompare(b.name);});
      for (var index in temp) {
        if (user.isAdmin() || user.isTeacher(temp[index].name)) {
          $scope.queues.push(temp[index].name);
        }
      }
    });

    $scope.selectedQueue = undefined;
    $scope.selectQueue = function(queue) {
      console.log("Selected queue : " + queue);
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
    $scope.toTime = new Date();
    $scope.toTime.setMinutes(0);
    $scope.toTime.setSeconds(0);
    $scope.fromTime = new Date();
    $scope.fromTime.setHours($scope.toTime.getHours()-2);
    $scope.fromTime.setMinutes(0);
    $scope.fromTime.setSeconds(0);

    $scope.hstep = 1;
    $scope.mstep = 1;

    $scope.$watch(function() {
      return $scope.toTime;
    }, function(newValue, oldValue) {
      if(newValue < $scope.fromTime){
        $scope.toTime = $scope.fromTime;
      }
      console.log("Detected update to $scope.toTime (oldValue = " + oldValue + ", newValue = " + newValue + ")");
    });

    $scope.$watch(function() {
      return $scope.fromTime;
    }, function(newValue, oldValue) {
      if(newValue > $scope.toTime){
        $scope.fromTime = $scope.toTime;
      }
      console.log("Detected update to $scope.fromTime (oldValue = " + oldValue + ", newValue = " + newValue + ")");
    });

    // Statistics
    $scope.getStatistics = function() {
      console.log($scope.selectedQueue);
      $scope.rawJSON = [];
      socket.emit('getStatistics', {
        queueName: $scope.selectedQueue,
        start: $scope.fromTime.getTime(),
        end: $scope.toTime.getTime(),
        user: $scope.name
      });
      console.log("Requested statistics");
    };

    $scope.accessLevel = function() {
      return user.accessLevel();
    };

  }
]);

queueControllers.controller('loginController', ['$scope', '$location', 'HttpService', 'TitleService', 'WebSocketService', '$modal',
  function($scope, $location, http, title, socket, $modal) {
    $scope.$on('$destroy', function (event) {
      socket.removeAllListeners();
    });

    title.title = "Log in | Stay A While";

    $scope.done = function() {
      console.log("Reached done()");
      http.post('setUser', {name: $scope.name}, function(response) {
        http.get('serverMessage', function(resp){
          if(resp.serverMessage){
            console.log("There is a serverMessage");
            var modalInstance = $modal.open({
              templateUrl: 'serverMessage.html',
              controller: function ($scope, $modalInstance, title, message) {
                $scope.title = title;
                $scope.message = message;
              },
              resolve: {
                title: function () {
                  return "Server-message";
                },
                message: function () {
                  return resp.serverMessage;
                }
              }
            });
          }
        });
        $location.path('list');
      });
      socket.emit('setUser', {
        name: $scope.name,
        admin: $scope.type === 'admin'
      });
      console.log("I set the user with socket");
    };

  }
]);

queueControllers.controller('navigationController', ['$scope', '$location', 'UserService', 'HttpService',
  function($scope, $location, user, http) {
    $scope.location = $location.path();
    $scope.name = user.getName();

    $scope.$watch(function() {
      return $location.path();
    }, function(newValue, oldValue) {
      $scope.location = newValue;
      console.log("Detected update to $location.path() (oldValue = " + oldValue + ", newValue = " + newValue + ")");
    });

    $scope.$watch(function() {
      return user.getName();
    }, function(newValue, oldValue) {
      $scope.name = newValue;
      console.log("Detected update to user.getName() (oldValue = " + oldValue + ", newValue = " + newValue + ")");
    });

    // Loggin out
    $scope.logOut = function() {
      http.post('setUser', {
        name: "",
        admin: false,
        teacher: [],
        assistant: []
      }, function(response) {
        user.clearName();
        $scope.name = "";
        console.log("logged out");
        $location.path('list');
      });
    };

    // This function should direct the user to the wanted page
    $scope.redirect = function(address) {
      $location.hash("");
      $location.path('/' + address);
      $scope.location = $location.path();
      console.log("location = " + $scope.location);
    };

    $scope.accessLevel = function() {
      return user.accessLevel();
    };

    $(document).ready(function() {
      $(".navbar-nav li a").click(function(event) {
        $(".navbar-collapse").collapse('hide');
      });
    });
  }
]);


queueControllers.controller('TitleController', ['$scope', 'TitleService',
  function($scope, title) {
    console.log(title);
    $scope.title = title.title;

    $scope.$watch(function() {
      return title.title;
    }, function(newValue, oldValue) {
      $scope.title = newValue;
    });
  }
]);