/**
 * Author: Milica Kadic
 * Date: 10/14/14
 * Time: 2:18 PM
 */

'use strict';

angular.module('registryApp.cliche')
    .directive('addProperty', ['$templateCache', function ($templateCache) {

        return {
            restrict: 'E',
            template: '<a href ng-click="addItem($event)" class="btn btn-default"><i class="fa fa-plus"></i></a>',
            scope: {
                type: '@',
                properties: '=',
                req: '=',
                handler: '&'
            },
            controller: ['$scope', '$modal', function ($scope, $modal) {

                var isOpen = false;

                $scope.req = $scope.req || [];

                /**
                 * Show the modal for adding property items
                 *
                 * @param e
                 */
                $scope.addItem = function(e) {

                    e.stopPropagation();

                    if (isOpen) { return false; }

                    isOpen = true;

                    var modalInstance = $modal.open({
                        template: $templateCache.get('views/cliche/partials/manage-property-' + $scope.type + '.html'),
                        controller: 'ManageProperty' + $scope.type.charAt(0).toUpperCase() + $scope.type.slice(1) + 'Ctrl',
                        windowClass: 'modal-prop',
                        size: 'lg',
                        resolve: {
                            options: function () {
                                return {
                                    type: $scope.type,
                                    properties: $scope.properties
                                };
                            }
                        }
                    });

                    modalInstance.result.then(function(result) {
                        isOpen = false;

                        if (result.required) { $scope.req.push(result.name); }

                        if (typeof $scope.handler === 'function') { $scope.handler(); }

                    }, function() {
                        isOpen = false;
                    });
                };

            }],
            link: function() {}
        };
    }]);