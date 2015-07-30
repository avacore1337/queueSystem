(function(){
  var app = angular.module("statistics.statistics", [
    'ui.bootstrap',
    'ngRoute'
    ])
  
  .config(['$routeProvider',
    function($routeProvider) {
      $routeProvider.
      when('/statistics', {
        templateUrl: 'statistics/statistics.html',
        controller: 'statisticsController'
      });
    }])


  .controller('statisticsController', ['$scope', 'HttpService', 'WebSocketService', 'TitleService', 'UserService',
  function($scope, http, socket, title, user) {
    $scope.$on('$destroy', function (event) {
      socket.removeAllListeners();
    });
    
    title.title = "Statistics | Stay A While";
    $scope.name = user.getName();
    
    socket.on('getStatistics', function(data) {
      console.log("The server gave me some statistics =)");

      // rawJSON
      $scope.rawJSON = data.rawJSON;
      $scope.showJSONField = true;

      // averageQueueTime
      formatQueueTime(data.averageQueueTime);

      // peopleLeftQueue
      $scope.numbersOfPeopleLeftQueue = data.numbersOfPeopleLeftQueue;
    });
    $scope.showJSONField = false;
    $scope.rawJSON = [];
    $scope.averageQueueTime = "";
    $scope.numbersOfPeopleLeftQueue = -1;

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
})();