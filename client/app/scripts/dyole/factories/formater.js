/**
 * Created by filip on 12/12/14.
 */

'use strict';
angular.module('registryApp.dyole')
    .factory('Formater', [function() {

        var formater = {

            packedSchema: null,

            toRabixSchema: function (j) {

                var json = _.clone(j);
                // reset schema
                this.packedSchema = {};
                this.packedSchema.steps = [];
                this.packedSchema.inputs = {
                    properties: {}
                };
                this.packedSchema.outputs = {
                    properties: {}
                };

                if ( (!json.relations || json.relations.length === 0 ) && json.nodes.length === 1) {
                    var _id = json.nodes[0]._id;

                    this.packedSchema.steps.push({
                        _id: _id,
                        app: json.schemas[_id],
                        inputs: {},
                        outputs: {}
                    });

                } else {
                    this._transformRelationsToSteps(json.relations || [], json.nodes, json.schemas);
                }

                delete json.relations;
                delete json.schemas;
                delete json.nodes;

                json = _.extend(json, this.packedSchema);

                return json;
            },

            toPipelineSchema: function (json) {

                // reset schema
                this.packedSchema = {};
                this.packedSchema.schemas = {};
                this.packedSchema.nodes = [];
                this.packedSchema.relations = [];
                this.packedSchema.display = json.display;

                this._transformStepsToRelations(json);

                return this.packedSchema;

            },

            _transformRelationsToSteps: function (relations, nodes, schemas) {

                var _self = this;

                _.forEach(relations, function (rel) {
                    var step, node_schema;

                    node_schema = schemas[rel.end_node];

                    if (_self._checkSystem(node_schema)) {
                        _self._createInOut('outputs', node_schema);
                    } else {
                        step = _self._createOneAppStep(rel, nodes, schemas);
                    }

                    if (step) {
                        step.app = _.clone(node_schema);

                        _.remove(_self.packedSchema.steps, function (s) {

                            return s._id === step._id;
                        });

                        _self.packedSchema.steps.push(step);
                    }
                });

                this._generateSystemNodes(relations, nodes, schemas);

            },

            _generateSystemNodes: function (relations, nodes, schemas) {
                var _self = this;

                _.forEach(relations, function (rel) {

                    var node_schema = schemas[rel.end_node];

                    if (_self._checkSystem(node_schema)) {

                        _self._attachOutput(rel);

                        _self._createInOut(node_schema.softwareDescription.type + 's', node_schema);

                    } else {
                        node_schema = schemas[rel.start_node];
                    }

                    if (_self._checkSystem(node_schema)) {

                        _self._createInOut(node_schema.softwareDescription.type + 's', node_schema);
                    }

                });
            },

            _checkSystem: function (node_schema) {

                return node_schema.softwareDescription && node_schema.softwareDescription.repo_name === 'system';
            },

            _attachOutput: function (rel) {
                var filter = _.filter(this.packedSchema.steps, function (step) {
                    return step._id === rel.start_node;
                });

                if (filter.length !== 0) {
                    filter[0].outputs[rel.output_name] = {
                        $to: rel.input_name
                    };
                }
            },

            _createInOut: function (type, node) {
                var obj = this.packedSchema[type].properties;

                type = type === 'inputs' ? 'outputs' : 'inputs';

                if (typeof obj[node.id] === 'undefined') {
                    obj[node.id] = node[type].properties[Object.keys(node[type].properties)[0]];
                }

            },

            _createOneAppStep: function (rel, nodes, schemas) {

                var from, exists, step = {};

                var node_schema = schemas[rel.end_node];

                step._id = rel.end_node;

                exists = _.filter(this.packedSchema.steps, function (s) {

                    return s._id === step._id;
                });

                if (exists.length !== 0) {
                    step = exists[0];
                } else {
                    step = {
                        _id: rel.end_node,
                        app: node_schema,
                        inputs: {},
                        outputs: {}
                    };
                }

                from = rel.start_node + '.' + rel.output_name;

                if (this._checkSystem(schemas[rel.start_node])) {
                    from = rel.output_name;
                }

                console.log('step:',step._id, from);
                step.inputs[rel.input_name] = {
                    $from: from
                };

                console.log(step._id, step);

                return step;
            },

            /**
             * Transform steps to relation type schema
             *
             * @param json
             * @private
             */
            _transformStepsToRelations: function (json) {
                //TODO: Please refactor this :)

                var _self = this,
                    steps = json.steps,
                    relations = this.packedSchema.relations,
                    nodes = this.packedSchema.nodes,
                    schemas = this.packedSchema.schemas;

                _.forEach(steps, function (step) {
                    var end_node = step._id, input_name, output_name, start_node;


                    if (!schemas[step._id]) {
                        schemas[step._id] = step.app;
                    }

                    step.app.id = step._id;

                    var ex = _.filter(nodes, function (n) {
                        return n.id === step.app.id;
                    });

                    if (ex.length === 0) {
                        nodes.push(step.app);
                    }

                    _.forEach(step.inputs, function (from, input) {
                        var relation, s, filter;

                        s = from.$from.split('.');

                        if (s.length !== 1) {
                            start_node = s[0];
                            output_name = s[1];
                        } else {
                            var input_id;

                            filter = _.filter(json.inputs.properties, function (input, id) {
                                if (input.id === s[0]) {
                                    input_id = id;
                                }
                                return input.id === s[0];
                            });

                            if (filter.length !== 0) {
                                var m = _self._generateIOSchema('input', filter[0], input_id);

                                m.name = input_id;
                                schemas[input_id] = m;

                                nodes.push(m);

                                start_node = input_id;
                            } else {
                                start_node = '';
                                throw new Error('Invalid Input name');
                            }

                            output_name = s[0];
                        }

                        input_name = input;

                        relation = {
                            end_node: end_node,
                            input_name: input_name,
                            output_name: output_name,
                            start_node: start_node,
                            type: 'connection',
                            // id needs to be a string
                            id: _.random(100000, 999999) + ''
                        };

                        relations.push(relation);
                    });

                    _.forEach(step.outputs, function (to, output) {
                        var relation, filter, output_id;

                        start_node = end_node;
                        output_name = output;

                        input_name = to.$to;
                        filter = _.filter(json.outputs.properties, function (out, id) {
                            if (out.id === input_name) {
                                output_id = id;
                            }
                            return out.id === input_name;
                        });

                        if (filter.length !== 0) {

                            var m = _self._generateIOSchema('output', filter[0], output_id);

                            if (!schemas[output_id]) {
                                m.name = output_id;
                                schemas[output_id] = m;
                            }

                            var ex = _.filter(nodes, function (n) {
                                return n.id === output_id;
                            });

                            if (ex.length === 0) {
                                nodes.push(m);
                            }

                            end_node = output_id;
                        } else {
                            end_node = '';
                            throw new Error('Invalid Output name');
                        }

                        relation = {
                            end_node: end_node,
                            input_name: input_name,
                            output_name: output_name,
                            start_node: start_node,
                            type: 'connection',
                            // id needs to be a string
                            id: _.random(100000, 999999) + ''
                        };

                        relations.push(relation);

                    });

                });

                _.forEach(nodes, function (model) {

                    // skip system nodes (inputs, outputs)
                    if( model.softwareDescription && model.softwareDescription.repo_name === 'system'){
                        return;
                    }

                    console.log('model from nodes: ', model);

                    _.forEach(model.inputs.properties, function (input, name) {
                        input.name = name;
                        input.id = input.id || name;
                    });

                    _.forEach(model.outputs.properties, function (output, name) {
                        output.name = name;
                        output.id = output.id || name;
                    });

                });

            },

            _generateIOSchema: function (type, schema, id) {

                var internalType = type === 'input' ? 'outputs' : 'inputs';

                var model = {
                    'name': schema.name || 'System app',
                    'softwareDescription': {
                        'repo_owner': 'rabix',
                        'repo_name': 'system',
                        'type': type
                    },
                    'documentAuthor': null,
                    'inputs': {
                        type: 'object'
                    },
                    'outputs': {
                        type: 'object'
                    }
                };

                model[internalType].properties = {};
                model[internalType].properties[schema.id] = schema;

                model[internalType].properties[schema.id].name = schema.id;
                model[internalType].properties[schema.id].id = schema.id;

                model.id = id;

                return model;
            }

        };

        return formater;

    }]);