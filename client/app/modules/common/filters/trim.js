'use strict';

angular.module('registryApp.common')
    .filter('trim', [function() {
        return function(string) {

            return string.trim();

        };
    }]);