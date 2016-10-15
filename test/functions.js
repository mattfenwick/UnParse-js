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
    
    test("first", function() {
        deepEqual(F.first(1, 2), 1);
        deepEqual(F.first(), undefined);
    });
    
    test("second", function() {
        deepEqual(F.second(1, 2), 2);
        deepEqual(F.second(), undefined);
    });
    
    test("pair", function() {
        deepEqual(F.pair(1, 2), [1, 2]);
        deepEqual(F.pair(1, 2, 3), [1, 2]);
        deepEqual(F.pair(), [undefined, undefined]);
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
    
    test("replicate", function() {
        deepEqual(F.replicate(0, 4), []);
        deepEqual(F.replicate(3, 4), [4, 4, 4]);
    });
    
    test("flipApply", function() {
        deepEqual(F.flipApply(3, triple), 9);
    });
    
    test("debugString", function() {
        deepEqual(F.debugString(() => []), "function");
        deepEqual(F.debugString(null), "null");
        deepEqual(F.debugString(false), "false");
        deepEqual(F.debugString({}), "[object Object]");
        deepEqual(F.debugString(31), "31");
        deepEqual(F.debugString(undefined), "undefined");
    });
    
    test("dict", function() {
        deepEqual(F.dict([['b', 2], ['a', 1]]), {'a': 1, 'b': 2});
        deepEqual(F.dict([]), {});
    });
    
    test("updatePosition", function() {
        deepEqual(F.updatePosition('\n', [3, 8]), [4, 1]);
        deepEqual(F.updatePosition('\r', [3, 8]), [3, 9]);
        deepEqual(F.updatePosition('\f', [3, 8]), [3, 9]);
        deepEqual(F.updatePosition(' ', [3, 8]), [3, 9]);
        deepEqual(F.updatePosition('t', [3, 8]), [3, 9]);
    });
    
    test("applyAll", function() {
        deepEqual(F.applyAll(3, [(x) => x + 100, (y) => y * 100, (z) => z - 1]), 10299);
        deepEqual(F.applyAll("hi", []), "hi");
    });

    test("reverseApplyAll", function() {
        deepEqual(F.reverseApplyAll([(x) => x + 100, (y) => y * 100, (z) => z - 1], 3), 300);
        deepEqual(F.reverseApplyAll([], "hi"), "hi");
    });

});
