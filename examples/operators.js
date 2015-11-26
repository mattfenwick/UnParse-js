"use strict";

var util = require('util'),
    C = require('../lib/combinators'),
    O = require('../lib/operators');

var letter = C.position.satisfy(function(c) {return c >= 'a' && c <= 'z';}),
    word = C.fmap(function(x) {return x.join('');}, C.many1(letter)),
    exp = O.chainL(C.position.string('**'), word),
    caret = O.chainR(C.position.literal('^'), exp),
    bang = O.prefix(C.position.oneOf('!~'), caret),
    add = O.chainL(C.position.oneOf('+-'), bang),
    at = O.prefix(C.position.literal('@'), add);

var parsed = at.parse('@abc**def**ghi^jkl^mno+~pqr+stu', [1, 1]);
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

};
