'use strict';

var bundler = require('../lib/bundler.js');

exports.testPointer = function (test) {

    test.expect(1);

    var schemaS = {
        schemaVersion: 0,
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
        schemaVersion: 0,
        '$schema': 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        definitions: {
            a: {
                '$ref': 'say:objectType/B#/definitions'
            }
        }
    };

    var schemaB = {
        schemaVersion: 0,
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

