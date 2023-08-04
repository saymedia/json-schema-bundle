'use strict';

(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(factory);
  } else if (typeof module !== 'undefined' && module.exports){
    // CommonJS
    module.exports = factory();
  } else {
    // Browser
    global.Bundler = factory();
  }
}(this, function () {

function Pointer(pointerStr) {
    // TODO Need normalization ? like lowercase the hostname part ? URI parser ?

    this.str = pointerStr;

    this.isInternal = this.str.substr(0, 1) === '#';

    var fragmentIndex = this.str.indexOf('#');

    this.fragment = fragmentIndex >= 0 ?
        this.str.substr(fragmentIndex + 1) : null;

    this.url = fragmentIndex >= 0 ?
        this.str.substr(0, fragmentIndex) : this.str;

    if (this.fragment !== null) {
        this.fragmentSegments = this.fragment.split('/');
        this.fragmentSegments.shift();
    }
}

/**
 * Bundle a schema given its JSON-Pointer, its raw schema and a function to
 * resolve external references.
 * - the JSON-Pointer is the one used by other schemas to reference the requested
 *   raw schema.
 * - the raw schema is assumed to not contain javascript circular references.
 * - externalSchemaLoader takes a Pointer object as parameter, and must return a raw
 *   schema object.
 */
// TODO Make externalSchemaLoader return a Promise
function bundle(originPointer, originSchema, externalSchemaLoader) {

    if (!originPointer) {
        throw new Error('originPointer required');
    }
    if (!originSchema) {
        throw new Error('originSchema required');
    }
    if (!externalSchemaLoader) {
        throw new Error('externalSchemaLoader required');
    }

    var bundle = []; // the result
    var pointerToId = {};
    var queue = []; // queue of id of schemas to be processed

    var addToBundle = function (pointer, schema) {
        bundle.push(JSON.parse(JSON.stringify(schema))); // deep copy
        var id = bundle.length - 1;
        pointerToId[pointer.url] = id;
        queue.push(id);
        return id;
    };

    var recusiveBundle = function(localPointerId, schemaPart) {
        if (schemaPart.$ref) {
            var pointer = new Pointer(schemaPart.$ref);
            if (pointer.isInternal) {
                // repoint the ref
                schemaPart.$ref = '#/' + localPointerId;
                if (pointer.fragment) {
                    schemaPart.$ref += pointer.fragment;
                }
            }
            else {
                var pointerId = pointerToId[pointer.url];
                if (pointerId === undefined) {
                    var externalSchema = externalSchemaLoader(pointer);
                    if (!externalSchema) {
                        throw new Error('externalSchemaLoader must return a schema');
                    }
                    pointerId = addToBundle(pointer, externalSchema);
                }
                schemaPart.$ref = '#/' + pointerId;
                if (pointer.fragment) {
                    schemaPart.$ref += pointer.fragment;
                }
            }
        }
        else {
            for (var property in schemaPart) {
                if (schemaPart.hasOwnProperty(property) && typeof schemaPart[property] === 'object' && schemaPart[property] !== null) {
                    recusiveBundle(localPointerId, schemaPart[property]);
                }
            }
        }
    };

    addToBundle(new Pointer(originPointer), originSchema);

    while (queue.length > 0) {
        var pointerId = queue.shift();
        recusiveBundle(pointerId, bundle[pointerId]);
    }

    return bundle;
}

/**
 * Resolve and internal pointer.
 * Throw an error is the pointer is not internal, or if the document part cannot be found.
 */
function resolvePointer(pointer, bundleDocument) {
    if (!pointer) {
        throw new Error('pointer required');
    }
    if (!bundleDocument) {
        throw new Error('bundleDocument required');
    }
    if (!pointer.isInternal) {
        throw new Error('not an internal pointer');
    }

    if (pointer.fragmentSegments.length === 0) {
        // "$ref": "#"
        return bundleDocument;
    }
    var documentPart = bundleDocument;
    pointer.fragmentSegments.forEach(function (segment) {
        if (documentPart.hasOwnProperty(segment)) {
            documentPart = documentPart[segment];
        }
        else {
            throw new Error('invalid JSON pointer can\'t find ' +
                pointer.str + ', segment: ' + segment);
        }
    });
    return documentPart;
}

/**
 * Dereference the bundle in place.
 * Handle internal references only, throw an error otherwise.
 * The dereferenced schema can contain circular references.
 * Intended to be used for schema bundles.
 */
function derefSchemaBundle(bundleDocument) {

    var seen = [];

    var recusiveDeref = function(parentPart, partName, documentPart) {

        // handle circular references
        if (seen.indexOf(documentPart) !== -1) {
            return;
        }
        seen.push(documentPart);

        if (documentPart.$ref) {
            var pointer = new Pointer(documentPart.$ref);
            var pointerData = resolvePointer(pointer, bundleDocument);
            if (parentPart) {
                parentPart[partName] = pointerData;
            }
            else {
                // the whole schema was a $ref
                documentPart = pointerData;
            }
            recusiveDeref(parentPart, partName, pointerData);
        }
        else {
            for (var property in documentPart) {
                if (documentPart.hasOwnProperty(property) && typeof documentPart[property] === 'object' && documentPart[property] !== null) {
                    recusiveDeref(documentPart, property, documentPart[property]);
                }
            }
        }
    };
    recusiveDeref(null, null, bundleDocument[0]);
    return bundleDocument[0];
}

var Bundler = {
    Pointer: Pointer,
    bundle: bundle,
    derefSchemaBundle: derefSchemaBundle,
};

return Bundler;

}));
