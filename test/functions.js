/* globals describe: false, it: false */
"use strict";

var F = require('../lib/functions'),
    assert = require("assert");

var testModule = describe, // magic mocha variables -- `describe` and `it`
    test = it,
    deepEqual = assert.deepEqual;

testModule('functions', function() {

    function triple(x) { return x * 3; }
    function plus4(y) { return y + 4; }

    test("compose: addThenTriple", function() {
        var addThenTriple = F.compose(triple, plus4);
        deepEqual(addThenTriple(8), 36);
        deepEqual(addThenTriple(19), 69);
    });
    
    test("compose: tripleThenAdd", function() {
        var tripleThenAdd = F.compose(plus4, triple);
        deepEqual(tripleThenAdd(8), 28);
        deepEqual(tripleThenAdd(19), 61);
    });
    
    test("getArgs", function() {
        function g() {
            return F.getArgs(arguments, 0);
        }
        function h() {
            return F.getArgs(arguments, 1);
        }
        deepEqual(g(0, 1, 2, 3), [0, 1, 2, 3]);
        deepEqual(g(), []);
        deepEqual(h(0, 1, 2, 3), [1, 2, 3]);
        deepEqual(h(), []);
    });
    
    test("first", function() {
        deepEqual(F.first(1, 2), 1);
        deepEqual(F.first(), undefined);
    });
    
    test("second", function() {
        deepEqual(F.second(1, 2), 2);
        deepEqual(F.second(), undefined);
    });
    
    test("buildSepByValue", function() {
        deepEqual(F.buildSepByValue('a', [['b', 'c'], ['d', 'e'], ['f', 'g']]),
                  {'values': ['a', 'c', 'e', 'g'], 'separators': ['b', 'd', 'f']});
    });
    
    test("pair", function() {
        deepEqual(F.pair(1, 2), [1, 2]);
        deepEqual(F.pair(1, 2, 3), [1, 2]);
        deepEqual(F.pair(), [undefined, undefined]);
    });
    
    test("buildSet", function() {
        deepEqual(F.buildSet("abc"), {'a': 1, 'b': 1, 'c': 1});
    });
    
    test("constF", function() {
        deepEqual(F.constF("abc")(), "abc");
        deepEqual(F.constF("abc")(1, 2, 3), "abc");
        deepEqual(F.constF()(1, 2, 3), undefined);
    });
    
    test("id", function() {
        deepEqual(F.id(123), 123);
        deepEqual(F.id(), undefined);
    });
    
    test("cons", function() {
        deepEqual(F.cons(3, ['a', 'b']), [3, 'a', 'b']);
        deepEqual(F.cons(4, []), [4]);
    });

});
