define([
    "unparse-js/examples/json", 
    "unparse-js/maybeerror", 
    "unparse-js/combinators"
], function(J, M, C) {
    "use strict";
    
    return function() {
    
        function good(rest, state, value) {
            return M.pure({'rest': rest, 'state': state, 'result': value});
        }
        
        var error = M.error;
    
        function cstnode(name, state) {
            var pairs = Array.prototype.slice.call(arguments, 2),
                obj = {'_name': name, '_state': state};
            pairs.map(function(p) {
                obj[p[0]] = p[1];
            });
            return obj;
        }
    
        function my_object(pos, seps, vals) {
            return cstnode('object', pos, 
                           ['open', '{'], ['close', '}'], 
                           ['body', {'separators': seps, 'values': vals}]);
        }
        
        module("json");
        
        test("Integer", function() {
            var inp = '83 abc';
            deepEqual(J.number.parse(inp, [1,1]),
                      good('abc', 
                           [1,4], 
                           cstnode('number', 
                               [1,1], 
                               ['sign', null],
                               ['integer', ['8', '3']],
                               ['exponent', null],
                               ['decimal', null])));
            var inp2 = '-77 abc';
            deepEqual(J.number.parse(inp2, [1,1]),
                      good('abc', 
                           [1,5], 
                           cstnode('number', 
                               [1,1], 
                               ['sign', '-'],
                               ['integer', ['7', '7']],
                               ['exponent', null],
                               ['decimal', null])));
        });

        test("DecimalAndExponent", function() {
            var inp = '-8.1e+2 abc';
            deepEqual(J.number.parse(inp, [1, 1]),
                      good('abc', [1, 9], 
                                  cstnode('number', [1, 1],
                                      ['sign', '-'],
                                      ['integer', ['8']],
                                      ['decimal', cstnode('decimal', [1, 3],
                                                      ['dot', '.'],
                                                      ['digits', ['1']])],
                                      ['exponent', cstnode('exponent', [1,5],
                                                       ['letter', 'e'],
                                                       ['sign', '+'],
                                                       ['power', ['2']])])));
            var inp2 = '-8.1 abc';
            deepEqual(J.number.parse(inp2, [1,1]),
                      good('abc', [1,6], 
                                  cstnode('number', [1,1],
                                      ['sign', '-'], 
                                      ['integer', ['8']], 
                                      ['decimal', cstnode('decimal', [1,3],
                                                      ['dot', '.'], 
                                                      ['digits', ['1']])],
                                      ['exponent', null])));
            var inp3 = '-8e+2 abc';
            deepEqual(J.number.parse(inp3, [1,1]),
                      good('abc', [1,7], 
                                  cstnode('number', [1,1],
                                      ['sign', '-'],
                                      ['integer', ['8']],
                                      ['decimal', null],
                                      ['exponent', cstnode('exponent', [1,3],
                                                       ['letter', 'e'],
                                                       ['sign', '+'],
                                                       ['power', ['2']])])));
        });

        test("NumberMessedUpExponent", function() {
            deepEqual(J.number.parse('0e abc', [1,1]),
                      error([['number', [1,1]], ['exponent', [1,2]], ['power', [1,3]]]));
        });
        
        test("NumberLeading0", function() {
            deepEqual(J.number.parse('-07 abc', [1,1]),
                      error([['number', [1,1]], ['invalid leading 0', [1,2]]]));
        });
    
        test("LoneMinusSign", function() {
            deepEqual(J.number.parse('-abc', [1,1]),
                      error([['number', [1,1]], ['digits', [1,2]]]));
        });
            
        test("EmptyString", function() {
            var inp = '"" def';
            deepEqual(J.jsonstring.parse(inp, [1,1]),
                      good('def', [1,4], cstnode('string', [1,1], 
                                               ['open', '"'],
                                               ['close', '"'],
                                               ['value', []])));
        });
    
        test("String", function() {
            var inp = '"abc" def',
                chars = [
                    cstnode('character', [1,2], ['value', 'a']),
                    cstnode('character', [1,3], ['value', 'b']),
                    cstnode('character', [1,4], ['value', 'c'])
                ],
                val = cstnode('string', [1,1], 
                              ['open', '"'],
                              ['close', '"'],
                              ['value', chars]);
            deepEqual(J.jsonstring.parse(inp, [1,1]), good('def', [1,7], val))
        });
        
        test("StringBasicEscape", function() {
            var inp = '"a\\b\\nc" def',
                chars = [
                    cstnode('character', [1,2], ['value', 'a']),
                    cstnode('escape', [1,3], ['open', '\\'], ['value', 'b']),
                    cstnode('escape', [1,5], ['open', '\\'], ['value', 'n']),
                    cstnode('character', [1,7], ['value', 'c'])
                ],
                val = cstnode('string', [1,1], ['open', '"'], ['close', '"'], ['value', chars]);
            deepEqual(J.jsonstring.parse(inp, [1,1]), good('def', [1,10], val))
        });
    
        test("StringEscapeSequences", function() {
            var inp = '"\\"\\\\\\/\\b\\f\\n\\r\\t" def',
                chars = [
                    cstnode('escape', [1,2], ['open', '\\'], ['value', '"']),
                    cstnode('escape', [1,4], ['open', '\\'], ['value', '\\']),
                    cstnode('escape', [1,6], ['open', '\\'], ['value', '/']),
                    cstnode('escape', [1,8], ['open', '\\'], ['value', 'b']),
                    cstnode('escape', [1,10], ['open', '\\'], ['value', 'f']),
                    cstnode('escape', [1,12], ['open', '\\'], ['value', 'n']),
                    cstnode('escape', [1,14], ['open', '\\'], ['value', 'r']),
                    cstnode('escape', [1,16], ['open', '\\'], ['value', 't']),
                ],
                val = cstnode('string', [1,1], ['open', '"'], ['close', '"'], ['value', chars]);
            deepEqual(J.jsonstring.parse(inp, [1,1]), good('def', [1,20], val));
        });
        
        test("StringUnicodeEscape", function() {
            var inp = '"a\\u0044n\\uabcdc" def',
                chars = [
                    cstnode('character', [1,2], ['value', 'a']),
                    cstnode('unicode escape', [1,3], ['open', '\\u'], ['value', ['0','0','4','4']]),
                    cstnode('character', [1,9], ['value', 'n']),
                    cstnode('unicode escape', [1,10], ['open', '\\u'], ['value', ['a','b','c','d']]),
                    cstnode('character', [1,16], ['value', 'c'])
                ],
                val = cstnode('string', [1,1], ['open', '"'], ['close', '"'], ['value', chars]);
            deepEqual(J.jsonstring.parse(inp, [1,1]), good('def', [1,19], val))
        });
    
        test("Punctuation", function() {
            var cases = [
                ['{ abc', 'oc'],
                ['} abc', 'cc'],
                ['[ abc', 'os'],
                ['] abc', 'cs'],
                [', abc', 'comma'],
                [': abc', 'colon']];
            cases.map(function(c) {
                var inp = c[0], parser = c[1];
                deepEqual(J[parser].parse(inp, [1,1]), 
                          good(inp.slice(2), [1,3], inp[0]));
            });
        });
    
        test("Keyword", function() {
            deepEqual(J.keyword.parse('true abc', [1,1]),
                      good('abc', [1,6], cstnode('keyword', [1,1], ['value', 'true'])));
            deepEqual(J.keyword.parse('false abc', [1,1]),
                      good('abc', [1,7], cstnode('keyword', [1,1], ['value', 'false'])));
            deepEqual(J.keyword.parse('null abc', [1,1]),
                      good('abc', [1,6], cstnode('keyword', [1,1], ['value', 'null'])));
        });
            
        test("KeyVal", function() {
            var chars = [
                cstnode('character', [1,2], ['value', 'q']),
                cstnode('character', [1,3], ['value', 'r']),
                cstnode('character', [1,4], ['value', 's'])
            ];
            deepEqual(J.keyVal.parse('"qrs"\n : true abc', [1,1]),
                      good('abc', 
                           [2,9],
                           cstnode('key/value pair', 
                               [1,1],
                               ['key', cstnode('string', [1,1], ['open', '"'], ['close', '"'], ['value', chars])],
                               ['colon', ':'],
                               ['value', cstnode('keyword', [2,4], ['value', 'true'])])));
        });
            
        test("KeyValueMissingColon", function() {
            deepEqual(J.keyVal.parse('"qrs"} abc', [1,1]),
                      error([['key/value pair', [1,1]], ['colon', [1,6]]]));
        });
            
        test("KeyValueMissingValue", function() {
            deepEqual(J.keyVal.parse('"qrs" :  abc', [1,1]), 
                      error([['key/value pair', [1,1]], ['value', [1,10]]]));
        });
    
        test("Object", function() {
            deepEqual(J.obj.parse('{} abc', [1,1]), 
                      good('abc', [1,4], my_object([1,1], [], [])));
            deepEqual(J.obj.parse('{"": null} abc', [1,1]), 
                      good('abc', 
                           [1,12], 
                           my_object([1,1], [], 
                                     [cstnode('key/value pair', 
                                          [1,2],
                                          ['colon', ':'],
                                          ['key', cstnode('string', [1,2], ['open', '"'], ['close', '"'], ['value', []])],
                                          ['value', cstnode('keyword', [1,6], ['value', 'null'])])])));
        });
    
        test("UnclosedObject", function() { 
            var e = error([['object', [1,1]], ['close', [1,12]]]);
            deepEqual(J.obj.parse('{"a": null ', [1,1]), e);
            deepEqual(J.obj.parse('{"a": null ,', [1,1]), e);
            deepEqual(J.obj.parse('{"a": null ]', [1,1]), e);
        });
    
        test("Array", function() {
            deepEqual(J.array.parse('[] abc', [1,1]),
                      good('abc', [1,4], 
                           cstnode('array', [1,1], ['open', '['], ['close', ']'], 
                               ['body', {'values': [], 'separators': []}])));
            deepEqual(J.array.parse('[true]', [1,1]),
                      good("", [1,7], 
                           cstnode('array', [1,1], ['open', '['], ['close', ']'],
                               ['body', {'values': [cstnode('keyword', [1,2], ['value', 'true'])],
                                         'separators': []}])));
            deepEqual(J.array.parse('[true,false]', [1,1]),
                      good('', [1,13], 
                           cstnode('array', [1,1], ['open', '['], ['close', ']'],
                               ['body', {'values': [
                                           cstnode('keyword', [1,2], ['value', 'true']),
                                           cstnode('keyword', [1,7], ['value', 'false'])
                                         ], 
                                         'separators': [',']}])));
        });
    
        test("ArrayErrors", function() {
            var cases = ['[', '[2', '[2,'],
                errors = [
                    [['array', [1,1]], ['close', [1,2]]],
                    [['array', [1,1]], ['close', [1,3]]],
                    [['array', [1,1]], ['close', [1,3]]]
                ];
            for(var i = 0; i < cases.length; i++) {
                deepEqual(J.array.parse(cases[i], [1,1]),
                          error(errors[i]));
            }
        });
    
        test("Json", function() {
            deepEqual(J.json.parse('{  }  \n', [1,1]),
                      good("", [2,1], 
                           cstnode('json', [1,1], ['value', my_object([1,1], [], [])])));
        });
        
        test("NoJson", function() {
            deepEqual(J.json.parse('a', [1,1]),
                      error([['json value', [1,1]]]));
        });
    
        test("string control character", function() {
            deepEqual(J.jsonstring.parse('"ab\x03cd"', [1,1]),
                      error([['string', [1,1]], ['character', [1,4]], ['invalid control character', [1,4]]]));
        });
        
        test("UnclosedString", function() {
            deepEqual(J.jsonstring.parse('"abc', [1,1]),
                      error([['string', [1,1]], ['double-quote', [1,5]]]));
        });
        
        test("StringBadEscape", function() {
            deepEqual(J.jsonstring.parse('"\\qr"', [1,1]),
                      error([['string', [1,1]], ['escape', [1,2]], ['simple escape', [1,3]]]));
        });
    
        test("StringBadUnicodeEscape", function() {
            var stack = [['string', [1,1]], ['unicode escape', [1,3]], ['4 hexadecimal digits', [1,5]]];
            deepEqual(J.jsonstring.parse('"2\\uabch1" def', [1,1]),
                      error(stack));
            deepEqual(J.jsonstring.parse('"?\\uab" def', [1,1]),
                      error(stack));
        });
        
        test("TrailingJunk", function() {
            deepEqual(J.json.parse('{} &', [1,1]),
                      error([['unparsed input remaining', [1,4]]]));
        });

    };

});
