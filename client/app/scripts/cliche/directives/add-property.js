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
                toolType: '@',
                properties: '=',
                req: '=',
                inputs: '=?',
                handler: '&'
            },
            controller: ['$scope', '$modal', 'Data', function ($scope, $modal, Data) {

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

                    var tplName = $scope.toolType ? $scope.toolType + '-' + $scope.type : $scope.type;

                    var modalInstance = $modal.open({
                        template: $templateCache.get('views/cliche/partials/manage-property-' + tplName + '.html'),
                        controller: 'ManageProperty' + $scope.type.charAt(0).toUpperCase() + $scope.type.slice(1) + 'Ctrl',
                        windowClass: 'modal-prop',
                        size: 'lg',
                        resolve: {
                            options: function () {
                                return {
                                    type: $scope.type,
                                    toolType: $scope.toolType,
                                    properties: $scope.properties,
                                    inputs: $scope.inputs
                                };
                            }
                        }
                    });

                    modalInstance.result.then(function(result) {
                        isOpen = false;

                        if (result.required) { $scope.req.push(result.name); }

                        if (typeof $scope.handler === 'function') { $scope.handler(); }

                        if ($scope.toolType === 'tool') {
                            Data.generateCommand();
                        }

                    }, function() {
                        isOpen = false;
                    });
                };

            }],
            link: function() {}
        };
    }]);