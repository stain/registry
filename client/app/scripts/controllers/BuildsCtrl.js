'use strict';

angular.module('registryApp')
    .controller('BuildsCtrl', ['$scope', '$routeParams', '$window', 'Build', 'Header', 'Loading', function ($scope, $routeParams, $window, Build, Header, Loading) {

        Header.setActive('builds');

        /**
         * Callback when builds are loaded
         *
         * @param result
         */
        var buildsLoaded = function(result) {

            $scope.view.paginator.prev = $scope.view.page > 1;
            $scope.view.paginator.next = ($scope.view.page * $scope.view.perPage) < result.total;
            $scope.view.total = Math.ceil(result.total / $scope.view.perPage);

            $scope.view.builds = result.list;
            $scope.view.loading = false;

        };

        $scope.view = {};
        $scope.view.loading = true;
        $scope.view.builds = [];
        $scope.view.repo = $routeParams.repo;

        $scope.view.classes = ['page', 'builds'];
        Loading.setClasses($scope.view.classes);

        $scope.Loading = Loading;
        $scope.$watch('Loading.classes', function(n, o) {
            if (n !== o) { $scope.view.classes = n; }
        });

        $scope.view.paginator = {
            prev: false,
            next: false
        };

        $scope.view.page = 1;
        $scope.view.perPage = 25;
        $scope.view.total = 0;

        Build.getBuilds(0, $routeParams.repo).then(buildsLoaded);

        /**
         * Go to the next/prev page
         *
         * @param dir
         */
        $scope.goToPage = function(dir) {

            if (!$scope.view.loading) {

                if (dir === 'prev') {
                    $scope.view.page -= 1;
                }
                if (dir === 'next') {
                    $scope.view.page += 1;
                }

                $scope.view.loading = true;
                var offset = ($scope.view.page - 1) * $scope.view.perPage;

                Build.getBuilds(offset, $routeParams.repo).then(buildsLoaded);

            }
        };



    }]);
