/* globals describe: false, it: false */
"use strict";

var C = require('../lib/combinators'),
    M = require('../lib/maybeerror'),
    H = require('./helper'),
    assert = require("assert"),
    good = C.good;

var testModule = describe, // magic mocha variables -- `describe` and `it`
    test = it,
    deepEqual = assert.deepEqual;

testModule('combinators', function() {

    var iz1 = C.basic,
        iz2 = C.position,
        iz3 = C.count;
        
    test("checkFunction", function() {
        H.assertNoThrow(() => C.checkFunction('test', () => []), () => []);
        H.assertThrow(() => C.checkFunction('test', 'abc'),
          (exc) => deepEqual(exc.message, '{"message":"type error","function":"test","expected":"function","actual":"abc"}'));
        H.assertThrow(() => C.checkFunction('test', null),
          (exc) => deepEqual(exc.message, '{"message":"type error","function":"test","expected":"function","actual":"null"}'));
    });
    
    test("checkParser", function() {
        H.assertNoThrow(() => C.checkParser('test', C.pure(4)), () => []);
        H.assertThrow(() => C.checkParser('test', 'abc'),
          (exc) => deepEqual(exc.message, '{"message":"type error","function":"test","expected":"Parser","actual":"abc"}'));
        H.assertThrow(() => C.checkParser('test', null),
          (exc) => deepEqual(exc.message, '{"message":"type error","function":"test","expected":"Parser","actual":"null"}'));
        H.assertThrow(() => C.checkParser('test', () => []),
          (exc) => deepEqual(exc.message, '{"message":"type error","function":"test","expected":"Parser","actual":"function"}'));
    });
    
    test("pure", function() {
        var val = C.pure(3).parse('abc', 2);
        deepEqual(val, good(3, 'abc', 2));
    });
    
    test("zero", function() {
        deepEqual(C.zero.parse(null, null), M.zero);
    });
    
    test("error", function() {
        var v1 = C.error('uh-oh').parse('abc', 123);
        deepEqual(v1, M.error('uh-oh'));
    });
    
    test("fmap", function() {
        function f(x) {return x + 7;}
        var v1 = C.fmap(f, C.pure(3)).parse('ab', 81),
            v2 = C.fmap(f, C.zero).parse('ab', 81),
            v3 = C.fmap(f, C.error('oops')).parse('ab', 81);
        deepEqual(v1, good(10, 'ab', 81));
        deepEqual(v2, M.zero);
        deepEqual(v3, M.error('oops'));
    });
    
    test("bind", function() {
        var two = C.bind(iz1.item, iz1.literal);
        deepEqual(two.parse('abcde', {}), M.zero);
        deepEqual(two.parse('aabcde', {}), good('a', 'bcde', {}));
    });
        
    test("check", function() {
        var val = C.check(function(x) {return x.length > 3;}, C.get);
        deepEqual(val.parse('abcde', []), good('abcde', 'abcde', []));
        deepEqual(val.parse('abc', []), M.zero);
        var error = C.check(function() {return true;}, C.error('oops'));
        deepEqual(error.parse('abc', []), M.error('oops'));
    });
    
    test("update", function() {
        var v1 = C.update(function(x) {return x + 'qrs';}).parse('abc', 18);
        // presents the updated "rest" as the value
        deepEqual(v1, good('abcqrs', 'abcqrs', 18));
    });
    
    test("get", function() {
        deepEqual(C.get.parse('abc', {}), good('abc', 'abc', {}));
    });
    
    test("put", function() {
        var val = C.put('xyz');
        deepEqual(val.parse('abc', []), good('xyz', 'xyz', []));
    });
    
    test("updateState", function() {
        var v1 = C.updateState(function(x) {return x * 4;}).parse('abc', 18);
        deepEqual(v1, good(72, 'abc', 72));
    });
    
    test("getState", function() {
        deepEqual(C.getState.parse('abc', 123), good(123, 'abc', 123));
    });

    test("putState", function() {
        var v1 = C.putState(29).parse('abc123', 2);
        deepEqual(v1, good(29, 'abc123', 29));
    });
    
    test("many0", function() {
        var val = C.many0(iz1.literal(3));
        deepEqual(val.parse([4,4,4], {}), good([], [4,4,4], {}));
        deepEqual(val.parse([3,3,4,5], {}), good([3,3], [4,5], {}));
    });
    
    test("many1", function() {
        var val = C.many1(iz1.literal(3));
        deepEqual(val.parse([4,4,4], {}), M.zero);
        deepEqual(val.parse([3,3,4,5], {}), good([3,3], [4,5], {}));
    });
    
    test("seq", function() {
        var val = C.seq([iz1.item, iz1.literal(2), iz1.literal(8)]);
        deepEqual(val.parse([3,2,4], {}), M.zero);
        deepEqual(val.parse([3,2,8,16], {}), good([3,2,8], [16], {}));
    });
    
    test("appP", function() {
        var parser = C.appP(C.pure(function(a,b,c) {return [a,b,c];}),
                            iz1.item,
                            iz1.satisfy(function(x) {return x > 2;}),
                            iz1.item);
        var v1 = parser.parse([1,2,3,4,5], 'hi'),
            v2 = parser.parse([5,6,7,8,9], 'bye'),
            v3 = parser.parse([5,6], 'goodbye');
        deepEqual(v1, M.zero);
        deepEqual(v2, good([5,6,7], [8,9], 'bye'));
        deepEqual(v3, M.zero);
    });
    
    test("appP -- type error", function() {
        H.assertThrow(() => C.appP(() => null, iz1.item), function(exception) {
            var obj = JSON.parse(exception.message);
            deepEqual(obj.message, 'type error');
            deepEqual(obj.function, 'appP');
            deepEqual(obj.expected, 'Parser');
        });
    });
    
    test("app", function() {
        var parser = C.app(function(x,y,z) {return x + y * z;},
                           iz1.item,
                           iz1.satisfy(function(x) {return x > 2;}),
                           iz1.item);
        var v1 = parser.parse([1,2,3,4,5], 'hi'),
            v2 = parser.parse([5,6,7,8,9], 'bye'),
            v3 = parser.parse([5,6], 'goodbye');
        deepEqual(v1, M.zero);
        deepEqual(v2, good(47, [8,9], 'bye'));
        deepEqual(v3, M.zero);
    });
    
    test("seq2R", function() {
        var val = C.seq2R(iz1.literal(2), iz1.literal(3));
        deepEqual(val.parse([4,5], {}), M.zero);
        deepEqual(val.parse([2,4,5], {}), M.zero);
        deepEqual(val.parse([2,3,4], {}), good(3, [4], {}));
    });
    
    test("seq2L", function() {
        var val = C.seq2L(iz1.literal(2), iz1.literal(3));
        deepEqual(val.parse([4,5], {}), M.zero);
        deepEqual(val.parse([2,4,5], {}), M.zero);
        deepEqual(val.parse([2,3,4], {}), good(2, [4], {}));
    });
    
    test("repeat: count == 0", function() {
        var val = C.repeat(0, iz1.literal(4));
        deepEqual(val.parse("0123", {}), good([], "0123", {}));
        deepEqual(val.parse("4012", {}), good([], "4012", {}));
    });
    
    test("repeat: count > 0", function() {
        var val = C.repeat(2, iz1.literal('4'));
        deepEqual(val.parse("012", {}), M.zero);
        deepEqual(val.parse("4012", {}), M.zero);
        deepEqual(val.parse("44012", {}), good(['4', '4'], "012", {}));
        deepEqual(val.parse("444012", {}), good(['4', '4'], "4012", {}));
    });
    
    test("lookahead", function() {
        var parser = C.lookahead(iz3.oneOf([2,3]));
        deepEqual(parser.parse([2,3,4,5], 41), good(2, [2,3,4,5], 41));
        deepEqual(parser.parse([3,4,5], 41), good(3, [3,4,5], 41));
        deepEqual(parser.parse([4,5], null), M.zero);
    });
    
    test("not0", function() {
        var val = C.not0(iz1.literal(2));
        deepEqual(val.parse([2,3,4], {}), M.zero);
        deepEqual(val.parse([3,4,5], {}), good(null, [3,4,5], {}));
    });
    
    test("alt: binary rules", function() {
        var g1 = C.pure(3),
            g2 = C.pure('hi'),
            b  = C.zero,
            e  = C.error('oops'),
            e2 = C.error('2nd'),
            r1 = good(3, 'abc', null),
            r3 = M.zero,
            r4 = M.error('oops');
        deepEqual(C.alt([g1, g2]).parse('abc', null), r1);
        deepEqual(C.alt([g1, b]).parse('abc', null), r1);
        deepEqual(C.alt([g1, e]).parse('abc', null), r1);
        deepEqual(C.alt([b, g1]).parse('abc', null), r1);
        deepEqual(C.alt([b, b]).parse('abc', null), r3);
        deepEqual(C.alt([b, e]).parse('abc', null), r4);
        deepEqual(C.alt([e, g1]).parse('abc', null), r4);
        deepEqual(C.alt([e, b]).parse('abc', null), r4);
        deepEqual(C.alt([e, e2]).parse('abc', null), r4);
    });
    
    test("alt: corner cases", function() {
        deepEqual(C.alt([]).parse([1,2,3], null),
                  M.zero);
        deepEqual(C.alt([C.pure('h')]).parse([1,2,3], null),
                  good('h', [1,2,3], null));
        deepEqual(C.alt([C.error('oops')]).parse([1,2,3], null),
                  M.error('oops'));
        deepEqual(C.alt([C.zero]).parse([1,2,3], null),
                  M.zero);
        var p1 = C.alt([C.zero, iz1.literal(1), iz1.literal(2), C.error('d')]);
        deepEqual(p1.parse([1,3,4], null), good(1, [3,4], null));
        deepEqual(p1.parse([2,3,4], null), good(2, [3,4], null));
        deepEqual(p1.parse([3,3,4], null), M.error('d'));
    });
    
    test("optional", function() {
        var parser = C.optional(iz1.literal(3), 'blargh'),
            v1 = parser.parse([1,2,3], 'hi'),
            v2 = parser.parse([3,2,1], 'bye');
        deepEqual(v1, good('blargh', [1,2,3], 'hi'));
        deepEqual(v2, good(3, [2,1], 'bye'));
    });
    
    test("optional -- no value", function() {
        var p = C.optional(iz1.literal(3)),
            v1 = p.parse([3,2,1], null),
            v2 = p.parse([1,2,3], null);
        deepEqual(v1, good(3, [2,1], null));
        deepEqual(v2, good(null, [1,2,3], null));
    });
    
    test("catchError", function() {
        function f1(e) {return C.pure(e);}
        function f2(_e) {return C.error('dead again');}
        // error -> good -- resumes parsing with tokens and state from before the error occurred
        deepEqual(C.catchError(C.error('dead 1'), f1).parse('123', [2, 4]),
                  good('dead 1', '123', [2,4]));
        // good -> good (unaffected by this combinator);
        deepEqual(C.catchError(C.pure(18), f1).parse('123', [2,4]),
                  good(18, '123', [2,4]));
        // error -> error
        deepEqual(C.catchError(C.error('dead 1'), f2).parse('123', [2,4]),
                  M.error('dead again'));
        // good -> error is not possible with this combinator
    });
        
    test("mapError", function() {
        function f(x) {return x.length;}
        var v1 = C.mapError(f, C.error('abcdef')).parse('123abc', null),
            v2 = C.mapError(f, C.zero).parse('123abc', null),
            v3 = C.mapError(f, C.pure(82)).parse('123abc', null);
        deepEqual(v1, M.error(6));
        deepEqual(v2, M.zero);
        deepEqual(v3, good(82, '123abc', null));
    });
    
    test("commit", function() {
        var val = C.commit('bag-agg', iz1.literal(2));
        deepEqual(val.parse([2,3,4], 'hi'), good(2, [3,4], 'hi'));
        deepEqual(val.parse([3,4,5], 'hi'), M.error('bag-agg'));
    });
    
    test("addError", function() {
        deepEqual(C.addError('oops', iz1.item).parse('abc', null),
                         good('a', 'bc', null));
        deepEqual(C.addError('oops', C.zero).parse('abc', 12),
                         M.zero);
        deepEqual(C.addError('oops', C.error(['err'])).parse('abc', 12),
                         M.error(['oops', 'err']));
    });
    
    test("sepBy0", function() {
        var parser = C.sepBy0(iz1.oneOf('pq'), iz1.oneOf('st')),
            val1 = parser.parse('abc', {}),
            val2 = parser.parse('ppabc', {}),
            val3 = parser.parse('psabc', {}),
            val4 = parser.parse('psqtqabc', {});
        deepEqual(val1, good(null, 'abc', {}));
        deepEqual(val2, good(['p', []], 'pabc', {}));
        deepEqual(val3, good(['p', []], 'sabc', {}));
        deepEqual(val4, good(['p', [['s', 'q'], ['t', 'q']]], 'abc', {}));
    });
    
    test("sepBy1", function() {
        var parser = C.sepBy1(iz1.oneOf('pq'), iz1.oneOf('st')),
            val1 = parser.parse('abc', {}),
            val2 = parser.parse('ppabc', {}),
            val3 = parser.parse('psabc', {}),
            val4 = parser.parse('psqtqabc', {});
        deepEqual(val1, M.zero);
        deepEqual(val2, good(['p', []], 'pabc', {}));
        deepEqual(val3, good(['p', []], 'sabc', {}));
        deepEqual(val4, good(['p', [['s', 'q'], ['t', 'q']]], 'abc', {}));
    });

    testModule("itemizer/basic", function() {
        test("item", function() {
            deepEqual(iz1.item.parse('', null), M.zero);
            deepEqual(iz1.item.parse('abcdef', null), good('a', 'bcdef', null));
        });
        
        test("literal", function() {
            var val = iz1.literal(3);
            deepEqual(val.parse([3,4,5], {}), good(3, [4,5], {}));
            deepEqual(val.parse([4,5], {}), M.zero);
        });
        
        test("satisfy", function() {
            var v1 = iz1.satisfy(function(x) {return x > 3;}).parse([1,2,3], 'bye'),
                v2 = iz1.satisfy(function(x) {return x < 3;}).parse([1,2,3], 'hi');
            deepEqual(v1, M.zero);
            deepEqual(v2, good(1, [2,3], 'hi'));
        });
        
        test("string -- accepts JS Strings", function() {
            var parser = iz1.string('abc'),
                v1 = parser.parse('abcdef', null),
                v2 = parser.parse('abdef', null);
            deepEqual(v1, good('abc', 'def', null));
            deepEqual(v2, M.zero);
        });
        
        test("string -- accepts arrays", function() {
            var parser = iz1.string([1,2,3]);
            deepEqual(parser.parse([1,2,3,4,5], null), good([1,2,3], [4,5], null));
            deepEqual(parser.parse([1,2,4,5], null), M.zero);
        });
        
        test("not1", function() {
            var val = iz1.not1(iz1.literal(2));
            deepEqual(val.parse([2,3,4], {}), M.zero);
            deepEqual(val.parse([3,4,5], {}), good(3, [4,5], {}));
        });
        
        test("oneOf", function() {
            var p = iz1.oneOf('abc');
            deepEqual(p.parse('cqrs', null), good('c', 'qrs', null));
            deepEqual(p.parse('aqrs', null), good('a', 'qrs', null));
            deepEqual(p.parse('dqrs', null), M.zero);
        });
    });
    
    testModule("itemizer/position", function() {
        test("item", function() {
            deepEqual(iz2.item.parse('', [1, 1]), M.zero);
            deepEqual(iz2.item.parse('abcdef', [1, 1]), good('a', 'bcdef', [1, 2]));
            deepEqual(iz2.item.parse('\nbcdef', [1, 1]), good('\n', 'bcdef', [2, 1]));
        });

        test("literal", function() {
            var val = iz2.literal('3');
            deepEqual(val.parse('345', [3, 8]), good('3', '45', [3, 9]));
            deepEqual(val.parse('45', [3, 8]), M.zero);
        });
        
        test("satisfy", function() {
            var v1 = iz2.satisfy(function(x) {return x > '3';}).parse('123', [2, 2]),
                v2 = iz2.satisfy(function(x) {return x < '3';}).parse('123', [2, 2]);
            deepEqual(v1, M.zero);
            deepEqual(v2, good('1', '23', [2, 3]));
        });
        
        test("string", function() {
            var parser = iz2.string('abc'),
                v1 = parser.parse('abcdef', [4, 3]),
                v2 = parser.parse('abdef', [4, 3]);
            deepEqual(v1, good('abc', 'def', [4, 6]));
            deepEqual(v2, M.zero);
        });
        
        test("not1", function() {
            var val = iz2.not1(iz2.literal('2'));
            deepEqual(val.parse('234', [1, 1]), M.zero);
            deepEqual(val.parse('345', [1, 1]), good('3', '45', [1, 2]));
        });
        
        test("oneOf", function() {
            var p = iz2.oneOf('abc');
            deepEqual(p.parse('cqrs', [3,4]), good('c', 'qrs', [3,5]));
            deepEqual(p.parse('aqrs', [8,1]), good('a', 'qrs', [8,2]));
            deepEqual(p.parse('dqrs', [2,2]), M.zero);
        });
    });
    
    testModule("itemizer/count", function() {
        test("item", function() {
            deepEqual(iz3.item.parse('', 8), M.zero);
            deepEqual(iz3.item.parse('abcdef', 5), good('a', 'bcdef', 6));
            deepEqual(iz3.item.parse('\nbcdef', 100), good('\n', 'bcdef', 101));
        });

        test("literal", function() {
            var val = iz3.literal('3');
            deepEqual(val.parse('345', 8), good('3', '45', 9));
            deepEqual(val.parse('45', 8), M.zero);
        });
        
        test("satisfy", function() {
            var v1 = iz3.satisfy(function(x) {return x > '3';}).parse('123', 22),
                v2 = iz3.satisfy(function(x) {return x < '3';}).parse('123', 22);
            deepEqual(v1, M.zero);
            deepEqual(v2, good('1', '23', 23));
        });
        
        test("string", function() {
            var parser = iz3.string('abc'),
                v1 = parser.parse('abcdef', 43),
                v2 = parser.parse('abdef', 43);
            deepEqual(v1, good('abc', 'def', 46));
            deepEqual(v2, M.zero);
        });
        
        test("not1", function() {
            var val = iz3.not1(iz3.literal('2'));
            deepEqual(val.parse('234', 61), M.zero);
            deepEqual(val.parse('345', 61), good('3', '45', 62));
        });
        
        test("oneOf", function() {
            var p = iz3.oneOf('abc');
            deepEqual(p.parse('cqrs', 4), good('c', 'qrs', 5));
            deepEqual(p.parse('aqrs', 8), good('a', 'qrs', 9));
            deepEqual(p.parse('dqrs', 7), M.zero);
        });
    });
    
    test("when using function where Parser is expected, the 'actual' key appears in error message", function() {
        var p = iz1.literal(2);
        H.assertThrow(() => C.seq([() => null, p]), function(exception) {
            deepEqual(JSON.parse(exception.message).actual, 'function');
        });
    });
    
    test("when using non-function where Parser is expected, the 'actual' key appears in error message", function() {
        H.assertThrow(() => C.seq([3]), function(exception) {
            deepEqual(JSON.parse(exception.message).actual, '3');
        });
    });

});

