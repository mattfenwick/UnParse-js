"use strict";

var C = require('./combinators.js');


var bind   = C.bind  ,  getState = C.getState,
    commit = C.commit,  mapError = C.mapError,
    app    = C.app   ,  many0    = C.many0   ,
    seq    = C.seq   ,  optional = C.optional,
    fmap     = C.fmap;

function cut(message, parser) {
    /*
    assumes errors are lists
    */
    function f(p) {
        return commit([[message, p]], parser);
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
    assumes errors are lists, and
    that the state is desired
    */
    function f(pos) {
        return mapError(function(es) {return _cons([e, pos], es);}, parser);
    }
    return bind(getState, f);
}


function _has_duplicates(arr) {
    var keys = {};
    for(var i = 0; i < arr.length; i++) {
        if ( arr[i] in keys ) {
            return true;
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
    arr.map(function(p) {
        obj[p[0]] = p[1];
    });
    return obj;
}

function node(name) {
    /*
    1. runs parsers in sequence
    2. collects results into a dictionary
    3. grabs state at which parsers started
    4. adds an error frame
    */
    var pairs = Array.prototype.slice.call(arguments, 1),
        names = pairs.map(function(x) {return x[0];}),
        name_set = _set(names);
    if ( _has_duplicates(names) ) {
        throw new Error('duplicate names');
    } else if ( '_name' in name_set ) {
        throw new Error('forbidden key: "_name"');
    } else if ( '_state' in name_set ) {
        throw new Error('forbidden key: "_state"');
    }
    function action(state, results) {
        var out = _dict(results);
        out._state = state;
        out._name = name;
        return out;
    }
    function closure_workaround(s) { // captures s
        return function(y) {return [s, y];};
    }
    function f(pair) {
        var s = pair[0],
            p = pair[1];
        return fmap(closure_workaround(s), p);
    }
    return addError(name,
                    app(action,
                          getState,
                          seq.apply(undefined, pairs.map(f))));
}

function _sep_action(fst, pairs) {
    var vals = [fst],
        seps = [];
    pairs.map(function(p) {
        var sep = p[0],
            val = p[1];
        vals.push(val);
        seps.push(sep);
    });
    return {
        'values': vals,
        'separators': seps
    };
}

function _pair(x, y) {
    return [x, y];
}

function sepBy1(parser, separator) {
    return app(_sep_action,
               parser,
               many0(app(_pair, separator, parser)));
}

function sepBy0(parser, separator) {
    return optional(sepBy1(parser, separator), {'values': [], 'separators': []});
}

module.exports = {
    'node'    :  node,
    'addError':  addError,
    'cut'     :  cut,
    'sepBy0'  :  sepBy0
};

