"use strict";

var C = require('./combinators.js');


var bind   = C.bind  ,  getState = C.getState,
    commit = C.commit,  mapError = C.mapError,
    app    = C.app   ,  seq      = C.seq     ,
    fmap   = C.fmap;

function cut(message, parser) {
    /*
    e -> Parser [(e, s)] s (m t) a -> Parser [(e, s)] s (m t) a
    */
    function f(state) {
        return commit([[message, state]], parser);
    }
    return bind(getState, f);
}

// probably not the optimal way to do this
function _cons(first, rest) {
    var copy = rest.slice();
    copy.unshift(first);
    return copy;
}

function addError(e, parser) {
    /*
    e -> Parser [(e, s)] s (m t) a -> Parser [(e, s)] s (m t) a
    */
    function f(state) {
        return mapError(function(es) {return _cons([e, state], es);}, parser);
    }
    return bind(getState, f);
}


function _forbid_duplicates(arr) {
    var keys = {};
    for(var i = 0; i < arr.length; i++) {
        if ( arr[i] in keys ) {
            throw new Error('duplicate name -- ' + arr[i]);
        }
        keys[arr[i]] = 1;
    }
    return false;
}

function _set(arr) {
    var keys = {};
    for(var i = 0; i < arr.length; i++) {
        keys[arr[i]] = 1;
    }
    return keys;
}

function _dict(arr) {
    var obj = {};
    arr.forEach(function(p) {
        obj[p[0]] = p[1];
    });
    return obj;
}

function _forbid_keys(forbidden, keys) {
    var key_set = _set(keys);
    forbidden.forEach(function(key) {
        if ( key in key_set ) {
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
    'addError':  addError,
    'cut'     :  cut,
};

