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
		};

		$scope.messageUser = function (ugKthid) {
			modals.submitModal({
				title: "Enter a message to " + ugKthid,
				placeholder: "",
				buttonText: "Send",
				callback: function (message) {
					if(message){
						socket.emit('messageUser', {
							queueName: $scope.queue,
							ugKthid: ugKthid,
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
				ugKthid: user.ugKthid
			});
		};

		// Mark the user as no longer being helped
		$scope.stopHelpUser = function(ugKthid){
			socket.emit('stopHelp', {
				queueName: $scope.queue,
				ugKthid: ugKthid
			});
		};

		// Function to send a message to a user
		$scope.badLocation = function(user){
			modals.twoChoice({
				title: "Bad Location",
				buttonOne: {
					text: "Unknown location",
					type: "primary",
					callback: function () {
						socket.emit('badLocation', {
							queueName: $scope.queue,
							user: user,
							type: "unknown"
						});
					}
				},
				buttonTwo: {
					text: "Wrong location",
					type: "info",
					callback: function () {
						socket.emit('badLocation', {
							queueName: $scope.queue,
							user: user,
							type: "wrong"
						});
					}
				},
			});
		};
}]);
