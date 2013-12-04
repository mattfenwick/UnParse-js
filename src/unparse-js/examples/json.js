// Json    :=  Object  |  Array
//
// Value   :=  'false'  |  'null'  |  'true'  |  Object  |  Array  |  Number  |  String
// 
// Object  :=  '{'  sepBy0(pair, ',')  '}'
//   where pair  :=  String  ':'  Value
// 
// Array   :=  '['  sepBy0(Value, ',')  ']'
// 
// Number  :=  '-'(?)  body  frac(?)  exponent(?)
//   where body   :=  '0'  |  ( [1-9]  [0-9](*) )
//         frac   :=  '.'  [0-9](+)
//         exponent  :=  [eE]  [-+](?)  [0-9](+)
// 
// String  :=  '"'  ( char  |  escape  |  unicode )(*)  '"'
//   where char    :=  not1( '\\'  |  '"'  |  \u0000-\u001F )
//         escape  :=  '\\'  ["\/bfnrt]                            <-- that's 8 characters
//         unicode :=  '\\u'  [0-9a-eA-E](4)
define([
    "unparse-js/combinators", 
    "unparse-js/cst"
], function(C, Cst) {

    var pos     = C.position,
        item    = pos.item,
        literal = pos.literal,
        satisfy = pos.satisfy,
        oneOf   = pos.oneOf,
        not1    = pos.not1, 
        string  = pos.string,
        node    = Cst.node,
        cut     = Cst.cut,
        sepBy0  = Cst.sepBy0,
        addError = Cst.addError;
        
    var many0 = C.many0, optional = C.optional,  
        app   = C.app,   pure = C.pure, seq2R = C.seq2R,
        many1 = C.many1, seq  = C.seq,  alt   = C.alt,
        seq2L = C.seq2L, not0 = C.not0, error = C.error,
        zero  = C.zero;

    function quantity(p, num) {
        var parsers = [];
        for(var i = 0; i < num; i++) {
            parsers.push(p);
        }
        return seq.apply(undefined, parsers);
    }

    var whitespace = many0(oneOf(' \t\n\r')),
        
        _digit = oneOf('0123456789'),
        
        _digits = many1(_digit),

        _decimal = node('decimal',
                        ['dot', literal('.')],
                        ['digits', cut('digits', _digits)]),
                        
        _exponent = node('exponent', 
                         ['letter', oneOf('eE')         ], 
                         ['sign', optional(oneOf('+-')) ],
                         ['power', cut('power', _digits)]),
        
        _leading_0_check = addError('invalid leading 0',
                                    not0(seq2L(_digit, error([]))))
        
        _integer_1 = node('integer',
                          ['first', seq2L(literal('0'), _leading_0_check)],
                          ['rest' , pure([])                             ]),
        
        _integer_2 = node('integer',
                          ['first', oneOf('123456789')],
                          ['rest', many0(_digit)      ]),
        
        _integer = alt(_integer_1, _integer_2), 

        _number_1 = node('number', 
                         ['sign', literal('-')              ],
                         ['integer', cut('digits', _integer)],
                         ['decimal', optional(_decimal)     ],
                         ['exponent', optional(_exponent)   ]),

        _number_2 = node('number', 
                         ['sign', pure(null)             ], // to match _number_1's schema
                         ['integer', _integer            ],
                         ['decimal', optional(_decimal)  ],
                         ['exponent', optional(_exponent)]),

        // there are two number patterns solely to get the error reporting right
        //   if there's a `-` but a number can't be parsed, that's an error
        _number = alt(_number_1, _number_2);


    var _control = addError('invalid control character', 
                       seq(satisfy(function(c) {return c.charCodeAt() < 32;}), error([])))
        _char = node('character',
                     ['value', not1(alt(oneOf('\\"'), _control))]),

        _escape = node('escape', 
                       ['open', literal('\\')                            ],
                       ['value', cut('simple escape', oneOf('"\\/bfnrt'))]),

        _hexC = oneOf('0123456789abcdefABCDEF'),

        _unic = node('unicode escape',
                     ['open', string('\\u')                                   ],
                     ['value', cut('4 hexadecimal digits', quantity(_hexC, 4))]),

        _jsonstring = node('string', 
                           ['open', literal('"')                      ], 
                           ['value', many0(alt(_char, _unic, _escape))], 
                           ['close', cut('double-quote', literal('"'))]),

        _keyword = node('keyword', 
                        ['value', alt(string('true'), string('false'), string('null'))]);


    function tok(parser) {
        return seq2L(parser, whitespace);
    }

    var jsonstring = tok(_jsonstring),
        number     = tok(_number),
        keyword    = tok(_keyword),
        os         = tok(literal('[')),
        cs         = tok(literal(']')),
        oc         = tok(literal('{')),
        cc         = tok(literal('}')),
        comma      = tok(literal(',')),
        colon      = tok(literal(':'));

    var obj = error('unimplemented'),
        array = error('unimplemented');

    var value = alt(jsonstring, number, keyword, obj, array),

        keyVal = node('key/value pair',
                      ['key', jsonstring           ],
                      ['colon', cut('colon', colon)],
                      ['value', cut('value', value)]);

    array.parse = node('array',
                       ['open', os                  ],
                       ['body', sepBy0(value, comma)],
                       ['close', cut('close', cs)   ]).parse;

    obj.parse = node('object', 
                     ['open', oc                   ], 
                     ['body', sepBy0(keyVal, comma)], 
                     ['close', cut('close', cc)    ]).parse;

    var _json = node('json',
                     ['value', value]), // alt(obj, array)),

        json = seq2L(seq2R(whitespace, cut('json value', _json)),
                     cut('unparsed input remaining', not0(item)));
    
    return {
        'json'   : json,
        'obj'    : obj,
        'array'  : array,
        'keyVal' : keyVal,
        'number' : number,
        'keyword': keyword,
        'value'  : value,
        'jsonstring': jsonstring,
        'oc'     : oc,
        'cc'     : cc,
        'os'     : os,
        'cs'     : cs,
        'comma'  : comma,
        'colon'  : colon
    };
    
});
