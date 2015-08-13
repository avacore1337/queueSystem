var userDirective = angular.module("queue.userDirective", []);

userDirective.directive('standardUsers', function(){
	return {
		controller: 'userController',
		restrict: 'E',
		templateUrl: 'queue/standardUsers.html'
	};
})

.controller('userController', ['$scope', 'WebSocketService', '$modal', 'ModalService',
	function($scope, socket, $modal, modals){
		$scope.kick = function(user){
			socket.emit('kick', {
				queueName:$scope.queue,
				user: user
			});
			console.log("Called kick");
		};

		$scope.messageUser = function (name) {
			console.log("Entered messageUser");
			modals.submitModal({
				title: "Enter a message to " + name,
				placeholder: "",
				buttonText: "Send",
				callback: function (message) {
					if(message){
						console.log("Sending message now");
						socket.emit('messageUser', {
							queueName: $scope.queue,
							name: name,
							message: message
						});
					}
				}
			});
		};

		// Mark the user as being helped
		$scope.helpUser = function(user){
			socket.emit('help', {
				queueName: $scope.queue,
				username: user.name
			});
			console.log("Called helpUser");
		};

		// Mark the user as no longer being helped
		$scope.stopHelpUser = function(name){
			socket.emit('stopHelp', {
				queueName:$scope.queue,
				name:name
			});
			console.log("Called stopHelpUser");
		};

		// Function to send a message to a user
		$scope.badLocation = function(user){
			socket.emit('badLocation', {
				queueName: $scope.queue,
				user: user
			});
			console.log("Called badLocation");
		};

		// Function to add a message about that user
		$scope.flag = function(name){
			console.log("Entered flag");
			modals.setModal({
				title: "Enter a comment about " + name,
				placeholder: "",
				setButton: {
					text: "Add comment",
					callback: function (message) {
						if(message){
							socket.emit('flag', {
								queueName: $scope.queue,
								name: name,
								message: message
							});
						}
					}
				},
				removeButton: {
					text: "Delete comments",
					callback: function (message) {
						socket.emit('removeFlags', {
							queueName: $scope.queue,
							name: name
						});
					}
				},
			});
		};

		// Function to read comments about a user
		$scope.readMessages = function(messages){
			console.log("Called readMessages");
			modals.listModal({title: "Commets", messages: messages});
		};

		// Function to mark someone for completion
		$scope.completion = function(name){
			console.log("Called completion");
			modals.submitModal({
				title: "Enter a task for " + name + " to complete",
				placeholder: "",
				buttonText: "Submit",
				callback: function (message) {
					console.log("Applying completion now");
					socket.emit('completion', {
						queueName: $scope.queue,
						completion: {
							name: name,
							task: message
						}
					});
				}
			});
		};
}]);