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
        num = C.fmap(parseFloat, C.basic.oneOf('0123456789'));
    
    test("chainL", function() {
        var parser = O.chainL(plus, num),
            a = parser.parse('8+4+2+1abc', 'state'),
            v = a.value;
        deepEqual(a.status, 'success');
        deepEqual(v.rest, 'abc');
        deepEqual(v.state, 'state');
        deepEqual(v.result, [[[8,4],2],1]);
    });
    
    test("chainR", function() {
        var parser = O.chainR(plus, num),
            a = parser.parse('8+4+2+1abc', 'state'),
            v = a.value;
        deepEqual(a.status, 'success');
        deepEqual(v.rest, 'abc');
        deepEqual(v.state, 'state');
        deepEqual(v.result, [8,[4,[2,1]]]);
    });
    test("chainL2", function() {
        var parser = O.chainL2(plus, num),
            a = parser.parse('8+4+2+1abc', 'state'),
            v = a.value;
        deepEqual(a.status, 'success');
        deepEqual(v.rest, 'abc');
        deepEqual(v.state, 'state');
        deepEqual(v.result, [[[8,4],2],1]);
    });
    
    test("chainR2", function() {
        var parser = O.chainR2(plus, num),
            a = parser.parse('8+4+2+1abc', 'state'),
            v = a.value;
        deepEqual(a.status, 'success');
        deepEqual(v.rest, 'abc');
        deepEqual(v.state, 'state');
        deepEqual(v.result, [8,[4,[2,1]]]);
    });
    
});
