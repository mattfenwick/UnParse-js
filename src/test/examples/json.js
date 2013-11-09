define(["app/examples/json", "app/maybeerror", "app/combinators"], function(J, M, C) {
    "use strict";
    
    return function() {
    
        function good(rest, state, value) {
            return M.pure({'rest': rest, 'state': state, 'result': value});
        }
    
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
        
        test("Integer", function() {
            var inp = '83 abc';
            deepEqual(good('abc', 
                           [1,4], 
                           cstnode('number', 
                               [1,1], 
                               ['sign', null],
                               ['integer', ['8', '3']],
                               ['exponent', null],
                               ['decimal', null])),
                      J.number.parse(inp, [1,1]));
            var inp2 = '-77 abc';
            deepEqual(good('abc', 
                           [1,5], 
                           cstnode('number', 
                               [1,1], 
                               ['sign', '-'],
                               ['integer', ['7', '7']],
                               ['exponent', null],
                               ['decimal', null])),
                      J.number.parse(inp2, [1,1]));
        });
    /*        
        test("DecimalAndExponent", function() {
            inp = '-8.1e+2 abc'
            deepEqual(good(inp[8:], (1,9), 
                                  cst('number', (1,1),
                                      sign='-',
                                      integer=['8'],
                                      decimal=cst('decimal', (1,3),
                                                  dot='.',
                                                  digits=['1']),
                                      exponent=cst('exponent', (1,5),
                                                   letter='e',
                                                   sign='+',
                                                   power=['2']))), 
                             number.parse(inp, (1,1)))
            inp2 = '-8.1 abc'
            deepEqual(good(inp2[5:], (1,6), 
                                  cst('number', (1,1),
                                      sign='-',
                                      integer=['8'],
                                      decimal=cst('decimal', (1,3),
                                                  dot='.',
                                                  digits=['1']),
                                      exponent=null)), 
                             number.parse(inp2, (1,1)))
            inp3 = '-8e+2 abc'
            deepEqual(good(inp3[6:], (1,7), 
                                  cst('number', (1,1),
                                      sign='-',
                                      integer=['8'],
                                      decimal=null,
                                      exponent=cst('exponent', (1,3),
                                                   letter='e',
                                                   sign='+',
                                                   power=['2']))), 
                             number.parse(inp3, (1,1)))
    
        test("NumberMessedUpExponent", function() {
            deepEqual(error([('number', (1,1)), ('exponent', (1,2)), ('power', (1,3))]), 
                             number.parse('0e abc', (1,1)))
    
        test("LoneMinusSign", function() {
            deepEqual(error([('number', (1,1)), ('digits', (1,2))]), 
                             number.parse('-abc', (1,1)))
            
        test("EmptyString", function() {
            inp = '"" def'
            deepEqual(good(inp[3:], (1,4), cst('string', (1,1), open='"', close='"', value=[])), 
                             jsonstring.parse(inp, (1,1)))
    
        test("String", function() {
            inp = '"abc" def'
            chars = [
                cst('character', (1,2), value='a'),
                cst('character', (1,3), value='b'),
                cst('character', (1,4), value='c')
            ]
            val = cst('string', (1,1), open='"', close='"', value=chars)
            deepEqual(good(inp[6:], (1,7), val), jsonstring.parse(inp, (1,1)))
        
        test("StringBasicEscape", function() {
            inp = '"a\\b\\nc" def'
            chars = [
                cst('character', (1,2), value='a'),
                cst('escape', (1,3), open='\\', value='b'),
                cst('escape', (1,5), open='\\', value='n'),
                cst('character', (1,7), value='c')
            ]
            val = cst('string', (1,1), open='"', close='"', value=chars)
            deepEqual(good(inp[9:], (1,10), val), jsonstring.parse(inp, (1,1)))
    
        test("StringEscapeSequences", function() {
            inp = '"\\"\\\\\\/\\b\\f\\n\\r\\t" def'
            chars = [
                cst('escape', (1,2), open='\\', value='"'),
                cst('escape', (1,4), open='\\', value='\\'),
                cst('escape', (1,6), open='\\', value='/'),
                cst('escape', (1,8), open='\\', value='b'),
                cst('escape', (1,10), open='\\', value='f'),
                cst('escape', (1,12), open='\\', value='n'),
                cst('escape', (1,14), open='\\', value='r'),
                cst('escape', (1,16), open='\\', value='t'),
            ]
            val = cst('string', (1,1), open='"', close='"', value=chars)
            deepEqual(good(inp[19:], (1,20), val), jsonstring.parse(inp, (1,1)))
        
        test("StringUnicodeEscape", function() {
            inp = '"a\\u0044n\\uabcdc" def'
            chars = [
                cst('character', (1,2), value='a'),
                cst('unicode escape', (1,3), open='\\u', value=['0','0','4','4']),
                cst('character', (1,9), value='n'),
                cst('unicode escape', (1,10), open='\\u', value=['a','b','c','d']),
                cst('character', (1,16), value='c')
            ]
            val = cst('string', (1,1), open='"', close='"', value=chars)
            deepEqual(good(inp[18:], (1,19), val), jsonstring.parse(inp, (1,1)))
    
        test("Punctuation", function() {
            cases = [['{ abc', oc],
                     ['} abc', cc],
                     ['[ abc', os],
                     ['] abc', cs],
                     [', abc', comma],
                     [': abc', colon]]
            for (inp, parser) in cases:
                print inp
                deepEqual(good(inp[2:], (1,3), inp[0]), parser.parse(inp, (1,1)))
    
        test("Keyword", function() {
            deepEqual(good('abc', (1,6), cst('keyword', (1,1), value='true')), 
                             keyword.parse('true abc', (1,1)))
            deepEqual(good('abc', (1,7), cst('keyword', (1,1), value='false')), 
                             keyword.parse('false abc', (1,1)))
            deepEqual(good('abc', (1,6), cst('keyword', (1,1), value='null')), 
                             keyword.parse('null abc', (1,1)))
            
        test("KeyVal", function() {
            chars = [
                cst('character', (1,2), value='q'),
                cst('character', (1,3), value='r'),
                cst('character', (1,4), value='s')
            ]
            deepEqual(good('abc', 
                                  (2,9),
                                  cst('key/value pair', 
                                      (1,1),
                                      key=cst('string', (1,1), open='"', close='"', value=chars),
                                      colon=':',
                                      value=cst('keyword', (2,4), value='true'))), 
                             keyVal.parse('"qrs"\n : true abc', (1,1)))
            
        test("KeyValueMissingColon", function() {
            deepEqual(error([('key/value pair', (1,1)), ('colon', (1,6))]),
                             keyVal.parse('"qrs"} abc', (1,1)))
            
        test("KeyValueMissingValue", function() {
            deepEqual(error([('key/value pair', (1,1)), ('value', (1,10))]),
                             keyVal.parse('"qrs" :  abc', (1,1)))
    
        test("Object", function() {
            deepEqual(good('abc', (1,4), my_object((1,1), [], [])), 
                             obj.parse('{} abc', (1,1)))
            deepEqual(good('abc', 
                                  (1,12), 
                                  my_object((1,1), [], 
                                            [cst('key/value pair', 
                                                 (1,2),
                                                 colon=':',
                                                 key=cst('string', (1,2), open='"', close='"', value=[]),
                                                 value=cst('keyword', (1,6), value='null'))])), 
                             obj.parse('{"": null} abc', (1,1)))
    
        test("UnclosedObject", function() { 
            e = error([('object', (1,1)), ('close', (1,12))])
            deepEqual(e, obj.parse('{"a": null ', (1,1)))
            deepEqual(e, obj.parse('{"a": null ,', (1,1)))
            deepEqual(e, obj.parse('{"a": null ]', (1,1)))
    
        test("Array", function() {
            deepEqual(good('abc', (1,4), 
                                  cst('array', (1,1), open='[', close=']', 
                                      body={'values': [], 'separators': []})), 
                             array.parse('[] abc', (1,1)))
            deepEqual(good([], (1,7), 
                                  cst('array', (1,1), open='[', close=']',
                                      body={'values': [cst('keyword', (1,2), value='true')],
                                            'separators': []})), 
                             array.parse('[true]', (1,1)))
            deepEqual(good([], (1,13), 
                                  cst('array', (1,1), open='[', close=']',
                                      body={'values': [
                                                cst('keyword', (1,2), value='true'),
                                                cst('keyword', (1,7), value='false')
                                            ], 
                                            'separators': [',']})), 
                             array.parse('[true,false]', (1,1)))
    
        test("ArrayErrors", function() {
            cases = ['[', '[2', '[2,']
            errors = [
                [('array', (1,1)), ('close', (1,2))],
                [('array', (1,1)), ('close', (1,3))],
                [('array', (1,1)), ('close', (1,3))]
            ]
            for (c, e) in zip(cases, errors):
                deepEqual(error(e),
                                 array.parse(c, (1,1)))
    
        test("Json", function() {
            deepEqual(good([], 
                                  (2,1), 
                                  cst('json', (1,1), value=my_object((1,1), [], []))),
                             json.parse('{  }  \n', (1,1)))
        
        test("UnclosedString", function() {
            deepEqual(error([('string', (1,1)), ('double-quote', (1,5))]), jsonstring.parse('"abc', (1,1)))
    
        test("StringBadUnicodeEscape", function() {
            stack = [('string', (1,1)), ('unicode escape', (1,3)), ('4 hexadecimal digits', (1,5))]
            deepEqual(error(stack), 
                             jsonstring.parse('"2\\uabch1" def', (1,1)))
            deepEqual(error(stack), 
                             jsonstring.parse('"?\\uab" def', (1,1)))
        
        test("TrailingJunk", function() {
            deepEqual(error([('unparsed input remaining', (1,4))]), json.parse('{} &', (1,1)))
    */
    
    };

});
    
