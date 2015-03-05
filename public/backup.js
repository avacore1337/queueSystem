function userController($scope,$http) {
$scope.name = '';
$scope.place = '';
$scope.comment = '';
$scope.users = [];
$http.get('/API/getQueue')
.success(function(response) {
  $scope.users=response;
});

$scope.edit = true;

$scope.io = io.connect();

$scope.io.emit('listen', 'dbas')

console.log('testing')

// Listen for the person joining a queue event.
$scope.io.on('join', function(data) {
    console.log(data);
    $scope.$apply($scope.users.push({name:data.name, place:data.place, comment:data.comment}));
    console.log($scope.users);
})

// Listen for the person leaving a queue event.
$scope.io.on('leave', function(data) {
  for(var i = $scope.users.length - 1; i >= 0; i--) {
      if($scope.users[i].name === data.name) {
        $scope.users.splice(i, 1);
      }
  }
});
$scope.newUser = function() { 
    $scope.edit = true;
    $scope.name = '';
    $scope.comment = '';
    $scope.place = '';
}

$scope.editUser = function(name) {
  var user;
  for (var i = 0; i < $scope.users.length; i++) {
    if($scope.users[i].name == name){
      user=$scope.users[i];
    }
  };
  $scope.edit = false;
  $scope.name = user.name;
  $scope.place = user.place;
  $scope.comment = user.comment;

};
$scope.addUser = function(){
  // $scope.users.push({id:$scope.users.length, name:$scope.name, place:$scope.place, comment:$scope.comment});
    $scope.io.emit('join', 
      {
        queue:'dbas',
        user:{name:$scope.name, place:$scope.place, comment:$scope.comment}
      })
    $scope.name = '';
    $scope.comment = '';
    $scope.place = '';
};

$scope.removeUser = function(){
  $scope.io.emit('leave', {
        queue:'dbas',
        user:{name:$scope.name, place:$scope.place, comment:$scope.comment}
      });
    $scope.name = '';
    $scope.comment = '';
    $scope.place = '';
}

  // försökte implementera en funktion att placera någon längst ner i kön
  // reason: se ifall det gick att implementera nya metoder, det gick inte
$scope.bottomUser = function(){
  $scope.io.emit('bottom', {
        queue:'dbas',
        user:{name:$scope.name, place:$scope.place, comment:$scope.comment}
      });
    $scope.name = '';
    $scope.comment = '';
    $scope.place = '';
}

}