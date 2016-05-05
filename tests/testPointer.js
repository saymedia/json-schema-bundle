'use strict';

var bundler = require('../lib/bundler.js');

exports.testPointer = function (test) {

    test.expect(1);

    var p = new bundler.Pointer('#/foo/bar');
    console.log(p);

    p = new bundler.Pointer('http://example.com');
    console.log(p);

    p = new bundler.Pointer('#');
    console.log(p);

    test.ok(1);
    test.done();
};

