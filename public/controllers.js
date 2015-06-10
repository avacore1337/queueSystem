var queueControllers = angular.module('queueControllers', []);

queueControllers.controller('listController', ['$scope', '$http', '$location', 'WebSocketService', 'UserService', 'TitleService',
  function($scope, $http, $location, socket, user, title) {
    $scope.$on('$destroy', function (event) {
      socket.removeAllListeners();
      socket.emit('stopListening', 'lobby');
    });
    socket.emit('listen', 'lobby');

    title.title = "Stay A While";
    $scope.queues = [];
    $http.get('/API/queueList')
      .success(function(response) {
        $scope.queues = response.sort(function(a, b) {
          return a.name.localeCompare(b.name);
        });
        for (var index in $scope.queues) {
          $http.get('/API/queue/' + $scope.queues[index].name)
            .success(apiGetQueue);
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
      var ret = 0;
      if (user.getName() === "") {
        return ret;
      }
      if (user.isAssistant(queueName)) {
        ret = 1;
      }
      if (user.isTeacher(queueName)) {
        ret = 2;
      }
      if (user.isAdmin()) {
        ret = 3;
      }
      return ret;
    };

    $scope.noMatch = function(queueName) {
      if (!$scope.search) {
        return false;
      }
      return !(new RegExp($scope.search).test(queueName));
    };

  }
]);

queueControllers.controller('aboutController', ['$scope', 'TitleService', '$http',
  function($scope, title, $http) {
    title.title = "About | Stay A While";
    console.log('entered about.html');
    $scope.contributors = {StayAWhile:[], QWait:[]};
    $http.get('/aboutData.json').success(function(data) {
      console.log("Aboutdata: ");
      console.log(data);
      $scope.contributors = data;
    });
  }
]);

queueControllers.controller('helpController', ['$scope', '$http', 'TitleService', 'UserService',
  function($scope, $http, title, user) {
    title.title = "Help | Stay A While";
    console.log('entered help.html');
    $scope.accessLevel = user.accessLevel();
    console.log("$scope.accessLevel = " + $scope.accessLevel);
  }
]);

queueControllers.controller('statisticsController', ['$scope', '$http', 'WebSocketService', 'TitleService', 'UserService',
  function($scope, $http, socket, title, user) {
    $scope.$on('$destroy', function (event) {
      socket.removeAllListeners();
    });
    socket.emit('listen', 'statistics');
    
    title.title = "Statistics | Stay A While";

    $scope.rawJSON = ["milli 128379", "avera 897321"];

    // Listen for new statistics.
    socket.on('getAverageQueueTime', function(milliseconds) {
      rawJSON.append("getAverageQueueTime: " + milliseconds);
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
    });
    $scope.averageQueueTime = "";

    // Listen for new statistics.
    socket.on('numbersOfPeopleLeftQueue', function(amount) {
      rawJSON.append("numbersOfPeopleLeftQueue: " + amount);
      $scope.numbersOfPeopleLeftQueue = amount;
      console.log("Amount to 'numbersOfPeopleLeftQueue' : " + amount);
    });
    $scope.numbersOfPeopleLeftQueue = -1;

    // Queue selection
    $scope.queues = [];
    $http.get('/API/queueList').success(function(response) {
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
    $scope.fromTime = new Date();
    $scope.fromTime.setHours(0);
    $scope.fromTime.setMinutes(0);
    $scope.fromTime.setSeconds(0);
    $scope.toTime = new Date();

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
      socket.emit('getAverageQueueTime', {
        queueName: $scope.selectedQueue,
        start: $scope.fromTime.getTime(),
        end: $scope.toTime.getTime()
      });
      console.log("Requested averageQueueTime");
      socket.emit('numbersOfPeopleLeftQueue', {
        queueName: $scope.selectedQueue,
        start: $scope.fromTime.getTime(),
        end: $scope.toTime.getTime()
      });
      console.log("Requested numbersOfPeopleLeftQueue");
    };

    $scope.accessLevel = function() {
      return user.accessLevel();
    };

  }
]);

queueControllers.controller('loginController', ['$scope', '$location', '$http', 'TitleService', 'WebSocketService', '$modal',
  function($scope, $location, $http, title, socket, $modal) {
    $scope.$on('$destroy', function (event) {
      socket.removeAllListeners();
    });

    // Listen for a server-message
    socket.on('serverMessage', function(message) {
      console.log("Received server-message : " + message);
      if(message){
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
              return message;
            }
          }
        });
      }
  });

    title.title = "Log in | Stay A While";

    $scope.done = function() {
      console.log("Reached done()");
      $http.post('/API/setUser', {
        name: $scope.name
      }, {
        withCredentials: true
      }).success(function(response) {
        console.log("with credentials success");
        $location.path('list');
        console.log("logged in");
      });
      console.log("I set the user with http");
      // TODO : This should be removed later on
      // TODO : Robert look here
      socket.emit('setUser', {
        name: $scope.name,
        admin: $scope.type === 'admin'
      });
      console.log("I set the user with socket");
    };

  }
]);

queueControllers.controller('navigationController', ['$scope', '$location', 'UserService', '$http',
  function($scope, $location, user, $http) {
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
      $http.post('/API/setUser', {
        name: "",
        admin: false,
        teacher: [],
        assistant: []
      }, {
        withCredentials: true
      }).success(function(response) {
        user.setName("");
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