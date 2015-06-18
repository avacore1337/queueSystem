var userDirective = angular.module("queue.userDirective", []);

userDirective.directive('standardUsers', function(){
	return {
		controller: 'userController',
		restrict: 'E',
		templateUrl: 'queue/standardUsers.html'
	};
})

.controller('userController', ['$scope', 'WebSocketService', '$modal',
	function($scope, socket, $modal){
		$scope.kick = function(name){
			socket.emit('kick', {
				queueName:$scope.queue,
				user:{name:name}
			});
			console.log("Called kick");
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
				if(message){
					console.log("Sending message now");
					socket.emit('messageUser', {
						queueName:$scope.queue,
						sender:$scope.name,
						name:name,
						message:message
					});
				}
			}, function () {});
		};

		// Mark the user as being helped
		$scope.helpUser = function(name){
			socket.emit('help', {
				queueName:$scope.queue,
				name:name,
				helper:$scope.name
			});
			console.log("Called helpUser");
		};

		// Function to send a message to a user
		$scope.badLocation = function(name){
			socket.emit('badLocation', {
				queueName:$scope.queue,
				name:name
			});
			console.log("Called badLocation");
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
						queueName:$scope.queue,
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
				if($scope.users[index].name === name){
					var modalInstance = $modal.open({
						templateUrl: 'readMessages.html',
						controller: function ($scope, $modalInstance, messages) {
							$scope.messages = messages;
						},
						resolve: {
							messages: function () {
								return $scope.users[index].messages;
							}
						}
					});
					break;
				}
			}
		};
}]);