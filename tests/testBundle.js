'use strict';

var bundler = require('../lib/bundler.js');

exports.testSimple = function (test) {

    test.expect(3);

    var schema = {
        '$schema': 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        definitions: {
            foo: {
                type: 'string',
            }
        }
    };

    var b = bundler.bundle('http://test', schema, function (pointer) {});

    test.ok(b);
    test.ok(Array.isArray(b));
    test.ok(b.length === 1);
    test.done();

};

exports.testInternalRef = function (test) {

    test.expect(4);

    var schema = {
        '$schema': 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        definitions: {
            foo: {
                type: 'string',
            },
            bar: {
                '$ref': '#/definitions/foo'
            }
        }
    };

    var b = bundler.bundle('http://test', schema, function (pointer) {});

    test.ok(b);
    test.ok(Array.isArray(b));
    test.ok(b.length === 1);
    test.ok(b[0].definitions.bar.$ref === '#/0/definitions/foo');
    test.done();

};

exports.testExternalRef = function (test) {

    test.expect(4);

    var schema = {
        '$schema': 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        definitions: {
            foo: {
                type: 'string',
            },
            bar: {
                '$ref': '#/definitions/foo'
            },
            baz: {
                '$ref': 'http://test/A#/definitions/a'
            }
        }
    };

    var schemaA = {
        '$schema': 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        definitions: {
            a: {
                type: 'string'
            }
        }
    };

    var b = bundler.bundle('http://test', schema, function (pointer) {
        if (pointer.url === 'http://test/A') {
            return schemaA;
        }
    });

    test.ok(b);
    test.ok(Array.isArray(b));
    test.ok(b.length === 2);
    test.ok(b[0].definitions.baz.$ref === '#/1/definitions/a');
    test.done();
};

exports.testCircular = function (test) {

    test.expect(1);

    var schemaS = {
        '$schema': 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        definitions: {
            foo: {
                type: 'string',
            },
            bar: {
                '$ref': '#/definitions/foo'
            },
            baz: {
                '$ref': 'say:objectType/A#/definitions/a'
            }
        }
    };

    var schemaA = {
        '$schema': 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        definitions: {
            a: {
                '$ref': 'say:objectType/B#/definitions'
            }
        }
    };

    var schemaB = {
        '$schema': 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        definitions: {
            b: {
                type: 'string'
            },
            c: {
                '$ref': 'say:objectType/S#/definitions'
            }
        }
    };

    var b = bundler.bundle('say:objectType/S', schemaS, function (pointer) {
        if (pointer.url === 'say:objectType/A') {
            return schemaA;
        }
        if (pointer.url === 'say:objectType/B') {
            return schemaB;
        }
        if (pointer.url === 'say:objectType/S') {
            return schemaS;
        }
    });

    console.log(JSON.stringify(b, null, '  '));

    var deref = bundler.derefSchemaBundle(b);

    console.log(deref);

    test.ok(1);
    test.done();
};

