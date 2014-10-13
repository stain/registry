'use strict';

angular.module('registryApp')
    .controller('JobsCtrl', ['$scope', '$location', 'Job', 'Sidebar', 'Api', 'Loading', 'User',function ($scope, $location, Job, Sidebar, Api, Loading, User) {

        Sidebar.setActive('jobs');

        /**
         * Callback when jobs are loaded
         *
         * @param result
         */
        var jobsLoaded = function(result) {

            $scope.view.paginator.prev = $scope.view.page > 1;
            $scope.view.paginator.next = ($scope.view.page * $scope.view.perPage) < result.total;
            $scope.view.total = Math.ceil(result.total / $scope.view.perPage);

            $scope.view.jobs = result.list;
            $scope.view.loading = false;
        };


        $scope.view = {};
        $scope.view.loading = true;
        $scope.view.jobs = [];
        $scope.view.prefix = '';

        $scope.view.classes = ['page', 'jobs'];
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

        User.getUser().then(function (result) {

            $scope.view.user = result.user;

            if (!_.isEmpty(result.user)) {
                Job.getJobs(0).then(jobsLoaded);
            } else {

                $scope.view.prefix = $location.protocol() + '://' + $location.host() + ':' + $location.port() + '/api/jobs/';

                Job.getTmpJobs(0, $scope.view.perPage).then(jobsLoaded);
            }
        });

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

                if (!_.isEmpty($scope.view.user)) {
                    Job.getJobs(offset).then(jobsLoaded);
                } else {
                    Job.getTmpJobs(offset, $scope.view.perPage).then(jobsLoaded);
                }

            }
        };

    }]);
