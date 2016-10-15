'use strict';


function compose(f, g) {
    return (x) => f(g(x));
}

function first(x, _) {
    return x;
}

function second(_, y) {
    return y;
}

function pair(x, y) {
    return [x, y];
}

function constF(x) {
    return () => x;
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

function debugString(value) {
    if ( value === null ) {
        return "null";
    } else if ( typeof value === "function" ) {
        return "function";
    } else if ( value === undefined ) {
        return "undefined";
    } else {
        return value.toString();
    }
}

function dict(arr) {
    return arr.reduce((accum, [key, value]) => {
        accum[key] = value;
        return accum;
    }, {});
}

function updatePosition(char, position) {
    /*
    only treats `\n` as newline
    */
    const [line, col] = position;
    return (char === '\n') ? [line + 1, 1] : [line, col + 1];
}

function applyAll(x, fs) {
    return fs.reduce(flipApply, x);
}

function reverseApplyAll(fs, x) {
    return fs.reduceRight(flipApply, x);
}

module.exports = {
    'compose'        : compose        ,
    'first'          : first          ,
    'second'         : second         ,
    'pair'           : pair           ,
    'constF'         : constF         ,
    'id'             : id             ,
    'cons'           : cons           ,
    'replicate'      : replicate      ,
    'flipApply'      : flipApply      ,
    'debugString'    : debugString    ,
    'dict'           : dict           ,
    'updatePosition' : updatePosition ,
    'applyAll'       : applyAll       ,
    'reverseApplyAll': reverseApplyAll
};
