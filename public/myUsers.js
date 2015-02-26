function userController($scope,$http) {
$scope.name = '';
$scope.place = '';
$scope.comment = '';
$scope.users = [
{id:1, name:'Hege',  place:"Pege" , comment:"Green"},
{id:2, name:'Kim',   place:"Pim" , comment:"Brown"},
{id:3, name:'Sal',   place:"Smith" , comment:"Red"}
];
$http.get('/API/getQueue')
.success(function(response) {
  $scope.users=response;
});

$scope.edit = true;

$scope.io = io.connect();

$scope.io.emit('listen', 'dbas')

console.log('testing')
// Listen for the announce event.
$scope.io.on('join', function(data) {
    console.log(data);
    console.log($scope.users[0]);
    $scope.$apply($scope.users.push({id:$scope.users.length, name:data.name, place:data.place, comment:data.comment}));
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
$scope.select = function(id){
  if($scope.selected == id){
    $scope.selected = -1;
  }else{
    $scope.selected = id;
    //document.getElementById(id.toString()).background = "#FF7070";
  }
};
$scope.removeUser = function(){
  if($scope.selected != -1){
    var temp = [];
    var counter = 1;
    for(var i = 0; i < $scope.users.length; i++){
      if(i != $scope.selected-1){
        temp.push($scope.users[i]);
        temp[temp.length-1].id = counter;
        counter++;
      }
    }
    $scope.users = temp;
  }
  $scope.selected = -1;
};
}
