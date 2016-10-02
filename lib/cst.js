"use strict";

var C = require('./combinators.js');
var F = require('./functions.js');

var app  = C.app, addError = C.addError,
    seq  = C.seq, getState = C.getState,
    fmap = C.fmap;

function _forbid_duplicates(arr) {
    var keySet = new Set();
    arr.forEach(function(key) {
        if ( keySet.has(key) ) {
            throw new Error('duplicate name -- ' + key);
        }
        keySet.add(key);
    });
}

function _dict(arr) {
    var obj = {};
    arr.forEach(function(p) {
        obj[p[0]] = p[1];
    });
    return obj;
}

function _forbid_keys(forbidden, keys) {
    var keySet = new Set(keys);
    forbidden.forEach(function(key) {
        if ( keySet.has(key) ) {
            throw new Error('cst node: forbidden key: ' + key);
        }
    });
}

function node(name /* _pairs_: 0+ 2-element arrays */) {
    /*
    1. runs parsers in sequence
    2. collects results into a dictionary
    3. grabs state at which parsers started
    4. adds an error frame
    */
    var pairs = Array.prototype.slice.call(arguments, 1),
        names = pairs.map(function(x) {return x[0];});
    _forbid_duplicates(names);
    _forbid_keys(['_name', '_start', '_end'], names);
    function action(start, results, end) {
        var out = _dict(results);
        out._start = start;
        out._name = name;
        out._end = end;
        return out;
    }
    function f(pair) {
        var s = pair[0],
            p = pair[1];
        return fmap(function(y) { return [s, y]; }, p);
    }
    return addError(name,
                    app(action,
                          getState,
                          seq(pairs.map(f)),
                          getState));
}

module.exports = {
    'node'    :  node,
};

