'use strict';


function compose(f, g) {
    return function(x) { return f(g(x)); };
}

function getArgs(args, ix) {
    return Array.prototype.slice.call(args, ix);
}

function first(x, _) {
    return x;
}

function second(_, y) {
    return y;
}

function buildSepByValue(fst, pairs) {
    var vals = [fst],
        seps = [];
    pairs.forEach(function(p) {
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

function pair(x, y) {
    return [x, y];
}

function buildSet(elems) {
    var obj = {};
    for(var i = 0; i < elems.length; i++) {
        obj[elems[i]] = 1;
    }
    return obj;
}

function constF(x) {
    return function() { return x; }
}

function id(x) {
    return x;
}

module.exports = {
    'compose' : compose,
    'getArgs' : getArgs,
    'first'   : first,
    'second'  : second,
    'buildSepByValue': buildSepByValue,
    'pair'    : pair,
    'buildSet': buildSet,
    'constF'  : constF,
    'id'      : id
};
