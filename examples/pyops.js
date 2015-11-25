"use strict";

var fs = require('fs'),
    util = require('util'),
    C = require('../lib/combinators'),
    O = require('../lib/operators');

var pre = O.prefix3,
    post = O.postfix3,
    left = O.chainL3,
    right = O.chainR3,
    oneOf = C.position.oneOf,
    tok = C.position.literal,
    str = C.position.string;

var num = oneOf('0123456789');

var exp = right(str('**'), num);
var signs = pre(oneOf('+-~'), exp);
var mult = left(oneOf('*/%'), signs); // TODO also '//'
var add = left(oneOf('+-'), mult);
var shift = left(C.alt.apply(null, [">>", "<<"].map(str)), add);
var and = left(tok('&'), shift);
var xor = left(tok('^'), and);
var or = left(tok('|'), xor);
var comparisons = ["in", "not in", "is", "is not", "<", ">", "<=", ">=", "!=", "=="],
    comp = left(C.alt.apply(null, comparisons.map(str)), or);
var not = pre(str('not'), comp);
var and2 = left(str('and'), not);
var or2 = left(str('or'), and2);
var ifElse = or2; // TODO
var fn = ifElse; // TODO

//var input = fs.readFileSync('/dev/stdin', {'encoding': 'utf8'}),
var input = process.argv[2],
    output = fn.parse(input, [1, 1]);

process.stdout.write(util.inspect(output, {'depth': null}) + "\n");
if (output.status === 'success') {
    process.stdout.write(O.dump(output.value.result) + "\n");
}

module.exports = {

};
