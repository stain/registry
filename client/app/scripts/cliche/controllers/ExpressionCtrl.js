/**
 * Author: Milica Kadic
 * Date: 10/14/14
 * Time: 2:18 PM
 */

'use strict';

angular.module('registryApp.cliche')
    .controller('ExpressionCtrl', ['$scope', '$modalInstance', 'options', function ($scope, $modalInstance, options) {

        $scope.view = {};

        $scope.view.expr = options.expr || '';
        $scope.view.self = options.self;

        /**
         * On modal confirm set the appropriate expression and close the modal
         *
         * @param expr
         */
        $scope.ok = function (expr) {

            $modalInstance.close(expr);
        };

        /**
         * On cancel close the modal
         */
        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

        /**
         * On cancel close the modal and clear expression
         */
        $scope.clear = function () {
            $modalInstance.close('');
        };

    }]);
