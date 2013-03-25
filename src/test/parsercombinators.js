define(["app/parser", "app/maybeerror"], function (Parser, MaybeError) {

    return function() {
    
        module("parser combinators");
    
        var item     =  Parser.item,
            sat      =  Parser.satisfy,
            literal  =  Parser.literal,
            zero     =  MaybeError.zero,
            error    =  MaybeError.error,
            pure     =  MaybeError.pure,
            all      =  Parser.all,
            string   =  Parser.string,
            any      =  Parser.any,
            err      =  Parser.error;
    
        function myPure(value, rest, state) {
            return Parser.pure(value).parse(rest, state);
        }

        test("item", function() {
            deepEqual(myPure('a', 'bdc', 32), item.parse('abdc', 32));
            deepEqual(zero, item.parse("", null));
            deepEqual(myPure(1, [2,3,4], null), item.parse([1,2,3,4], null));
        });
        
        test("fmap", function() {
            var fmapEx = literal(3).fmap(function(x) {return x + 15;});
            deepEqual(myPure(18, [4,5], "q"), fmapEx.parse([3,4,5], 'q'));
            deepEqual(zero, fmapEx.parse([4,5,6], 'q'));
            deepEqual(error('oops'), fmapEx.commit('oops').parse([2,3,4], 'q'));
        });
        
        test("pure", function() {
            deepEqual(myPure('hi there', '123abc', {a: 'bcd'}), Parser.pure("hi there").parse("123abc", {a: 'bcd'}));
        });
        
        test("bind", function() {
            var two = item.bind(literal),
                ex = item.bind(function(x) {
                    return item.bind(function(y) {
                        return literal(x);
                    });
                });

            deepEqual(myPure('a', 'bcd', 3), two.parse("aabcd", 3));
            deepEqual(myPure('b', 'cd', 3), two.parse("bbcd", 3));
            deepEqual(zero, two.parse("abcd"));
            deepEqual(myPure(1, [3], 'oo'), ex.parse([1,2,1,3], 'oo'));
            deepEqual(zero, ex.parse([1,2,3,4], 'oop'));
        });
        
        test("plus", function() {
            var p = literal('a').plus(literal('b'));
            deepEqual(myPure('a', 'bcde', [1,2]), p.parse("abcde", [1,2]));
            deepEqual(myPure('b', 'cde', [1,2]), p.parse("bcde", [1,2]));
            deepEqual(zero, p.parse("cde", [1,2]));
            deepEqual(error("xyz", [1,2]), literal('a').plus(Parser.get.bind(err)).parse("xyz", [1,2]));
        });
        
        test("zero", function() {
            deepEqual(zero, Parser.zero.parse("abc123", [1,2]));
        });

        test("error", function() {
            deepEqual(error('qrs'), literal('a').seq2R(err('qrs')).parse('abcd'));
            deepEqual(zero, literal('a').seq2R(err('tuv')).parse('bcd'));
        });

        test("mapError", function() {
            deepEqual(error(4), err('oops').parse([2,3,4]).mapError(function(x) {return x.length;}));
        });
        
        test("get", function() {
            deepEqual(myPure('abc', 'abc', 12), Parser.get.parse('abc', 12));
            deepEqual(zero, Parser.zero.seq2R(Parser.get).parse('abc', 123));
            deepEqual(error('oops'), err('oops').seq2R(Parser.get).parse('abc', 123));
        });

        test("put", function() {
            deepEqual(myPure(null, 'abc', 12), Parser.put('abc').parse('def', 12));
            deepEqual(zero, Parser.zero.seq2R(Parser.put('abc')).parse('def', 12));
            deepEqual(error('oops'), err('oops').seq2R(Parser.put('abc')).parse('def', 12));
        });

        test("getState", function() {
            deepEqual(myPure(12, 'abc', 12), Parser.getState.parse('abc', 12));
            deepEqual(zero, Parser.zero.seq2R(Parser.getState).parse('abc', 123));
            deepEqual(error('oops'), err('oops').seq2R(Parser.getState).parse('abc', 123));
        });

        test("putState", function() {
            deepEqual(myPure(null, 'def', 27), Parser.putState(27).parse('def', 12));
            deepEqual(zero, Parser.zero.seq2R(Parser.putState(27)).parse('def', 12));
            deepEqual(error('oops'), err('oops').seq2R(Parser.putState(27)).parse('def', 12));
        });

        test("updateState", function() {
            function inc(x) {return x + 1;}
            deepEqual(myPure(null, 'abc', 13), Parser.updateState(inc).parse('abc', 12));
            deepEqual(zero, Parser.zero.seq2R(Parser.updateState(inc)).parse('abc', 123));
            deepEqual(error('oops'), err('oops').seq2R(Parser.updateState(inc)).parse('abc', 123));
        });

        test("check", function() {
            function gt3(x) {return x > 3;}
            deepEqual(zero, item.check(gt3).parse(""));
            deepEqual(myPure(4, [5, "abc"]), item.check(gt3).parse([4, 5, "abc"]));
            deepEqual(zero, item.check(gt3).parse([2, 5, 'abc']));
        });
        
        test("literal", function() {
			function g(l, r) {
				if(l.length !== r.length) {
					return false;
				}
				for(var i = 0; i < l.length; i++) {
					if(l[i] !== r[i]) {
						return false;
					}
				}
				return true;
			}
			
            var a = literal('a'),
                thirteen = literal(13),
                lis = literal([12, 13], g);
                
            deepEqual(zero, a.parse("", 32));
            deepEqual(zero, a.parse("bde", 32));
            deepEqual(myPure('a', 'bcd', 32), a.parse('abcd', 32));
            deepEqual(myPure(13, [79, 22], 'oops'), thirteen.parse([13, 79, 22], 'oops'));
            deepEqual(myPure([12, 13], ["abc"], 123), lis.parse([[12,13], "abc"], 123));
        });
        
        test("satisfy", function() {
            function cond(x) {
                return x > 3;
            }
            deepEqual(zero, sat(cond).parse([]));
            deepEqual(zero, sat(cond).parse([2,5,6], "p"));
            deepEqual(myPure(18, [3, 1], 'oop'), sat(cond).parse([18, 3, 1], 'oop'));
        });
        
        test("many0", function() {
            var as = literal('a').many0();
            deepEqual(myPure([], 'bbb', 3), as.parse("bbb", 3));
            deepEqual(myPure(['a', 'a', 'a'], 'bcd', 3), as.parse('aaabcd', 3));
            deepEqual(error('oops -- an error'), err('oops -- an error').many0().parse('abc'));
        });
        
        test("many1", function() {
            var as = literal('a').many1();
            deepEqual(zero, as.parse("bbb"));
            deepEqual(myPure(['a', 'a'], 'bbb', 4), as.parse('aabbb', 4));
            deepEqual(error('hi'), err('hi').many1().parse('abc'));
        });
        
        test("all", function() {
            var tt = all([literal(2), literal(12)]);
            deepEqual(myPure([], 'abc', 123), all([]).parse('abc', 123));
            deepEqual(myPure([2, 12], [3,4], 'oop'), tt.parse([2,12,3,4], 'oop'));
            deepEqual(zero, tt.parse([2,13,4], 'oop'));
            deepEqual(error('no'), all([err('no'), item]).parse("abc", 123));
        });
        
        test("app", function() {
			function f3(x,y,z) {
				return x + z;
			}
			var p = Parser.app(f3, item, literal(-1), item);
			deepEqual(zero, p.parse([18, -2, 27, 3, 4], 'st'));
			deepEqual(zero, p.parse([18, -1], 'st'));
			deepEqual(myPure(45, [3,4], 'st'), p.parse([18, -1, 27, 3, 4], 'st'));
			deepEqual(error('blah'), Parser.app(f3, err('blah')).parse([1,2,3]));
        });
        
        test("optional", function() {
            deepEqual(myPure(4, 'bcde', 123), literal('a').optional(4).parse('bcde', 123));
            deepEqual(myPure('a', 'bcd', 123), literal('a').optional(4).parse('abcd', 123));
        });
        
        test("not0", function() {
            deepEqual(zero, item.not0().parse("abc"));
            deepEqual(myPure(null, '', 12), item.not0().parse('', 12));
            deepEqual(myPure(null, 'def', 12), literal('q').not0().parse('def', 12));
        });
        
        test("not1", function() {
            deepEqual(zero, item.not1().parse("abc"));
            deepEqual(zero, item.not1().parse('', 12));
            deepEqual(myPure('d', 'ef', 12), literal('q').not1().parse('def', 12));
        });
        
        test("commit", function() {
            deepEqual(error('blegg'), literal('a').commit('blegg').parse("bcde"));
            deepEqual(myPure('a', 'bcde', 12), item.commit('???').parse('abcde', 12));
            deepEqual(error('inner'), err('inner').commit('outer').parse('abcde'));
        });
        
        test("seq2L", function() {
            var p = item.seq2L(literal('b'));
            deepEqual(myPure('a', 'cde', 12), p.parse('abcde', 12));
            deepEqual(zero, p.parse("acdef", 12));
        });
        
        test("seq2R", function() {
            var p = item.seq2R(literal('b'));
            deepEqual(myPure('b', 'cde', 12), p.parse('abcde', 12));
            deepEqual(zero, p.parse("acdef", 12));
        });
        
        test("string", function() {
            var p = string('public');
            deepEqual(myPure('public', 'ness', 13), p.parse("publicness", 13));
            deepEqual(zero, p.parse("pub-a-thon", 13));
            function eq(x, y) {
                return x[0] === y;
            }
            deepEqual(myPure([['a',1],['b',2]], 'cd', 2), string([['a', 1], ['b', 2]], eq).parse('abcd', 2));
        });
        
        test("any", function() {
            var p = any([literal('a'), literal('b'), string("zyx")]);
            deepEqual(myPure('a', '123', 14), p.parse('a123', 14));
            deepEqual(myPure('b', '123', 14), p.parse('b123', 14));
            deepEqual(myPure('zyx', '123', 14), p.parse('zyx123', 14));
            deepEqual(zero, p.parse("c123", 14));
            deepEqual(error('oops'), any([p, err('oops')]).parse('cde', 14));
        });
    };

});
