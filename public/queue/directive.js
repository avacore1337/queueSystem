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
		$scope.kick = function(name){
			socket.emit('kick', {
				queueName:$scope.queue,
				user:{name:name}
			});
			console.log("Called kick");
		};

		$scope.messageUser = function (name) {
			console.log("Entered messageUser");
			modals.setModal({
				title: "Enter a message to " + name,
				placeholder: "",
				buttons: [{type: "primary", text: "Send", callback: function (message) {
					if(message){
						console.log("Sending message now");
						socket.emit('messageUser', {
							queueName:$scope.queue,
							sender:$scope.name,
							name:name,
							message:message
						});
					}
				}}]
			});
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
			modals.setModal({
				title: "Enter a comment about " + name,
				placeholder: "",
				buttons: [{type: "primary", text: "Add comment", callback: function (message) {
					if(message){
						socket.emit('flag', {
							queueName:$scope.queue,
							sender:$scope.name,
							name:name,
							message:message
						});
					}
				}}]
			});
		};

		// Function to read comments about a user
		$scope.readMessages = function(messages){
			console.log("Called readMessages");
			modals.listModal({title: "Commets", messages: messages});
		};
}]);