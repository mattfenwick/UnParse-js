define([
    "unparse-js/combinators", 
    "unparse-js/maybeerror"
], function (C, MaybeError) {
    "use strict";

    return function() {
    
        module("combinators");
    
        var M = MaybeError,
            iz1 = C.basic,
            iz2 = C.position,
            iz3 = C.count;

        function good(rest, state, result) {
            return M.pure({'rest': rest, 'state': state, 'result': result});
        }


        module("combinators -- basic tokens"); 

        test("item", function() {
            deepEqual(iz1.item.parse('', null), M.zero);
            deepEqual(iz1.item.parse('abcdef', null), good('bcdef', null, 'a'));
        });
        
        test("literal", function() {
            var val = iz1.literal(3);
            deepEqual(val.parse([3,4,5], {}), good([4,5], {}, 3));
            deepEqual(val.parse([4,5], {}), M.zero);
        });
        
        test("satisfy", function() {
            var v1 = iz1.satisfy(function(x) {return x > 3;}).parse([1,2,3], 'bye'),
                v2 = iz1.satisfy(function(x) {return x < 3;}).parse([1,2,3], 'hi');
            deepEqual(v1, M.zero);
            deepEqual(v2, good([2,3], 'hi', 1));
        });
        
        test("string", function() {
            var parser = iz1.string('abc'),
                v1 = parser.parse('abcdef', null),
                v2 = parser.parse('abdef', null);
            deepEqual(v1, good('def', null, 'abc'));
            deepEqual(v2, M.zero);
        });
        
        test("not1", function() {
            var val = iz1.not1(iz1.literal(2));
            deepEqual(val.parse([2,3,4], {}), M.zero);
            deepEqual(val.parse([3,4,5], {}), good([4,5], {}, 3));
        });
        
        test("oneOf", function() {
            var p = iz1.oneOf('abc');
            deepEqual(p.parse('cqrs', null), good('qrs', null, 'c'));
            deepEqual(p.parse('aqrs', null), good('qrs', null, 'a'));
            deepEqual(p.parse('dqrs', null), M.zero);
        });
        
        
        module("combinators -- position tokens");
        
        test("ItemPosition", function() {
            deepEqual(iz2.item.parse('', [1, 1]), M.zero);
            deepEqual(iz2.item.parse('abcdef', [1, 1]), good('bcdef', [1, 2], 'a'));
            deepEqual(iz2.item.parse('\nbcdef', [1, 1]), good('bcdef', [2, 1], '\n'));
        });
    
        test("Literal", function() {
            var val = iz2.literal('3');
            deepEqual(val.parse('345', [3, 8]), good('45', [3, 9], '3'));
            deepEqual(val.parse('45', [3, 8]), M.zero);
        });
        
        test("Satisfy", function() {
            var v1 = iz2.satisfy(function(x) {return x > '3';}).parse('123', [2, 2]),
                v2 = iz2.satisfy(function(x) {return x < '3';}).parse('123', [2, 2]);
            deepEqual(v1, M.zero);
            deepEqual(v2, good('23', [2, 3], '1'));
        });
        
        test("String", function() {
            var parser = iz2.string('abc'),
                v1 = parser.parse('abcdef', [4, 3]),
                v2 = parser.parse('abdef', [4, 3]);
            deepEqual(v1, good('def', [4, 6], 'abc'));
            deepEqual(v2, M.zero);
        });
        
        test("Not1", function() {
            var val = iz2.not1(iz2.literal('2'));
            deepEqual(val.parse('234', [1, 1]), M.zero);
            deepEqual(val.parse('345', [1, 1]), good('45', [1, 2], '3'));
        });
        
        test("oneOf", function() {
            var p = iz2.oneOf('abc');
            deepEqual(p.parse('cqrs', [3,4]), good('qrs', [3,5], 'c'));
            deepEqual(p.parse('aqrs', [8,1]), good('qrs', [8,2], 'a'));
            deepEqual(p.parse('dqrs', [2,2]), M.zero);
        });

        
        module("combinators -- count tokens");
        
        test("ItemPosition", function() {
            deepEqual(iz3.item.parse('', 8), M.zero);
            deepEqual(iz3.item.parse('abcdef', 5), good('bcdef', 6, 'a'));
            deepEqual(iz3.item.parse('\nbcdef', 100), good('bcdef', 101, '\n'));
        });

        test("Literal", function() {
            var val = iz3.literal('3');
            deepEqual(val.parse('345', 8), good('45', 9, '3'));
            deepEqual(val.parse('45', 8), M.zero);
        });
        
        test("Satisfy", function() {
            var v1 = iz3.satisfy(function(x) {return x > '3';}).parse('123', 22),
                v2 = iz3.satisfy(function(x) {return x < '3';}).parse('123', 22);
            deepEqual(v1, M.zero);
            deepEqual(v2, good('23', 23, '1'));
        });
        
        test("String", function() {
            var parser = iz3.string('abc'),
                v1 = parser.parse('abcdef', 43),
                v2 = parser.parse('abdef', 43);
            deepEqual(v1, good('def', 46, 'abc'));
            deepEqual(v2, M.zero);
        });
        
        test("Not1", function() {
            var val = iz3.not1(iz3.literal('2'));
            deepEqual(val.parse('234', 61), M.zero);
            deepEqual(val.parse('345', 61), good('45', 62, '3'));
        });
        
        test("oneOf", function() {
            var p = iz3.oneOf('abc');
            deepEqual(p.parse('cqrs', 4), good('qrs', 5, 'c'));
            deepEqual(p.parse('aqrs', 8), good('qrs', 9, 'a'));
            deepEqual(p.parse('dqrs', 7), M.zero);
        });
        
        
        module("combinators -- parser");
        
        test("fmap", function() {
            function f(x) {return x + 7;}
            var v1 = C.fmap(f, C.pure(3)).parse('ab', 81),
                v2 = C.fmap(f, C.zero).parse('ab', 81),
                v3 = C.fmap(f, C.error('oops')).parse('ab', 81);
            deepEqual(v1, good('ab', 81, 10));
            deepEqual(v2, M.zero);
            deepEqual(v3, M.error('oops'));
        });
        
        test("pure", function() {
            var val = C.pure(3).parse('abc', 2);
            deepEqual(val, good('abc', 2, 3));
        });
        
        test("bind", function() {
            var two = C.bind(iz1.item, iz1.literal);
            deepEqual(two.parse('abcde', {}), M.zero);
            deepEqual(two.parse('aabcde', {}), good('bcde', {}, 'a'));
        });
        
        test("AltBinaryRules", function() {
            var g1 = C.pure(3),
                g2 = C.pure('hi'),
                b  = C.zero,
                e  = C.error('oops'),
                e2 = C.error('2nd'),
                r1 = good('abc', null, 3),
                r3 = M.zero,
                r4 = M.error('oops');
            deepEqual(C.alt(g1, g2).parse('abc', null), r1);
            deepEqual(C.alt(g1, b).parse('abc', null), r1);
            deepEqual(C.alt(g1, e).parse('abc', null), r1);
            deepEqual(C.alt(b, g1).parse('abc', null), r1);
            deepEqual(C.alt(b, b).parse('abc', null), r3);
            deepEqual(C.alt(b, e).parse('abc', null), r4);
            deepEqual(C.alt(e, g1).parse('abc', null), r4);
            deepEqual(C.alt(e, b).parse('abc', null), r4);
            deepEqual(C.alt(e, e2).parse('abc', null), r4);
        });
        
        test("AltCornerCases", function() {
            deepEqual(C.alt().parse([1,2,3], null),
                      M.zero);
            deepEqual(C.alt(C.pure('h')).parse([1,2,3], null),
                      good([1,2,3], null, 'h'));
            deepEqual(C.alt(C.error('oops')).parse([1,2,3], null),
                      M.error('oops'));
            deepEqual(C.alt(C.zero).parse([1,2,3], null),
                      M.zero);
            var p1 = C.alt(C.zero, iz1.literal(1), iz1.literal(2), C.error('d'));
            deepEqual(p1.parse([1,3,4], null), good([3,4], null, 1));
            deepEqual(p1.parse([2,3,4], null), good([3,4], null, 2));
            deepEqual(p1.parse([3,3,4], null), M.error('d'));
        });
        
        test("Error", function() {
            var v1 = C.error('uh-oh').parse('abc', 123);
            deepEqual(v1, M.error('uh-oh'));
        });
        
        test("CatchError", function() {
            function f1(e) {return C.pure(3);}
            function f2(e) {return C.error('dead again');}
            // error -> good -- resumes parsing with tokens and state from before the error occurred
            deepEqual(C.catchError(f1, C.error('dead 1')).parse('123', [2, 4]),
                      good('123', [2,4], 3));
            // good -> good (unaffected by this combinator);
            deepEqual(C.catchError(f1, C.pure(18)).parse('123', [2,4]),
                      good('123', [2,4], 18));
            // error -> error
            deepEqual(C.catchError(f2, C.error('dead 1')).parse('123', [2,4]),
                      M.error('dead again'));
            // good -> error is not possible with this combinator
        });
            
        test("MapError", function() {
            function f(x) {return x.length;}
            var v1 = C.mapError(f, C.error('abcdef')).parse('123abc', null),
                v2 = C.mapError(f, C.zero).parse('123abc', null),
                v3 = C.mapError(f, C.pure(82)).parse('123abc', null);
            deepEqual(v1, M.error(6));
            deepEqual(v2, M.zero);
            deepEqual(v3, good('123abc', null, 82))        
        });
    
        test("Put", function() {
            var val = C.put('xyz');
            deepEqual(val.parse('abc', []), good('xyz', [], null));
        });
        
        test("PutState", function() {
            var v1 = C.putState(29).parse('abc123', 2);
            deepEqual(v1, good('abc123', 29, null));
        });
        
        test("UpdateState", function() {
            var v1 = C.updateState(function(x) {return x * 4;}).parse('abc', 18);
            deepEqual(v1, good('abc', 72, null));
        });
            
        test("Check", function() {
            var val = C.check(function(x) {return x.length > 3;}, C.get);
            deepEqual(val.parse('abcde', []), good('abcde', [], 'abcde'));
            deepEqual(val.parse('abc', []), M.zero);
        });
        
        test("Many0", function() {
            var val = C.many0(iz1.literal(3));
            deepEqual(val.parse([4,4,4], {}), good([4,4,4], {}, []));
            deepEqual(val.parse([3,3,4,5], {}), good([4,5], {}, [3,3]));
        });
        
        test("Many1", function() {
            var val = C.many1(iz1.literal(3));
            deepEqual(val.parse([4,4,4], {}), M.zero);
            deepEqual(val.parse([3,3,4,5], {}), good([4,5], {}, [3,3]));
        });
        
        test("Seq", function() {
            var val = C.seq(iz1.item, iz1.literal(2), iz1.literal(8));
            deepEqual(val.parse([3,2,4], {}), M.zero);
            deepEqual(val.parse([3,2,8,16], {}), good([16], {}, [3,2,8]));
        });
        
        test("App", function() {
            var parser = C.app(function(x,y,z) {return x + y * z;}, 
                               iz1.item, 
                               iz1.satisfy(function(x) {return x > 2;}), 
                               iz1.item);
            var v1 = parser.parse([1,2,3,4,5], 'hi'),
                v2 = parser.parse([5,6,7,8,9], 'bye'),
                v3 = parser.parse([5,6], 'goodbye');
            deepEqual(v1, M.zero);
            deepEqual(v2, good([8,9], 'bye', 47));
            deepEqual(v3, M.zero);
        });
        
        test("Optional", function() {
            var parser = C.optional(iz1.literal(3), 'blargh'),
                v1 = parser.parse([1,2,3], 'hi'),
                v2 = parser.parse([3,2,1], 'bye');
            deepEqual(v1, good([1,2,3], 'hi', 'blargh'));
            deepEqual(v2, good([2,1], 'bye', 3));
        });
        
        test("optional -- no value", function() {
            var p = C.optional(iz1.literal(3)),
                v1 = p.parse([3,2,1], null),
                v2 = p.parse([1,2,3], null);
            deepEqual(v1, good([2,1], null, 3));
            deepEqual(v2, good([1,2,3], null, null));
        });
        
        test("Seq2R", function() {
            var val = C.seq2R(iz1.literal(2), iz1.literal(3));
            deepEqual(val.parse([4,5], {}), M.zero);
            deepEqual(val.parse([2,4,5], {}), M.zero);
            deepEqual(val.parse([2,3,4], {}), good([4], {}, 3));
        });
        
        test("Seq2L", function() {
            var val = C.seq2L(iz1.literal(2), iz1.literal(3));
            deepEqual(val.parse([4,5], {}), M.zero);
            deepEqual(val.parse([2,4,5], {}), M.zero);
            deepEqual(val.parse([2,3,4], {}), good([4], {}, 2));
        });
        
        test("Lookahead", function() {
            var parser = C.seq2L(iz1.literal(2), C.lookahead(iz1.literal(3)));
            deepEqual(parser.parse([2,3,4,5], null), good([3,4,5], null, 2));
            deepEqual(parser.parse([2,4,5], null), M.zero);
            deepEqual(parser.parse([3,4,5], null), M.zero);
        });
        
        test("Not0", function() {
            var val = C.not0(iz1.literal(2));
            deepEqual(val.parse([2,3,4], {}), M.zero);
            deepEqual(val.parse([3,4,5], {}), good([3,4,5], {}, null));
        });
        
        test("Commit", function() {
            var val = C.commit('bag-agg', iz1.literal(2));
            deepEqual(val.parse([2,3,4], 'hi'), good([3,4], 'hi', 2));
            deepEqual(val.parse([3,4,5], 'hi'), M.error('bag-agg'));
        });
        
        test("Zero", function() {
            deepEqual(C.zero.parse(null, null), M.zero);
        });
        
        test("Get", function() {
            deepEqual(C.get.parse('abc', {}), good('abc', {}, 'abc'));
        });
        
        test("GetState", function() {
            deepEqual(C.getState.parse('abc', 123), good('abc', 123, 123));
        });

    };

});
