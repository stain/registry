/**
 * Author: Milica Kadic
 * Date: 10/14/14
 * Time: 2:18 PM
 */

'use strict';

angular.module('registryApp.cliche')
    .controller('AddPropertyCtrl', ['$scope', '$modalInstance', 'Data', 'options', function ($scope, $modalInstance, Data, options) {

        $scope.options = options;

        $scope.view = {};
        $scope.view.disabled = false;

        var map = Data.getMap()[options.type];

        switch (options.type) {
        case 'input':
            $scope.view.property = {
                type: 'string',
                adapter: {separator: ' '}
            };
            break;
        case 'output':
            $scope.view.property = {
                type: 'file',
                adapter: {meta: {}}
            };
            break;
        case 'arg':
            $scope.view.property = {separator: ' '};
            break;
        }


        $scope.addProperty = function() {

            $scope.view.error = '';
            $scope.view.form.$setDirty();

            if ($scope.view.form.$invalid) {
                return false;
            }

            Data.addProperty(options.type, $scope.view.name, $scope.view.property, options.properties)
                .then(function() {
                    $modalInstance.close();
                }, function(error) {
                    $scope.view.error = error;
                });

        };

        $scope.ok = function () {
            $modalInstance.close();
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

        /* watch for the type change in order to adjust the property structure */
        $scope.$watch('view.property.type', function(n, o) {
            if (n !== o) {

                _.each($scope.view.property, function(fields, key) {

                    if (!_.contains(_.keys(map[n].root), key) && key !== 'adapter') {
                        delete $scope.view.property[key];
                        if (key === 'enum') { $scope.view.isEnum = false; }
                    }

                    _.each(map[n].root, function(value, field) {
                        if (_.isUndefined($scope.view.property[field])) {
                            $scope.view.property[field] = value;
                        }
                    });

                });

                _.each($scope.view.property.adapter, function(fields, key) {

                    if (!_.contains(_.keys(map[n].adapter), key)) {
                        delete $scope.view.property.adapter[key];
                    }

                    _.each(map[n].adapter, function(value, field) {
                        if (_.isUndefined($scope.view.property.adapter[field])) {
                            $scope.view.property.adapter[field] = value;
                        }
                    });

                });

            }
        });

    }]);
