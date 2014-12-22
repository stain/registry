/**
 * Author: Milica Kadic
 * Date: 12/02/14
 * Time: 4:36 PM
 */

'use strict';

angular.module('registryApp.cliche')
    .directive('separatorInfo', [function () {
        return {
            restrict: 'E',
            template: '<span>{{ view.separator }}</span>',
            scope: {
                type: '@',
                model: '='
            },
            link: function(scope) {

                var option;

                scope.view = {};

                scope.view.map = {
                    item: [
                        {name: 'empty', value: ''},
                        {name: 'space', value: ' '},
                        {name: 'equal', value: '='}
                    ],
                    list: [
                        {name: 'comma', value: ','},
                        {name: 'semicolon', value: ';'},
                        {name: 'space', value: ' '},
                        {name: 'repeat', value: null}
                    ]
                };

                option = _.find(scope.view.map[scope.type], {value: scope.model});

                scope.view.separator = option ? option.name : 'space';

            }
        };
    }]);