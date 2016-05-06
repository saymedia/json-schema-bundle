'use strict';

/*

Idea of a simple JSON-Schema bundler and dereferencer.

(https://github.com/BigstickCarpet/json-schema-ref-parser seems to be bugged.
It produces bundles that it can't dereference.)

The following algo produces a bundle that is much flatter, with shorter pointers,
and that can be dereferenced.


*/

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

// assume schema loaded from JSON documents (no circular refs)
function bundle(originPointer, originSchema, pointerResolver) {

    if (!originPointer) {
        throw new Error('originPointer required');
    }
    if (!originSchema) {
        throw new Error('originSchema required');
    }
    if (!pointerResolver) {
        throw new Error('pointerResolver required');
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
                    var externalSchema = pointerResolver(pointer); // TODO promise + error handling
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
                if (schemaPart.hasOwnProperty(property)) {
                    if (typeof schemaPart[property] === 'object') {
                        recusiveBundle(localPointerId, schemaPart[property]);
                    }
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
                if (documentPart.hasOwnProperty(property)) {
                    if (typeof documentPart[property] === 'object') {
                        recusiveDeref(documentPart, property, documentPart[property]);
                    }
                }
            }
        }
    };
    recusiveDeref(null, null, bundleDocument[0]);
    return bundleDocument[0];
}

module.exports = {
    Pointer: Pointer,
    bundle: bundle,
    derefSchemaBundle: derefSchemaBundle,
};
