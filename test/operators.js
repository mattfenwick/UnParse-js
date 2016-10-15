/* globals describe: false, it: false */
"use strict";

var O = require('../lib/operators'),
    C = require('../lib/combinators'),
    assert = require('assert');

var testModule = describe,
    test = it,
    deepEqual = assert.deepEqual;

testModule('operators', function() {
    var num = C.fmap(parseFloat, C.basic.oneOf('0123456789'));
    
    test("constructR", function() {
        deepEqual(O.constructR('a', []), 'a');
        deepEqual(O.constructR('a', [['+', 'b']]), new O.BinaryNode('+', 'a', 'b'));
        deepEqual(O.constructR('a', [['+', 'b'], ['-', 'c']]),
            new O.BinaryNode('+', 'a', 
                new O.BinaryNode('-', 'b', 'c')));
        deepEqual(O.constructR('a', [['+', 'b'], ['-', 'c'], ['*', 'd']]),
            new O.BinaryNode('+', 'a',
                new O.BinaryNode('-', 'b',
                    new O.BinaryNode('*', 'c', 'd'))));
    });
    
    test("chainR", function() {
        var p = C.basic.oneOf('+*^'),
            n = C.basic.oneOf('0123456789');
        var parser = O.chainR(p, n),
            a = parser.parse('8+4*2^1abc', 'state'),
            v = a.value;
        deepEqual(a.status, 'success');
        deepEqual(v.rest, 'abc');
        deepEqual(v.state, 'state');
        deepEqual(O.dump(v.result), '(+ 8 (* 4 (^ 2 1)))');
    });
    
    test("constructL", function() {
        deepEqual(O.constructL('a', []), 'a');
        deepEqual(O.constructL('a', [['+', 'b']]), new O.BinaryNode('+', 'a', 'b'));
        deepEqual(O.constructL('a', [['+', 'b'], ['-', 'c']]),
            new O.BinaryNode('-', 
                new O.BinaryNode('+', 'a', 'b'), 'c'));
        deepEqual(O.constructL('a', [['+', 'b'], ['-', 'c'], ['*', 'd']]),
            new O.BinaryNode('*',
                new O.BinaryNode('-',
                    new O.BinaryNode('+', 'a', 'b'), 'c'), 'd'));
    });
    
    test("chainL", function() {
        var p = C.basic.oneOf('*+-'),
            n = C.basic.oneOf('0123456789');
        var parser = O.chainL(p, n),
            a = parser.parse('8*4-2+1abc', 'state'),
            v = a.value;
        deepEqual(a.status, 'success');
        deepEqual(v.rest, 'abc');
        deepEqual(v.state, 'state');
        deepEqual(O.dump(v.result), '(+ (- (* 8 4) 2) 1)');
    });
    
    test("constructPrefix", function() {
        deepEqual(O.constructPrefix([], 'a'), 'a');
        deepEqual(O.constructPrefix(['!'], 'a'), new O.PrefixNode('!', 'a'));
        deepEqual(O.constructPrefix(['!', '~'], 'a'), new O.PrefixNode('!', new O.PrefixNode('~', 'a')));
    });
    
    test("prefix", function() {
        var parser = O.prefix(C.basic.oneOf('!$'), num),
            a = parser.parse('$!!8abc', 'state'),
            v = a.value;
        deepEqual(a.status, 'success');
        deepEqual(v.rest, 'abc');
        deepEqual(v.state, 'state');
        deepEqual(O.dump(v.result), '($ (! (! 8)))');
    });
    
    test("constructPostfix", function() {
        deepEqual(O.constructPostfix('a', []), 'a');
        deepEqual(O.constructPostfix('a', ['?']), new O.PostfixNode('?', 'a'));
        deepEqual(O.constructPostfix('a', ['?', '%']), new O.PostfixNode('%', new O.PostfixNode('?', 'a')));
    });
    
    test("postfix", function() {
        var parser = O.postfix(C.basic.oneOf('?%'), num),
            a = parser.parse('8??%abc', 'state'),
            v = a.value;
        deepEqual(a.status, 'success');
        deepEqual(v.rest, 'abc');
        deepEqual(v.state, 'state');
        deepEqual(O.dump(v.result), '(((8 ?) ?) %)');
    });

});
