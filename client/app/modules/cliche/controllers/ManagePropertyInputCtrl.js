/**
 * Author: Milica Kadic
 * Date: 12/18/14
 * Time: 12:30 PM
 */

'use strict';

angular.module('registryApp.cliche')
    .controller('ManagePropertyInputCtrl', ['$scope', '$modalInstance', 'Cliche', 'options', 'Helper', 'HelpMessages', function ($scope, $modalInstance, Cliche, options, Helper, HelpMessages) {

        var key = options.key || 'name';
        var idObj = {n: '', o: ''};
        var cacheAdapter = {
            'rbx:cmdInclude': true,
            separate: true
        };

        $scope.help = HelpMessages;

        $scope.view = {};
        $scope.view.key = key;
        $scope.view.mode = options.mode;
        $scope.view.property = options.property || {};
        $scope.view.property.schema =  Cliche.getSchema('input', options.property, options.toolType, false);

        // only add adapter if one has been defined
        if (options.property && options.property.inputBinding) {
            $scope.view.property.inputBinding = Cliche.getAdapter(options.property, false, 'input');
        }

        $scope.view.name = Cliche.parseName(options.property);
        $scope.view.required = Cliche.isRequired($scope.view.property.schema);
        $scope.view.type = Cliche.parseType($scope.view.property.schema);
        $scope.view.items = Cliche.getItemsRef($scope.view.type, $scope.view.property.schema);
        $scope.view.itemsType = Cliche.getItemsType($scope.view.items);

        $scope.view.types = Cliche.getTypes('input');
        $scope.view.itemTypes = Cliche.getTypes('inputItem');


        var enumObj = Cliche.parseEnum($scope.view.property.schema);
        $scope.view.reservedNames = ['file','string','enum','int','float','boolean','array'];
        $scope.view.enumName = enumObj.name;
        $scope.view.symbols = enumObj.symbols;

        $scope.view.disabled = ($scope.view.items && $scope.view.items.type) === 'record';
        $scope.view.inputBinding = !!(!_.isUndefined($scope.view.property.inputBinding) && $scope.view.property.inputBinding['rbx:cmdInclude']);
        $scope.view.stdin = $scope.view.inputBinding && !_.isUndefined($scope.view.property.inputBinding.stdin);

        $scope.view.description = $scope.view.property.description || '';
        $scope.view.label = $scope.view.property.label || '';

        $scope.view.jobInputs = Cliche.getJob().inputs;
        $scope.view.isNested = options.isNested === 'true';

        idObj.o = $scope.view.name;

        $scope.view.stdinUsed = Cliche.getStdinInput();


        /**
         * Save property changes
         *
         * @returns {boolean}
         */
        $scope.save = function() {

            $scope.view.error = '';
            $scope.view.form.$setDirty();

            if ($scope.view.form.$invalid) { return false; }

            /* special case, if enum type we need to check if enum name already exists */
            if ($scope.view.type === 'enum') {

                enumObj.newName = $scope.view.enumName;

                if (Cliche.checkIfEnumNameExists(options.mode, enumObj)) {
                    $scope.view.error = 'Choose another enum name, "' + $scope.view.enumName + '" already exists';
                    return false;
                }
            }

            if ($scope.view.mode === 'edit') {
                $scope.view.jobInputs[$scope.view.name] = Helper.getDefaultInputValue($scope.view.name, $scope.view.symbols, $scope.view.type, $scope.view.itemsType);
            }

            var inner = {
                key: key,
                name: $scope.view.name,
                required: $scope.view.required,
                type: $scope.view.type,
                enumName: $scope.view.enumName,
                symbols: $scope.view.symbols,
                items: $scope.view.items,
                label: $scope.view.label,
                description: $scope.view.description,
                category: $scope.view.category
            };

            $scope.view.property.type = $scope.view.property.schema;
            delete $scope.view.property.schema;

            var formatted = Cliche.formatProperty(inner, $scope.view.property, 'input');

            idObj.n = $scope.view.name;

            Cliche.manageProperty(options.mode, formatted, options.properties, idObj)
                .then(function() {
                    $modalInstance.close({prop: formatted});
                }, function(error) {
                    $scope.view.error = error;
                });


        };

        /* watch for the type change in order to adjust the property structure */
        $scope.$watch('view.type', function(n, o) {
            if (n !== o) {
                if (n === 'array') {
                    $scope.view.itemsType = 'string';
                    $scope.view.items = $scope.view.itemsType;
                } else {
                    $scope.view.itemsType = '';
                    delete $scope.view.items;
                }
            }
        });

        /* watch for the items type change in order to adjust the property structure */
        $scope.$watch('view.itemsType', function(n, o) {
            if (n !== o) {
                if (n === 'record') {
                    // if itemsType is a record, create object
                    // items: { type: 'record', fields: []}
                    $scope.view.disabled = true;
                    $scope.view.items = {};

                    if (_.isUndefined($scope.view.items.fields)) {
                        $scope.view.items.type = 'record';
                        $scope.view.items.fields = [];

                        if ($scope.view.adapter) {
                            $scope.view.property.inputBinding.prefix = '';
                            delete $scope.view.property.inputBinding.itemSeparator;
                            delete $scope.view.property.inputBinding.valueFrom;
                        }
                    }
                } else {
                    // if itemsType is not a record, make items string
                    // items: 'string' || 'boolean' || etc.

                    $scope.view.disabled = false;
                    $scope.view.items = $scope.view.itemsType;
                }
            }
        });

        /**
         * Update transform value with expression
         *
         * @param value
         */
        $scope.updateTransform = function (value) {

            if (_.isObject(value)) {
                $scope.view.property.inputBinding.valueFrom = value;
            } else {
                delete $scope.view.property.inputBinding.valueFrom;
            }

        };

        /**
         * Toggle inputBinding definition
         */
        $scope.toggleAdapter = function () {

            if ($scope.view.inputBinding && !$scope.view.stdin) {
                $scope.view.property.inputBinding = _.extend($scope.view.property.inputBinding, cacheAdapter) || cacheAdapter;
            } else if (!$scope.view.stdin) {
                if ($scope.view.property.inputBinding && $scope.view.property.inputBinding.stdin) {
                    delete $scope.view.property.inputBinding.stdin;
                }

                cacheAdapter = _.isEmpty($scope.view.property.inputBinding) ? cacheAdapter : angular.copy($scope.view.property.inputBinding);
                delete $scope.view.property.inputBinding;
            }
        };


        /**
         * switch standard input
         */
        $scope.switchStdin = function (input) {

            $scope.view.inputBinding = $scope.view.stdin;
            $scope.toggleAdapter();

            if ($scope.view.stdin) {
                input.inputBinding = {stdin: true};
                Cliche.switchStdin(input);
            } else {
                input.inputBinding = cacheAdapter;
            }
        };

        /**
         * Dismiss modal
         */
        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

    }]);
