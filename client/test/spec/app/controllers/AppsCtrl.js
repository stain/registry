'use strict';

describe('Controller: AppsCtrl', function () {

    var controllerFactory;
    var $scope;
    var $q;
    var $location;
    var $httpBackend;

    var mockSidebar = {};
    var mockLoading = {};

    var apiBase = '/api';
    var apiHandlers = {};

    var store = {
        apps: _.find(__FIXTURES__, {name: 'tools'}).fixtures,
        workflows: _.find(__FIXTURES__, {name: 'workflows'}).fixtures,
        user: _.find(__FIXTURES__, {name: 'user'}).fixtures
    };

    /**
     * Instantiate controller and inject dependencies
     *
     * @returns {*}
     */
    function createController() {

        return controllerFactory('AppsCtrl', {
            $scope: $scope,
            Sidebar: mockSidebar,
            Loading: mockLoading
        });
    }

    /**
     * Mock method from particular object
     * @param resolve
     */
    var setMock = function(obj, method, resolve, returnObj) {

        var deferred = $q.defer();

        obj[method] = jasmine.createSpy(method);

        if (resolve) {
            deferred.resolve(returnObj);
        } else {
            deferred.reject(returnObj);
        }

        obj[method].and.returnValue(deferred.promise);
    };

    beforeEach(module('registryApp'));

    beforeEach(inject(function ($controller, $rootScope, _$q_, _$location_, _$httpBackend_) {
        $scope = $rootScope.$new();
        $q = _$q_;
        $location = _$location_;
        $httpBackend = _$httpBackend_;

        controllerFactory = $controller;

    }));

    beforeEach(function () {

        setMock(mockLoading, 'setClasses', true);
        setMock(mockSidebar, 'setActive', true);

        createController();

        apiHandlers.apps = $httpBackend.when('GET', /\/api\/apps/).respond(store.apps);
        apiHandlers.workflows = $httpBackend.when('GET', /\/api\/workflows/).respond(store.workflows);
        apiHandlers.user = $httpBackend.when('GET', /\/api\/user/).respond(store.user);

    });

    afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    it('should have switchTab, getMoreTools, getMoreScripts, getMoreWorkflows, searchApps, resetSearch, toggleMyApps, toggleRevisions functions', function() {

        expect(angular.isFunction($scope.switchTab)).toBe(true);
        expect(angular.isFunction($scope.getMoreTools)).toBe(true);
        expect(angular.isFunction($scope.getMoreScripts)).toBe(true);
        expect(angular.isFunction($scope.getMoreWorkflows)).toBe(true);
        expect(angular.isFunction($scope.searchApps)).toBe(true);
        expect(angular.isFunction($scope.resetSearch)).toBe(true);
        expect(angular.isFunction($scope.toggleMyApps)).toBe(true);
        expect(angular.isFunction($scope.toggleRevisions)).toBe(true);

        $httpBackend.flush();
    });


    it('should attach a view object to the scope', function () {

        expect($scope.view).toEqual(jasmine.any(Object));

        expect($scope.view.loading).toBeTruthy();
        expect($scope.view.classes).toEqual(jasmine.any(Array));

        expect($scope.view.tools).toEqual(jasmine.any(Array));
        expect($scope.view.scripts).toEqual(jasmine.any(Array));
        expect($scope.view.workflows).toEqual(jasmine.any(Array));

        expect($scope.view.active).toEqual(jasmine.any(Object));
        expect($scope.view.page).toEqual(jasmine.any(Object));
        expect($scope.view.total).toEqual(jasmine.any(Object));

        $httpBackend.flush();

        expect($scope.view.loading).toBeFalsy();
    });

    it('should have three tabs with prepared pagination objects', function () {

        var tabs = ['tools', 'scripts', 'workflows'];

        expect(_.keys($scope.view.active)).toEqual(tabs);
        expect(_.keys($scope.view.page)).toEqual(tabs);
        expect(_.keys($scope.view.total)).toEqual(tabs);

        expect(_.values($scope.view.active)).toEqual([false, false, false]);
        expect(_.values($scope.view.page)).toEqual([1, 1, 1]);
        expect(_.values($scope.view.total)).toEqual([0, 0, 0]);

        $httpBackend.flush();

    });

    it('should call Loading.setClasses and Sidebar.setActive on load', function () {

        expect(mockLoading.setClasses).toHaveBeenCalledWith(['page', 'apps']);
        expect(mockSidebar.setActive).toHaveBeenCalledWith('apps');

        $httpBackend.flush();

    });

    describe('when initiated', function () {

        afterEach(function () {
            $httpBackend.flush();
        });

        it('should load tools from api', function () {
            $httpBackend.expectGET(apiBase + '/apps?skip=0');
        });

        it('should load scripts from api', function () {
            $httpBackend.expectGET(apiBase + '/apps?is_script=true&skip=0');
        });

        it('should load workflows from api', function () {
            $httpBackend.expectGET(apiBase + '/workflows?skip=0');
        });

        it('should load current user from api', function () {
            $httpBackend.expectGET(apiBase + '/user');
        });

    });

    describe('active tab', function () {

        afterEach(function () {
            $httpBackend.flush();
        });

        it('should be set to tools by default', function () {
            expect($scope.view.tab).toEqual('tools');
        });

        it('should be changed when clicked, including location hash', function () {

            var tab = 'workflows';

            $scope.switchTab(tab);

            expect($scope.view.tab).toEqual(tab);
            expect($location.hash()).toEqual(tab);
        });

    });

    describe('when switching pages', function () {

        var offset = 25;

        beforeEach(function () {
            $httpBackend.flush();
        });

        it('should load tools by offset', function () {
            $scope.getMoreTools(offset);
            expect($scope.view.loading).toBeTruthy();
            $httpBackend.expectGET(apiBase + '/apps?skip=' + offset);
        });

        it('should load scripts by offset', function () {
            $scope.getMoreScripts(offset);
            expect($scope.view.loading).toBeTruthy();
            $httpBackend.expectGET(apiBase + '/apps?is_script=true&skip=' + offset);
        });

        it('should load workflows by offset', function () {
            $scope.getMoreWorkflows(offset);
            expect($scope.view.loading).toBeTruthy();
            $httpBackend.expectGET(apiBase + '/workflows?skip=' + offset);
        });

        afterEach(function () {
            $httpBackend.flush();
            expect($scope.view.loading).toBeFalsy();
        });
    });

    describe('when searching by particular term', function () {

        beforeEach(function () {

            $httpBackend.flush();

            $scope.view.searchTerm = 'test';
            $scope.searchApps();

            expect($scope.view.loading).toBeTruthy();
        });

        it('should load tools by search term', function () {
            $httpBackend.expectGET(apiBase + '/apps?q=test&skip=0');
        });

        it('should load scripts by search term', function () {
            $httpBackend.expectGET(apiBase + '/apps?is_script=true&q=test&skip=0');
        });

        it('should load workflows by search term', function () {
            $httpBackend.expectGET(apiBase + '/workflows?q=test&skip=0');
        });

        afterEach(function () {
            $httpBackend.flush();
            expect($scope.view.loading).toBeFalsy();
        });
    });

    describe('when resetting search', function () {

        beforeEach(function () {

            $httpBackend.flush();

            $scope.resetSearch();

            expect($scope.view.loading).toBeTruthy();
        });

        it('should load tools by current offset', function () {
            $httpBackend.expectGET(apiBase + '/apps?skip=0');
        });

        it('should load scripts by current offset', function () {
            $httpBackend.expectGET(apiBase + '/apps?is_script=true&skip=0');
        });

        it('should load workflows by current offset', function () {
            $httpBackend.expectGET(apiBase + '/workflows?skip=0');
        });

        afterEach(function () {
            $httpBackend.flush();
            expect($scope.view.loading).toBeFalsy();
        });
    });

    it('should toggle versions visibility', function () {

        $httpBackend.flush();

        var tab = 'tools';
        var len = $scope.view[tab].length;
        var states;

        $scope.toggleRevisions(tab);

        expect($scope.view.active[tab]).toBeTruthy();

        states = _.filter(_.pluck($scope.view[tab], 'active'), function(state) {return state;});

        expect(states.length).toEqual(len);

        $scope.toggleRevisions(tab);

        expect($scope.view.active[tab]).toBeFalsy();

        states = _.filter(_.pluck($scope.view[tab], 'active'), function(state) {return !state;});

        expect(states.length).toEqual(len);

        if (len > 0) {

            var item = $scope.view[tab][0];

            $scope.toggleRevisions(tab, item);

            expect(item.active).toBeTruthy();

            $scope.toggleRevisions(tab, item);

            expect(item.active).toBeFalsy();

        }

    });

});