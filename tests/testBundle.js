'use strict';

var bundler = require('../lib/bundler.js');

exports.testSimple = function (test) {

    test.expect(3);

    var schema = {
        '$schema': 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        definitions: {
            foo: {
                type: ['string', 'null'],
                enum: ['bar', null],
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

    test.expect(9);

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
                '$ref': 'http://test/B#/definitions'
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
                '$ref': 'http://test#/definitions'
            }
        }
    };

    var b = bundler.bundle('http://test', schema, function (pointer) {
        if (pointer.url === 'http://test') {
            return schema;
        }
        if (pointer.url === 'http://test/A') {
            return schemaA;
        }
        if (pointer.url === 'http://test/B') {
            return schemaB;
        }
    });

    test.ok(b);
    test.ok(Array.isArray(b));
    test.ok(b.length === 3);
    test.ok(b[0].definitions.baz.$ref === '#/1/definitions/a');
    test.ok(b[2].definitions.c.$ref === '#/0/definitions');

    var deref = bundler.derefSchemaBundle(b);

    test.ok(deref.definitions.foo.type === 'string');
    test.ok(deref.definitions.bar.type === 'string');
    test.ok(deref.definitions.baz.b.type === 'string');
    test.ok(deref.definitions.baz.c === deref.definitions); // circular

    test.done();
};

