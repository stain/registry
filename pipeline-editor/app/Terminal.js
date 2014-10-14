/**
 * Created by filip on 8.10.14..
 */
(function (Pipeline) {
    function Terminal(options) {
        this.parent = options.parent;
        this.model = options.model;
        this.canvas = options.canvas;
        this.mouseover = false;
        this.terminalConnected = false;
        this.pipeline = options.pipeline;

        this.pipelineWrap = options.pipelineWrap;
        this.id = this.model.id;

        this.el = null;

        this.terminals = {};

        this.connections = [];

    }

    Terminal.prototype = {

        constraints: {
            radius: 8,
            radiusInner: 4.4,

            available: {
                gradiant: '',
                fill: '#3eb157',
                stroke: ''
            },

            connected: {
                gradiant: '',
                fill: '#1E8BC3',
                stroke: ''
            },

            // defaults
            gradiant: '',
            fill: '#888888',
            stroke: ''
        },

        connectionConfig: {
            width: 7,
            color: '#dddddd'
        },

        initHandlers: function () {
            var self = this,
                $canvasArea = $(self.pipeline.$parent);

            this.mousedown = false;

            this.terminal.mousedown(function (e) {
                var translation;

                translation = self._getElTranslation();

                self.startCoords = translation;

                self.mousedown = true;

                self.pipeline.Event.trigger('terminal:selectAvailable', self.model, self.parent.model.id);

                e.preventDefault();
                e.stopPropagation();
            });

            this.terminal.mouseup(function (e) {
                self.pipeline.Event.trigger('terminal:deselectAvailable');

                self._removeTempConnection(self.onMouseUpCallback);

                self.mousedown = false;
            });


            $canvasArea.mousemove(function (e) {
                e.preventDefault();
                // e.stopPropagation();

                if (self.mousedown) {
                    if (!self.tempConnection) {
                        self.drawConnection(e);
                    } else {
                        self.redrawConnection(e);
                    }
                }
            });

            $('body').mouseup(function () {
                self.parent.deselectAvailableTerminals();
                self._removeTempConnection();

                self.onMouseUpCallback();

                self.mouseoverTerminal = null;
                self.mousedown = false;
            });


            this.pipeline.Event.subscribe('terminal:mouseover', function (terminal) {
                if (self.mousedown && self.tempConnection) {
                    self.mouseoverTerminal = terminal;
                }
            });

            this.pipeline.Event.subscribe('terminal:mouseout', function () {
                self.mouseoverTerminal = null;
            });

            this.pipeline.Event.subscribe('terminal:selectAvailable', function (terminal, nodeId) {

//                self.checkAvailibility(terminal, nodeId);

            });

//            this.listenTo(globals.vents, 'terminal:deselectAvailable', function () {
//
//                self.setDefaultState();
//
//            });

        },

        onMouseUpCallback: function () {
            var self = this,
                available;

            if (self.mouseoverTerminal) {

                available = this.checkAvailibility(this.mouseoverTerminal.model, this.mouseoverTerminal.parent.id);

                if (available.status) {
                    globals.vents.trigger('connection:create', self.mouseoverTerminal, self);

                    self.mouseoverTerminal = null;
                } else {
//                    Notify.show('Cannot connect terminal: ' + available.error);
                    console.error('Node cannot connect')
                }

            }

        },

        checkAvailibility: function (terminal, nodeId) {

            var crossIn, crossOut, bothSystem, startNode = this.parent.model, endNode = this.pipeline.nodes[nodeId].model;

            crossIn = _.intersection(terminal.types, this.model.types);
            crossOut = _.intersection(this.model.types, terminal.types);

            if ( ( (crossIn.length !== 0 || crossOut.length !== 0 ) || (terminal.types.length === 0 || this.model.types.length === 0) ) && nodeId !== this.parent.model.id && terminal.input !== this.model.input) {

                if (!this.terminals[terminal.id] ||  ( this.terminals[terminal.id] && this.terminals[terminal.id] !== this.parent.model.get('id') ) ) {
                    this.showAvailableState();
                    return {
                        status: true,
                        error: false
                    };
                } else {
                    return {
                        status: false,
                        error: 'Terminal already connected with same terminal'
                    };
                }

            }

            return {
                status: false,
                error: 'Terminal types are not compatible'
            };
        },

        render: function () {

            var self = this,
                model = this.model,
                canvas = this.canvas,
                xOffset = 12,
                el, terminalBorder, terminalInner, label, labelXOffset, borders,
                required = this.model.required ? '(required)' : '';

            el = canvas.group();

            terminalBorder = canvas.circle(0, 0, this.constraints.radius);
            terminalBorder.attr({
                fill: this.model.required ? '#f4d794' : '90-#F4F4F4-#F4F4F4:50-#F4F4F4:50-#F4F4F4',
//                stroke: '#cccccc'
                stroke: this.model.required ? '#cbac6f' : '#cccccc'
            });

            terminalInner = canvas.circle(0, 0, this.constraints.radiusInner);
            terminalInner.attr({
                fill: this.constraints.fill,
                stroke: this.constraints.stroke
            });

            label = canvas.text(0, 0, model.name + ' ' + required);

            label.attr({
                'font-size': '12px'
            });

            if (model.input) {
                labelXOffset = -1 * (label.getBBox().width / 2) - xOffset;
            } else { // output
                labelXOffset = (label.getBBox().width / 2) + xOffset;
            }

            label.translate(labelXOffset, 0);

            label.attr('fill', 'none');

            borders = canvas.group();

            borders.push(terminalBorder).push(terminalInner);

            borders.hover(function () {
                self.mouseover = true;

                if (!self.pipeline.tempConnectionActive) {
                    self.showTerminalName();
                }

                self.pipeline.Event.trigger('terminal:mouseover', self);
            }, function () {
                self.mouseover = false;
                self.hideTerminalName();
                self.pipeline.Event.trigger('terminal:mouseout');
            });

            el.push(borders).push(label);

            el.translate(model.x, model.y);

            this.el = el;
            this.terminal = borders;
            this.label = label;
            this.terminalInner = terminalInner;
            this.terminalBorder = terminalBorder;

            this.initHandlers();

            return this;
        },

        showTerminalName: function () {

            this.label.attr('fill', '#666');
        },

        hideTerminalName: function () {

            if (!this.mouseover) {
                this.label.attr('fill', 'none');
            }

        },

        setConnectedState: function () {
            this.terminalConnected = true;
            this.terminalInner.attr({
                gradient: this.constraints.connected.gradiant,
                fill: this.constraints.connected.fill,
                stroke: this.constraints.connected.stroke
            });

            if (this.model.required) {
                this.terminalBorder.attr({
                    fill: '90-#F4F4F4-#F4F4F4:50-#F4F4F4:50-#F4F4F4',
                    stroke: '#cccccc'
                });
            }

        },

        showAvailableState: function () {
            this.terminalInner.attr({
                gradient: 'none',
                fill: this.constraints.available.fill,
                stroke: this.constraints.available.stroke
            });
        },

        setDefaultState: function () {

            this.terminalInner.attr({
                gradient: this.constraints.gradient,
                fill: this.constraints.fill,
                stroke: this.constraints.stroke
            });

            if (this.model.required) {
                this.terminalBorder.attr({
                    fill: '#f4d794',
//                stroke: '#cccccc'
                    stroke: '#cbac6f'
                });
            }

            if (this.terminalConnected) {
                this.setConnectedState();
            } else {
                this.terminalConnected = false;
            }

        },

        addConnection: function (connectionId) {
            this.connections.push(connectionId);
        },

        _getElTranslation: function () {
            var scale, translation, parent, pipeline;

            scale = this.pipeline.getEl().getScale();
            parent = this.parent.el.getTranslation();
            pipeline = this.pipeline.getEl().getTranslation();
            translation = this.el.getTranslation();

            translation.x += parent.x + pipeline.x;
            translation.y += parent.y + pipeline.y;

            translation.x = translation.x * scale.x;
            translation.y = translation.y * scale.y;

            return translation;
        },

        _getConnectionCoordsDiff: function (e) {
            var diff = {},
                ctm = this.terminal.node.getScreenCTM(),
                translation;

            translation = this._getElTranslation();

            diff.x = e.clientX - ( ctm.e - translation.x );
            diff.y = e.clientY - ( ctm.f - translation.y );

            return diff;
        },

        drawConnection: function (e) {
            var attr, coords,
                diff = this._getConnectionCoordsDiff(e),
                scale = this.pipelineWrap.getScale().x;

            coords = {
                x1: this.startCoords.x,
                y1: this.startCoords.y,
                x2: diff.x,
                y2: diff.y
            };

            attr = {
                stroke: '#EBEBEB',
                'stroke-width': this.connectionConfig.width * scale
            };

//            console.log(this.pipelineWrap.getScale().x);

            this.tempConnection = this.canvas.curve(coords, attr);
            this.tempConnection.toBack();

            this.pipeline.Event.trigger('temp:connection:state', true);


        },

        redrawConnection: function (e) {
            var coords,
                scale = this.pipelineWrap.getScale().x,
                diff = this._getConnectionCoordsDiff(e);

            coords = {
                x1: this.startCoords.x,
                y1: this.startCoords.y,
                x2: diff.x,
                y2: diff.y
            };

            this.tempConnection.redraw(coords, 8 * scale);
        },

        removeConnection: function (connectionId) {
            var index;

            _.each(this.connections, function (id, ind) {
                if (id === connectionId) {
                    index = ind;
                }
            });

            delete this.terminals[this.connections[index]];

            this.connections.splice(index, 1);

            return this.connections.length !== 0;
        },

        _removeTempConnection: function (callback) {

            if (this.tempConnection) {
                this.tempConnection.remove();
                this.tempConnection = null;

                if (callback && typeof callback === 'function') {
                    callback();
                }

                this.pipeline.Event.trigger('temp:connection:state', false);


            }

        }

    };

    Pipeline.Terminal = Terminal;
})(Pipeline || {});