# Json-Schema-Bundle

*Ship to the client bundles of JSON-Schema made on the server.*

## Context

Loading a complex JSON-Schema to a client app can be difficult. If this schema
has many external references to other schemas, then:

* loading all the raw schemas from the client and resolving the references can
create a lot of HTTP requests and increase the complexity of the client.

* full dereferencing the schema on the server before sending it to the client
can produce huge HTTP payloads.

The ideal is to ship a bundle, a single document containing all the schemas and
only internal references.

## A bundle

The bundle is an array of JSON-Schema with all the JSON-References rewritten as
internal references.

The JSON-Schema of a bundle would be:

```json
{
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "array",
    "items": {
        "type": "http://json-schema.org/draft-04/schema#"
    }
}

```

The first schema in the array is the one originally requested. The other schemas
are the referenced schemas. Note that they are also fully "bundled", which means
that, like the requested schema, all their dependencies are resolved, and their
references rewritten. This creates a bundle that could be bigger than the one
strictly needed for the requested schema, but with the benefit of having all the
schemas in the array fully resolved and usable.

## Example

```javascript

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

    console.log(JSON.stringify(b, null, '  '));

    var deref = bundler.derefSchemaBundle(b);
    console.log(deref);
```

Output:

```
[
  {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "definitions": {
      "foo": {
        "type": "string"
      },
      "bar": {
        "$ref": "#/0/definitions/foo"
      },
      "baz": {
        "$ref": "#/1/definitions/a"
      }
    }
  },
  {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "definitions": {
      "a": {
        "type": "string"
      }
    }
  }
]

{ '$schema': 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  definitions:
   { foo: { type: 'string' },
     bar: { type: 'string' },
     baz: { type: 'string' } } }
```
