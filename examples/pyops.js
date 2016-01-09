"use strict";

var fs = require('fs'),
    util = require('util'),
    C = require('../lib/combinators'),
    O = require('../lib/operators');

var pre = O.prefix,
    post = O.postfix,
    left = O.chainL,
    right = O.chainR,
    oneOf = C.position.oneOf,
    tok = C.position.literal,
    str = C.position.string,
    ws = C.many0(tok(' '));

var num = C.app(function(a, b, c) {return b;},
                ws,
                oneOf('0123456789'),
                ws);
var letter = C.position.satisfy(function(c) {
        var code = c.charCodeAt();
        return (code >= 97 && code <= 122) || (code >= 65 && code <= 90);
    }),
    word = C.fmap(function(cs) {return cs.join('');}, C.many1(letter)),
    reserved = {'lambda': 1, 'if': 1, 'else': 1,
                'and': 1, 'or': 1, 'not': 1,
                'in': 1, 'is': 1},
    pyVar = C.check(function(w) {
        return !reserved.hasOwnProperty(w);
    }, word);

var expr = C.error('undefined');

var parens = C.seq(tok('('), expr, tok(')')),
    tuple = C.seq(tok('('), C.sepBy1(expr, tok(',')), C.optional(tok(',')), tok(')')),
    list = C.seq(tok('['), C.sepBy0(expr, tok(',')), tok(']')),
    pySet = C.seq(tok('{'), C.sepBy0(expr, tok(',')), tok('}')),
    map = pySet, // TODO kv-pairs
    atom = C.alt(parens, num, pyVar, tuple, list, map, pySet);
var prop = C.seq(tok('.'), atom),
    slot = C.seq(tok('['), expr, tok(']')),
    apply = C.seq(tok('('), C.sepBy0(expr, tok(',')), tok(')')),
    trailer = post(C.alt(prop, slot, apply), atom);
var exp = right(str('**'), trailer);
var signs = pre(oneOf('+-~'), exp);
var mult = left(C.alt(str('//'), oneOf('*/%')), signs);
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
var ifMiddle = C.seq(str("if"), expr, str("else")),
    ifElse = right(ifMiddle, or2); // TODO let's use ternaryR instead
var fnStart = C.seq(str("lambda"), ws, C.sepBy0(pyVar, tok(',')), tok(':')),//, ws, C.sepBy0(tok(','), pyVar), tok(":")),
    fn = pre(fnStart, ifElse);

expr.parse = C.seq2R(ws, fn).parse;

//var input = fs.readFileSync('/dev/stdin', {'encoding': 'utf8'}),
var input = process.argv[2] || '1or2and3',
    output = fn.parse(input, [1, 1]);

process.stdout.write(util.inspect(output, {'depth': null}) + "\n");
if (output.status === 'success') {
    process.stdout.write(O.dump(output.value.result) + "\n");
}

module.exports = {

};
