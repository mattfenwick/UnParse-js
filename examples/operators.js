"use strict";

var util = require('util'),
    C = require('../lib/combinators'),
    O = require('../lib/operators');

var mult = O.chainR2(C.app(function(o) {return function(l, r) {return ['(', l, ' ', o, ' ', r, ')'].join('');};},
                           C.position.oneOf('*/')),
                     C.position.oneOf('abcdefg')),
    add = O.chainR2(C.app(function(o) {return function(l, r) {return ['(', l, ' ', o, ' ', r, ')'].join('');};},
                          C.position.oneOf('+-')),
                    mult);

var m2 = O.chainL2(C.app(function(o) {return function(l, r) {return ['(', l, ' ', o, ' ', r, ')'].join('');};},
                         C.position.oneOf('*/')),
                   C.position.oneOf('abcdefg')),
	a2 = O.chainL2(C.app(function(o) {return function(l, r) {return ['(', l, ' ', o, ' ', r, ')'].join('');};},
                         C.position.oneOf('+-')),
                   m2);

function node(op) {
    return function(l, r) {
        return {'l': l, 'r': r, 'op': op};
    };
}

function dump(n) {
    if (!n.l || !n.r) { console.log('oops -- ' + JSON.stringify(n)); }
    var l = (typeof n.l === 'string') ? n.l : dump(n.l),
        r = (typeof n.r === 'string') ? n.r : dump(n.r);
    return ['(', l, ' ', n.op, ' ', r, ')'].join('');
}

var letter = C.position.satisfy(function(c) {return c >= 'a' && c <= 'z';}),
    word = C.fmap(function(x) {return x.join('');}, C.many1(letter)),
    a = O.chainL(C.app(node, C.position.string('**')), word),
    b = O.chainR2(C.app(node, C.position.literal('^')), a),
    c = O.chainL2(C.app(node, C.position.oneOf('+-')), b);

var q = c.parse('abc**def**ghi^jkl^mno+pqr+stu', [1,1]);
console.log(util.inspect(q, {'depth': null}));

var exp = O.chainL3(C.position.string('**'), word),
    caret = O.chainR3(C.position.literal('^'), exp),
    add = O.chainL3(C.position.oneOf('+-'), caret);

var parsed = add.parse('abc**def**ghi^jkl^mno+pqr+stu', [1, 1]);
//var parsed = exp.parse('abc**def**ghi', [1, 1]);
//var parsed = caret.parse('abc^def^ghi', [1, 1]);
//var parsed = exp.parse('abc**def**ghi', [1, 1]);
if (parsed.status === 'success') {
    console.log(util.inspect(parsed, {'depth': null}));
    console.log(O.dump(parsed.value.result));
} else {
    console.log(util.inspect(parsed, {'depth': null}));
}

module.exports = {
    'add': add,
    'mult': mult,
    'c': c,
    'eg1': add.parse('a+b*c*d/e+f-g', [1,1]),
    'eg2': a2.parse('a+b*c*d/e+f-g', [1,1]),
    'eg3': q,
    'eg3s': dump(q.value.result)
};
