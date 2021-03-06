/**
 * Author: Milica Kadic
 * Date: 10/21/14
 * Time: 2:51 PM
 */
'use strict';

angular.module('registryApp.dyole')
    .controller('PipelineCtrl', ['$scope', '$rootScope', '$stateParams', '$element', '$state', '$window', '$timeout', '$injector', 'pipeline', 'Tool', 'rawPipeline', 'Workflow', '$modal', '$templateCache', 'PipelineService', 'Notification', 'HotkeyRegistry', function ($scope, $rootScope, $stateParams, $element, $state, $window, $timeout, $injector, pipeline, Tool, rawPipeline, Workflow, $modal, $templateCache, PipelineService, Notification, HotkeyRegistry) {

        var Pipeline;
        var selector = '.pipeline';
        var timeoutId;

        $scope.view = {};
        $scope.view.canFlush = _.contains(['new', 'edit'], $stateParams.mode);

        /* show usage hints to user flag */
        $scope.view.explanation = false;

        /**
         * Initialize pipeline
         */
        var initPipeline = function (obj) {

            $scope.view.explanation = !obj.json || (obj.json.steps && obj.json.steps.length === 0) || (obj.json.relations && obj.json.relations.length === 0);

            Pipeline = pipeline.getInstance({
                model: obj ? obj.json || rawPipeline : rawPipeline,
                $parent: angular.element($element[0].querySelector(selector)),
                editMode: $scope.editMode
            });

            //TODO: Will be used to check if any of the buttons needs disabling
            Pipeline.initZoom();

        };

        if ($stateParams.mode === 'new') {
//            Workflow.getLocal()
//                .then(function (json) {
//                    initPipeline(json);
//                });
            initPipeline({});
        } else if ($scope.pipeline){
            initPipeline($scope.pipeline);
        }

        if ($scope.previewNode) {

            var e = {
                clientX: 100,
                clientY: 220
            };

            Pipeline.addNode($scope.previewNode, e.clientX, e.clientY);

        }

        $scope.$watch('pipeline', function(n, o) {
            if (n !== o) {

                $scope.pipeline = n;

                if (angular.isDefined(Pipeline)) {
                    Pipeline.destroy();
                    Pipeline = null;
                }

                initPipeline(n);
                PipelineService.refresh();

            }
        });

        var save = function (repoId) {
            if (repoId) {
                $scope.pipeline.repo = repoId;
            }

            $scope.pipeline.json = Pipeline.getJSON();

            if ($scope.pipeline.name) {
                $scope.pipeline.json.name = $scope.pipeline.name;
            }

            if ($scope.pipeline.description) {
                $scope.pipeline.json.description = $scope.pipeline.description;
            }

            Workflow.saveWorkflow($scope.pipeline.pipeline ? $scope.pipeline.pipeline._id : '', $scope.pipeline)
                .then(function (data) {

                    if (data.id) {
                        if (repoId) {
                            $state.go('workflow-view', {id: data.id});
                        } else {
                            $state.go('workflow-editor', {id: data.id, mode: 'edit'});
                        }
                    } else {
                        $scope.pipelineChangeFn({value: false});
                    }

                    Notification.primary('Pipeline successfully updated.');
                }, function () {
                    $scope.$parent.view.saving = false;
                    $scope.$parent.view.loading = false;
                });
        };

        var fork = function (repoId, name) {
            $scope.pipeline.json = Pipeline.getJSON();

            $scope.pipeline.repo = repoId;

            if (name) {
                $scope.pipeline.name = name;
            }

            Workflow.fork($scope.pipeline).then(function (pipeline) {
                $state.go('workflow-editor', {id: pipeline.id, mode: 'edit'});
            });
        };

        /**
         * Save pipeline locally
         */
        $scope.$on('save-local', function (e, value) {
            if (value) {
                Workflow.saveLocal(Pipeline.getJSON());
            }
        });

        var format = function () {

            return Pipeline.getJSON();

        };

        var getUrl = function () {
            $scope.$parent.view.saving = true;

            $scope.pipeline.json = Pipeline.getJSON();

            Workflow.getURL($scope.pipeline).then(function (url) {
                $modal.open({
                    template: $templateCache.get('modules/common/views/job-url-response.html'),
                    controller: ['$scope', '$modalInstance', 'data', function($scope, $modalInstance, data) {

                        $scope.view = {};
                        $scope.data = data;
//                        $scope.view.trace = data.trace;

                        /**
                         * Close the modal window
                         */
                        $scope.ok = function () {
                            $modalInstance.close();
                        };

                    }],
                    resolve: { data: function () { return {trace: {message: 'Pipeline link:', url:  url.url}}; }}
                });

                $scope.$parent.view.saving = false;

            }, function () {
                $scope.$parent.view.saving = false;
            });
        };

        /**
         * Drop node on the canvas
         *
         * @param {MouseEvent} e
         * @param {String} app object
         */
        var dropNode = function(e, app) {

            var formatted = app;

            $scope.view.loading = true;
            $scope.view.explanation = false;

            if (app.pipeline) {

                formatted.json = typeof formatted.json === 'string' ? JSON.parse(formatted.json) : formatted.json;

                $scope.view.loading = false;

                formatted.json.type = 'workflow';
                formatted.json.name = app.name;

                Pipeline.addNode(formatted, e.clientX, e.clientY);

            } else {
                Tool.getRevision(app._id).then(function(result) {

                    $scope.view.loading = false;
                    console.log(result.data);

                    Pipeline.addNode(result.data.json, e.clientX, e.clientY);

                    $scope.pipelineChangeFn({value: {value: true, isDisplay: false}});
                });
            }
        };

        var onNodeDroppedOff = $rootScope.$on('node:dropped', function (e, data) {
            dropNode(data.e, data.app);
        });


        /**
         * Cancel timeout
         */
        var cancelTimeout = function () {
            if (angular.isDefined(timeoutId)) {
                $timeout.cancel(timeoutId);
                timeoutId = undefined;
            }
        };

        /**
         * Adjust size of the canvas when window size changes
         */
        var changeWidth = function () {
            if (Pipeline) {
                Pipeline.adjustSize();
            }
        };

        var lazyChangeWidth = _.debounce(changeWidth, 150);

        angular.element($window).on('resize', lazyChangeWidth);

        /**
         * Track sidebar toggle in order to adjust canvas size
         */
        var adjustSize = function (showSidebar) {

            cancelTimeout();

            timeoutId = $timeout(function () {
                Pipeline.adjustSize(showSidebar);
            }, 300);

        };

        var getEventObj = function () {
            if (Pipeline) {
                return Pipeline.Event
            } else {
                return false
            }
        };

        var updateMetadata = function (metadata) {
            if (Pipeline) {
                Pipeline.updateMetadata(metadata);
            }
        };

        /**
         * Track pipeline change
         */
        var onPipelineChangeOff = $rootScope.$on('pipeline:change', function (isDisplay) {
            $scope.pipelineChangeFn({value: {value: true, isDisplay: isDisplay}});
        });

        /**
         * Set fresh canvas
         */
        $scope.flush = function() {
            if (!$scope.view.canFlush) { return false; }

            var modalInstance = $modal.open({
                controller: 'ModalCtrl',
                template: $templateCache.get('modules/common/views/confirm-delete.html'),
                resolve: { data: function () {
                    return {
                        message: 'Are you sure you want to delete this workflow?'
                    }; }}
            });

            modalInstance.result.then(function () {
                Workflow.flush();

                if (angular.isDefined(Pipeline)) {
                    Pipeline.destroy();
                    Pipeline = null;
                    initPipeline({});

                    PipelineService.refresh();
                }
            }, function () {
                return false;
            });

        };

        /**
         * Open modal with info for selected node
         *
         * @param e
         * @param model
         * @param schema
         */
        var onNodeInfo = function(e, model, schema) {

            var _getConnections = function () {
                var connections = Pipeline.getConnections();

                return _.filter(connections, function(connection){
                    return connection.end_node === model.id || connection.start_node === model.id
                });
            };

            var $modal = $injector.get('$modal');
            var $templateCache = $injector.get('$templateCache');

            var modalInstance = $modal.open({
                template: $templateCache.get('modules/dyole/views/'+ ( schema ? 'io-' : '') +'node-info.html'),
                controller: 'ModalTabsCtrl',
                windowClass: 'modal-node',
                resolve: {data: function () { return {model: model, connections: _getConnections(), schema: schema};}}
            });

            modalInstance.result.then(function (data) {
                var scatter = data.scatter;

                if (!_.isEmpty(data.schema)) {
                    // get schema for i/o node ( copyes schema from *put )
                    var schema = model.inputs[0] || model.outputs[0];
                    schema.type = data.schema.type;

                    Pipeline.updateIOSchema(model.id, schema.type, data.schema.description);

                }

                if (scatter) {
                    model.scatter = scatter;
                } else {
                    model.scatter = false;
                    delete model.scatter;
                }
            });

        };

        var onNodeLabelEdit = function(e, opts, onEdit, onSave, scope) {

            var $modal = $injector.get('$modal');
            var $templateCache = $injector.get('$templateCache');
            var name = opts.name;
            var isSystem = opts.isSystem;

            var template = isSystem ? 'views/dyole/input-label-edit.html' : 'views/dyole/node-label-edit.html';

            $modal.open({
                template: $templateCache.get('modules/dyole/views/node-label-edit.html'),
                controller: 'NodeEditCtrl',
                windowClass: 'modal-node',
                resolve: {data: function () { return {
                    name: name,
                    onEdit: onEdit,
                    onSave: onSave,
                    scope: scope
                }; }}
            });

        };

        var onIncludeInPorts = function (nodeId, inputId, value) {
            return Pipeline.updateNodePorts(nodeId, inputId, value);
        };

        var getWorkflowHints = function () {
            return Pipeline.getHints();
        };

        var getRequireSBGMetadata = function () {
            return Pipeline.getRequireSBGMetadata();
        };

        var updateWorkflowSettings = function (hints, requireSBGMetadata) {
            return Pipeline.updateWorkflowSettings(hints,requireSBGMetadata);
        };

        var onNodeInfoOff = $rootScope.$on('node:info', onNodeInfo);
        var onNodeLabelEditOff = $rootScope.$on('node:label:edit', onNodeLabelEdit);

        $scope.$on('$destroy', function() {

            angular.element($window).off('resize', lazyChangeWidth);

            cancelTimeout();
            onPipelineChangeOff();
            onNodeInfoOff();
            onNodeLabelEditOff();
            onNodeDroppedOff();

            if (angular.isDefined(Pipeline)) {
                Pipeline.destroy();
                Pipeline = null;
            }

        });

        var validate = function () {
            return Workflow.validateJson(Pipeline.getJSON());
        };

        HotkeyRegistry.loadHotkeys([
            {name: 'delete', callback: Pipeline.deleteSelected, preventDefault: true, context: Pipeline},
            {name: 'backspace delete', callback: Pipeline.deleteSelected, preventDefault: true, context: Pipeline}
        ]);

        $scope.pipelineActions = {
            //TODO: Add disabling buttons logic
            zoomIn: function () {
                var zoom;

                if (Pipeline) {
                    Pipeline.zoomIn();
                }
            },
            zoomOut: function () {
                var zoom;

                if (Pipeline) {
                    Pipeline.zoomOut();
                }

            }
        };

        /**
         * If scope controller is set, expose pipeline methods to service
         */
        if ($scope.controllerId) {

            var methods = {
                flush: $scope.flush,
                save: save,
                dropNode: dropNode,
                getUrl: getUrl,
                fork: fork,
                format: format,
                getJSON: format,
                validate: validate,
                adjustSize: adjustSize,
                getEventObj: getEventObj,
                updateMetadata: updateMetadata,
                onIncludeInPorts: onIncludeInPorts,
                getWorkflowHints: getWorkflowHints,
                getRequireSBGMetadata: getRequireSBGMetadata,
                updateWorkflowSettings: updateWorkflowSettings
            };

            PipelineService.setInstance($scope.controllerId, methods);

        }

    }]);
