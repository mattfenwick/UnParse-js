define([
    "unparse-js/examples/jsontree"
], function(JT) {
    "use strict";
    
    var e = JT.make_error;
    
    function number(sign, int, dec, exp, pos) {
        return {
            '_name': 'number',
            '_state': pos,
            'sign': sign,
            'integer': int,
            'decimal': dec,
            'exponent': exp
        };
    }
    
    function keyword(value, pos) {
        return {
            '_name': 'keyword',
            '_state': pos,
            'value': value
        };
    }
    
    function keyval(key, val, pos) {
        return {
            '_name': 'key/val pair',
            '_state': pos,
            'key': key,
            'value': val,
            'colon': ':'
        };
    }
    
    return function() {
    
        // i -> in, o -> out
        // n -> number, k -> keyword, c -> char, s -> string, a -> array, o -> object
        var in1 = number(null, {'first': '3', 'rest': ['1']}, null, null),
            in2 = number(null, {'first': ['0'], 'rest': []}, null, null),
            in4 = number(null, {'first': ['8'], 'rest': []}, null, {'_name': 'exponent', 'letter': 'e', 'sign': '+', 'power': ['8', '7', '2']}),
            in5 = number('-', {'first': ['2'], 'rest': []}, null, {'_name': 'exponent', 'letter': 'e', 'sign': '-', 'power': ['5', '6', '4']}),
            ik1 = keyword('true'),
            ik2 = keyword('false'),
            ik3 = keyword('null'),
            ik4 = keyword('none'),
            ic1 = {'_name': 'character', '_state': null, 'value': 'c'},
            ic3 = {'_name': 'escape', '_state': null, 'open': '\\', 'value': 'n'},
            ic5 = {'_name': 'unicode escape', '_state': null, 'open': '\\u', 'value': ['0', '0', '6', '4']},
            is1 = {'_name': 'string', '_state': null, 'open': '"', 'close': '"', 'value': [ic1, ic3, ic5]},
            ia1 = {'_name': 'array', '_state': null, 'body': {'values': []}},
            ia2 = {'_name': 'array', '_state': null, 'body': {'values': [in1, ik2]}},
            ia3 = {'_name': 'array', '_state': null, 'body': {'values': [ia1]}},
            ia4 = {'_name': 'array', '_state': null, 'body': {'values': [in4, in5]}},
            io1 = {'_name': 'object', '_state': null, 'body': {'values': []}},
            io2 = {'_name': 'object', '_state': null, 'body': {'values': [keyval(is1, io1)]}},
            io3 = {'_name': 'object', '_state': null, 'body': {'values': [keyval(is1, in4)]}},
            io4 = {'_name': 'object', '_state': null, 'body': {'values': [keyval(is1, in1), keyval(is1, io1)]}};
        
        module("jsontree");
    
        test("simple number", function() {
            deepEqual(JT.t_value(in1),
                      JT.ret_err([], 31));
            deepEqual(JT.t_value(in2),
                      JT.ret_err([], 0));
            deepEqual(JT.t_value(in4),
                      JT.ret_err([e('number', 'overflow', '8e+872')],
                                 Infinity));
            deepEqual(JT.t_value(in5),
                      JT.ret_err([e('number', 'possible underflow', '-2e-564')],
                                 0));
        });
        
        test("keyword", function() {
            deepEqual(JT.t_value(ik1),
                      JT.ret_err([], true));
            deepEqual(JT.t_value(ik2),
                      JT.ret_err([], false));
            deepEqual(JT.t_value(ik3),
                      JT.ret_err([], null));
            deepEqual(JT.t_value(ik4),
                      JT.ret_err([e('keyword', 'invalid keyword', 'none')], undefined));
        });
        
        test("character", function() {
            deepEqual(JT.t_char(ic1),
                      JT.ret_err([], 'c'));
            deepEqual(JT.t_char(ic3),
                      JT.ret_err([], '\n'));
            deepEqual(JT.t_char(ic5),
                      JT.ret_err([], 'd'));
        });
        
        test("string", function() {
            deepEqual(JT.t_value(is1),
                      JT.ret_err([], 'c\nd'));
        });
        
        test("array", function() {
            deepEqual(JT.t_value(ia1),
                      JT.ret_err([], []));
            deepEqual(JT.t_value(ia2),
                      JT.ret_err([], [31, false]));
            deepEqual(JT.t_value(ia3),
                      JT.ret_err([], [[]]));
            deepEqual(JT.t_value(ia4),
                      JT.ret_err([e('number', 'overflow', '8e+872'),
                                  e('number', 'possible underflow', '-2e-564')], 
                                  [Infinity, 0]));
        });
        
        test("object", function() {
            deepEqual(JT.t_value(io1),
                      JT.ret_err([], {}));
            deepEqual(JT.t_value(io2),
                      JT.ret_err([], {'c\nd': {}}));
            deepEqual(JT.t_value(io3),
                      JT.ret_err([e('number', 'overflow', '8e+872')],
                                 {'c\nd': Infinity}));
            deepEqual(JT.t_value(io4),
                      JT.ret_err([e('object', 'duplicate key', 'c\nd', [null, null])], 
                                 {'c\nd': 31}));
        });
        
    };
    
});
