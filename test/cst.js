/* globals describe: false, it: false */
"use strict";

var Cst = require('../lib/cst'),
    C = require('../lib/combinators'),
    M = require('../lib/maybeerror'),
    H = require('./helper'),
    assert = require("assert");

var testModule = describe,
    test = it,
    deepEqual = assert.deepEqual,
    good = C.good;

testModule('cst', function() {
    var node = Cst.node;
    var count = C.count;
    
    function cstnode(name, start, end, ...pairs) {
        var obj = {'_name': name, '_start': start, '_end': end};
        pairs.forEach(([key, value]) => obj[key] = value);
        return obj;
    }

    test("NodeSuccess", function() {
        deepEqual(node('blar').parse('abc', 17),
                         good(cstnode('blar', 17, 17), 'abc', 17));
        deepEqual(node('blar', ['a', count.item]).parse('def', 17),
                         good(cstnode('blar', 17, 18, ['a', 'd']), 'ef', 18));
        deepEqual(node('blar', ['a', count.item], ['b', count.item]).parse('def', 17),
                         good(cstnode('blar', 17, 19, ['a', 'd'], ['b', 'e']), 'f', 19));
    });
    
    test("NodeFailure", function() {
        deepEqual(node('blar', ['a', C.zero]).parse('abc', 17),
                         M.zero);
    });
    
    test("NodeError", function() {
        deepEqual(node('blar', ['a', C.cut('oops', C.zero)]).parse('abc', 17),
                         M.error([['blar', 17], ['oops', 17]]));
        deepEqual(node('blar', ['a', count.item], ['b', C.cut('oops', C.zero)]).parse('def', 17),
                         M.error([['blar', 17], ['oops', 18]]));
    });
    
    test("duplicate node names are not allowed", function() {
        function test() {
            node('hi', ['a', C.zero], ['a', C.zero]);
        }
        H.assertThrow(test, function(e) {
            deepEqual(e.message, 'duplicate name -- a');
        });
    });
});

