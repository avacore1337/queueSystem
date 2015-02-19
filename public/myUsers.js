function userController($scope) {
$scope.name = '';
$scope.place = '';
$scope.comment = '';
$scope.users = [
{id:1, name:'Hege',  place:"Pege" , comment:"Green"},
{id:2, name:'Kim',   place:"Pim" , comment:"Brown"},
{id:3, name:'Sal',   place:"Smith" , comment:"Red"}
];
$scope.edit = true;

$scope.io = io.connect();

$scope.io.emit('ready', 'dbas')

console.log('testing')
// Listen for the announce event.
$scope.io.on('announce', function(data) {
    console.log(data);
    console.log($scope.users[0]);
    $scope.users.push({id:$scope.users.length, name:data.name, place:data.place, comment:data.comment});
    console.log($scope.users);
})


$scope.editUser = function(id) {
  if (id == 'new') {
    $scope.edit = true;
    $scope.name = '';
    $scope.comment = '';
    $scope.place = '';
  } else {
    $scope.edit = false;
    $scope.name = $scope.users[id-1].name;
    $scope.place = $scope.users[id-1].place;
    $scope.comment = $scope.users[id-1].comment;
  }
};
$scope.addUser = function(){
  $scope.users.push({id:$scope.users.length, name:$scope.name, place:$scope.place, comment:$scope.comment});
    $scope.name = '';
    $scope.comment = '';
    $scope.place = '';
};
}
