'use strict';


function compose(f, g) {
    return function(x) { return f(g(x)); };
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

function constF(x) {
    return function() { return x; };
}

function id(x) {
    return x;
}

// probably not the optimal way to do this
function cons(first, rest) {
    var copy = rest.slice();
    copy.unshift(first);
    return copy;
}

function replicate(count, item) {
    var array = [];
    for (var i = 0; i < count; i++) {
        array.push(item);
    }
    return array;
}

function flipApply(x, f) {
    return f(x);
}

module.exports = {
    'compose'  : compose,
    'first'    : first,
    'second'   : second,
    'buildSepByValue': buildSepByValue,
    'pair'     : pair,
    'constF'   : constF,
    'id'       : id,
    'cons'     : cons,
    'replicate': replicate,
    'flipApply': flipApply
};
