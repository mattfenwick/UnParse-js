'use strict';

function compose(f, g) {
    return function(x) { return f(g(x)); };
}

function id(x) {
    return x;
}

function constF(x) {
    return function() { return x; };
}

function fmapObject(obj, key, f) {
    if ( !obj.hasOwnProperty(key) ) {
        throw new Error('object does not have key ' + key);
    }
    var out = {};
    Object.getOwnPropertyNames(obj).forEach(function(name) {
        if ( name === key ) {
            out[name] = f(obj[name]);
        } else {
            out[name] = obj[name];
        }
    });
    return out;
}

function first(x, _) {
    return x;
}

function second(_, y) {
    return y;
}

function getArgs(args, ix) {
    return Array.prototype.slice.call(args, ix);
}

function pair(x, y) {
    return [x, y];
}

function inc(x) {
    return x + 1;
}

module.exports = {
    'compose'   : compose,
    'id'        : id,
    'constF'    : constF,
    'fmapObject': fmapObject,
    'first'     : first,
    'second'    : second,
    'getArgs'   : getArgs,
    'pair'      : pair,
    'inc'       : inc
};
