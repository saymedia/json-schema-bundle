'use strict';

var bundler = require('../lib/bundler.js');

exports.testPointer = function (test) {

    test.expect(12);

    var p = new bundler.Pointer('#/foo/bar');
    test.ok(p.isInternal === true);
    test.ok(p.url === '');
    test.ok(p.fragment === '/foo/bar');
    test.ok(p.fragmentSegments.length === 2);

    p = new bundler.Pointer('http://example.com');
    test.ok(p.isInternal === false);
    test.ok(p.url === 'http://example.com');
    test.ok(p.fragment === null);
    test.ok(p.fragmentSegments === undefined);

    p = new bundler.Pointer('#');
    test.ok(p.isInternal === true);
    test.ok(p.url === '');
    test.ok(p.fragment === '');
    test.ok(p.fragmentSegments.length === 0);

    test.done();
};

