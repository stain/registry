'use strict';

var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var _ = require('lodash');
var fs = require('fs');

var Pipeline = mongoose.model('Pipeline');
var PipelineUrl = mongoose.model('PipelineUrl');

var filters = require('../../common/route-filters');
var formater = require('../../pipeline/formater');
var Amazon = require('../../aws/aws').Amazon;

var raw_pipeline_model = {
    stamp: {
        created_by: '',
        created_on: '',
        modified_by: '',
        modified_on: ''
    },
    display: {
        canvas: {
            x: 0,
            y: 0,
            zoom: 1
        },
        description: '',
        name: '',
        nodes: {}
    },
    nodes: [],
    relations: [],
    schemas: []
};

var packed_raw_pipeline_model = {
    stamp: {
        created_by: '',
        created_on: '',
        modified_by: '',
        modified_on: ''
    },
    display: {
        canvas: {
            x: 0,
            y: 0,
            zoom: 1
        },
        description: '',
        name: '',
        nodes: {}
    },
    // realtions -> steps
    steps: [],
    // nodes -> apps
    apps: {},
    // inputs from relations -> inputs (remove relations)
    inputs: {},
    // outputs from relations -> outputs (remove relations)
    outputs: {}
};


module.exports = function (app) {
    app.use('/api', router);
};

router.post('/pipeline/format', function (req, res, next) {

        var p = formater.toRabixSchema(req.body.pipeline.json || req.body.pipeline);

        if (p.steps.length === 0) {
            res.status(400).json({message: "Invalid pipeline"});
        } else {
            res.json({json: p});
        }

});

router.post('/pipeline/format/upload', function (req, res, next) {
    var p = req.body.pipeline;
    console.log(p);
    var folder, pipeline = p.json;

    if (req.user) {
        folder = 'users/' + req.user.login + '/pipelines/' + p.name;
    } else {
        folder = 'others/pipelines';
    }

    var timeStamp = Date.now();

    Amazon.createFolder(folder).then(
        function () {
            Amazon.uploadJSON(p.name + timeStamp + '.json', pipeline, folder).then(
                function () {

                    Amazon.getFileUrl(p.name + timeStamp + '.json', folder, function (u) {

                        if (req.user && req.user.id) {

                            var url = new PipelineUrl();

                            url.url = u;

                            url.pipeline_id = p._id;

                            url.user_id = req.user.id;

                            url.save();

                        }

                        res.json({url: u});

                    });

                }, function (error) {
                    res.status(500).json(error);
                });
        }, function (error) {
            res.status(500).json(error);
        });

});

router.get('/pipeline', function (req, res, next) {

    var limit = req.query.limit ? req.query.limit : 25;
    var skip = req.query.skip ? req.query.skip : 0;
    var where = {};

    _.each(req.query, function(paramVal, paramKey) {
        if (_.contains(paramKey, 'field_')) {
            where[paramKey.replace('field_', '')] = paramVal;
        }
        if (paramKey === 'q') {
            where.$or = [
                {name: new RegExp(paramVal, 'i')},
                {description: new RegExp(paramVal, 'i')}
            ];
        }
    });

    if (req.user && req.param('mine')) {
        where.user_id = req.user.id;
    }

    Pipeline.count(where).exec(function(err, total) {
        if (err) { return next(err); }

        Pipeline.find(where).skip(skip).limit(limit).exec(function(err, pipelines) {
            if (err) { return next(err); }

            res.json({list: pipelines, total: total});
        });

    });
});

router.get('/pipeline/:id', function (req, res, next) {

    Pipeline.findById(req.params.id).exec(function(err, pipeline) {
        if (err) { return next(err); }

        res.json({data: pipeline});
    });

});

router.post('/pipeline', function (req, res) {

    var data = req.body.data;

    var pipeline = new Pipeline();

    pipeline.json = data.json;
    pipeline.name = data.name;
    pipeline.author = req.user.email;
    pipeline.user_id = req.user.id;
    pipeline.description = data.description;

    pipeline.save();

    res.json({message: 'Pipeline successfully added', id: pipeline._id});

});

router.delete('/pipeline/:id', filters.authenticated, function (req, res, next) {

    Pipeline.findOne({_id: req.params.id}, function (err, pipeline) {
        if (err) { return next(err); }

        var user_id = req.user.id.toString();
        var app_user_id = pipeline.user_id.toString();

        if (user_id === app_user_id) {
            Pipeline.remove({_id: req.params.id}, function (err) {
                if (err) { return next(err); }

                res.json({message: 'Pipeline successfully deleted'});

            });
        } else {
            res.status(500).json({message: 'Unauthorized'});
        }
    });


});

router.put('/pipeline/:id', function (req, res, next) {

    var data = req.body.data;

    Pipeline.findById(req.params.id).exec(function(err, pipeline) {
        if (err) { return next(err); }

        pipeline.json = data.json;
        pipeline.name = data.name;
        pipeline.author = data.author;
        pipeline.description = data.description;

        pipeline.save();

        res.json({message: 'Pipeline successfully updated'});
    });

});

router.post('/pipeline/fork', filters.authenticated, function (req, res, next) {

    var pipeline = req.body.pipeline;

    var p = new Pipeline();

    p.json = pipeline.json;
    p.user_id = req.user.id;
    p.author = pipeline.author;

    //TODO: FIX THIS, repo name should be taken from user that is forking
    p.repo_name = pipeline.repo_name;
    p.repo_id = pipeline.repo_id;

    p.description = pipeline.description;
    p.name = pipeline.name;
    p.repo_owner = req.user.login;

    p.save();

    res.json({
        _id: p._id,
        message: 'Pipeline successfully updated'
    });

});


