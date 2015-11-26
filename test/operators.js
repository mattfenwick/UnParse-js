"use strict";

var O = require('../lib/operators'),
    C = require('../lib/combinators'),
    M = require('../lib/maybeerror'),
    assert = require('assert');

var module = describe,
    test = it,
    deepEqual = assert.deepEqual;

module('operators', function() {
    var plus = C.seq2R(C.basic.literal('+'), C.pure(function(x,y) {return [x, y];})),
        bang = C.seq2R(C.basic.literal('!'), C.pure(function(x) {return '!(' + x + ')';})),
        question = C.seq2R(C.basic.literal('?'), C.pure(function q(y) {return '(' + y + ')?';})),
        num = C.fmap(parseFloat, C.basic.oneOf('0123456789'));
    
    test("chainR", function() {
        var p = C.basic.literal('+'),
            n = C.basic.oneOf('0123456789'),
            util = require('util');
        var parser = O.chainR(p, n),
            a = parser.parse('8+4+2+1abc', 'state'),
            v = a.value;
        deepEqual(a.status, 'success');
        deepEqual(v.rest, 'abc');
        deepEqual(v.state, 'state');
        deepEqual(O.dump(v.result), '(+ 8 (+ 4 (+ 2 1)))');
    });
    
    test("chainL", function() {
        var p = C.basic.literal('+'),
            n = C.basic.oneOf('0123456789'),
            util = require('util');
        var parser = O.chainL(p, n),
            a = parser.parse('8+4+2+1abc', 'state'),
            v = a.value;
        deepEqual(a.status, 'success');
        deepEqual(v.rest, 'abc');
        deepEqual(v.state, 'state');
        deepEqual(O.dump(v.result), '(+ (+ (+ 8 4) 2) 1)');
    });
    
    test("prefix", function() {
        var parser = O.prefix(C.basic.literal('!'), num),
            a = parser.parse('!!!8abc', 'state'),
            v = a.value;
        deepEqual(a.status, 'success');
        deepEqual(v.rest, 'abc');
        deepEqual(v.state, 'state');
        deepEqual(O.dump(v.result), '(! (! (! 8)))');
    });
    
    test("postfix", function() {
        var parser = O.postfix(C.basic.literal('?'), num),
            a = parser.parse('8???abc', 'state'),
            v = a.value;
        deepEqual(a.status, 'success');
        deepEqual(v.rest, 'abc');
        deepEqual(v.state, 'state');
        deepEqual(O.dump(v.result), '(((8 ?) ?) ?)');
    });

});
