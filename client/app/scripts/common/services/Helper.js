/**
 * Author: Milica Kadic
 * Date: 1/14/15
 * Time: 4:23 PM
 */

'use strict';

angular.module('registryApp.common')
    .factory('Helper', ['$injector', function($injector) {

        /**
         * Check if name is valid
         *
         * @param {string} name
         * @returns {boolean}
         */
        var isValidName = function (name) {

            if (_.isEmpty(name)) {
                return false;
            }

            var forbidden = ['#', '.'];

            var isValid = true;

            _.each(forbidden, function (char) {
                if (_.contains(name, char)) {
                    isValid = false;
                    return false;
                }
            });

            return isValid;

        };

        /**
         * Get current domain with appropriate protocol and port
         *
         * @returns {string}
         */
        var getDomain = function () {

            var $location = $injector.get('$location');

            var port = $location.port() ? (':' + $location.port()) : '';

            return $location.protocol() + '://' + $location.host() + port;

        };

        return {
            isValidName: isValidName,
            getDomain: getDomain
        };

    }]);