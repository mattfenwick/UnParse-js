/* globals describe: false, it: false */
"use strict";

var Cst = require('../lib/cst'),
    C = require('../lib/combinators'),
    M = require('../lib/maybeerror'),
    assert = require("assert");

var testModule = describe,
    test = it,
    deepEqual = assert.deepEqual,
    good = C.good;

testModule('cst', function() {
    var cut = Cst.cut, addError = Cst.addError, node = Cst.node;
    var basic = C.basic, zero = C.zero, error = C.error, count = C.count;
    var err = M.error;
    
    function cstnode(name, start, end) {
        var pairs = Array.prototype.slice.call(arguments, 3),
            obj = {'_name': name, '_start': start, '_end': end};
        pairs.map(function(p) {
            obj[p[0]] = p[1];
        });
        return obj;
    }

    
    test("CutSuccess", function() {
        deepEqual(cut('oops', basic.item).parse('abc', null), good('a', 'bc', null));
    });
    
    test("CutFail", function() {
        deepEqual(cut('oops', zero).parse('abc', 12), err([['oops',12]]));
    });
    
    test("CutError", function() {
        deepEqual(cut('oops', error('err')).parse('abc', 12), err('err'));
    });
    
    test("AddErrorSuccess", function() {
        deepEqual(addError('oops', basic.item).parse('abc', null),
                         good('a', 'bc', null));
    });

    test("AddErrorFail", function() {
        deepEqual(addError('oops', zero).parse('abc', 12),
                         M.zero);
    });

    test("AddErrorError", function() {
        deepEqual(addError('oops', error(['err'])).parse('abc', 12),
                         err([['oops', 12], 'err']));
    });

    test("NodeSuccess", function() {
        deepEqual(node('blar').parse('abc', 17),
                         good(cstnode('blar', 17, 17), 'abc', 17));
        deepEqual(node('blar', ['a', count.item]).parse('def', 17),
                         good(cstnode('blar', 17, 18, ['a', 'd']), 'ef', 18));
        deepEqual(node('blar', ['a', count.item], ['b', count.item]).parse('def', 17),
                         good(cstnode('blar', 17, 19, ['a', 'd'], ['b', 'e']), 'f', 19));
    });
    
    test("NodeFailure", function() {
        deepEqual(node('blar', ['a', zero]).parse('abc', 17),
                         M.zero);
    });
    
    test("NodeError", function() {
        deepEqual(node('blar', ['a', cut('oops', zero)]).parse('abc', 17),
                         err([['blar', 17], ['oops', 17]]));
        deepEqual(node('blar', ['a', count.item], ['b', cut('oops', zero)]).parse('def', 17),
                         err([['blar', 17], ['oops', 18]]));
    });
});

