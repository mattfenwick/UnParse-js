"use strict";

var M = require('./maybeerror.js'),
    F = require('./funcs.js');


function Parser(f) {
    /*
    A wrapper around a callable of type `[t] -> s -> ME ([t], s, a)`.
    Run the parser using the `parse` method.
    */
    this.parse = f;
}

function checkFunction(fName, actual) {
    if ( typeof actual !== 'function' ) {
        var obj = {
            'message' : 'type error',
            'function': fName,
            'expected': 'function',
            'actual'  : actual
        };
        throw new Error(JSON.stringify(obj));
    }
    // else:  nothing to do
}

function checkParser(fName, actual) {
    if ( !(actual instanceof Parser) ) {
        var actualString = (typeof actual === 'function') ? 'function' : actual;
        var obj = {
            'message' : 'type error',
            'function': fName,
            'expected': 'Parser',
            'actual'  : actualString
        };
        throw new Error(JSON.stringify(obj));
    }
    // else:  nothing to do
}

function result(value, rest, state) {
    return {'result': value, 'rest': rest, 'state': state};
}

function good(value, rest, state) {
    return M.pure(result(value, rest, state));
}


function fmap(g, parser) {
    /*
    (a -> b) -> Parser e s (m t) a -> Parser e s (m t) b
    */
    checkParser('fmap', parser);
    checkFunction('fmap', g);
    function h(r) {
        return result(g(r.result), r.rest, r.state);
    }
    function f(xs, s) {
        return parser.parse(xs, s).fmap(h);
    }
    return new Parser(f);
}

function pure(x) {
    /*
    a -> Parser e s (m t) a
    */
    function f(xs, s) {
        return good(x, xs, s);
    }
    return new Parser(f);
}

function bind(parser, g) {
    /*
    Parser e s (m t) a -> (a -> Parser e s (m t) b) -> Parser e s (m t) b
    */
    checkParser('bind', parser);
    checkFunction('bind', g);
    function f(xs, s) {
        var r = parser.parse(xs, s),
            val = r.value;
        if ( r.status === 'success' ) {
            return g(val.result).parse(val.rest, val.state);
        } else {
            return r;
        }
    }
    return new Parser(f);
}

function error(e) {
    /*
    e -> Parser e s (m t) a
    */
    return new Parser(F.constF(M.error(e)));
}

function catchError(f, parser) {
    /*
    Parser e s (m t) a -> (e -> Parser e s (m t) a) -> Parser e s (m t) a
    */
    checkFunction('catchError', f);
    checkParser('catchError', parser);
    function g(xs, s) {
        var v = parser.parse(xs, s);
        if ( v.status === 'error' ) {
            return f(v.value).parse(xs, s);
        }
        return v;
    }
    return new Parser(g);
}

function mapError(f, parser) {
    /*
    Parser e s (m t) a -> (e -> e) -> Parser e s (m t) a
    */
    checkFunction('mapError', f);
    checkParser('mapError', parser);
    return catchError(F.compose(error, f), parser);
}

function update(g) {
    /*
    (m t -> m t) -> Parser e s (m t) (m t)
    */
    checkFunction('update', g);
    function f(xs, s) {
        return good(xs, g(xs), s);
    }
    return new Parser(f);
}

    // m t -> Parser e s (m t) (m t)
var put = F.compose(update, F.constF),
    // Parser e s (m t) (m t)
    get = update(F.id);

function updateState(g) {
    /*
    (s -> s) -> Parser e s (m t) s
    */
    checkFunction('updateState', g);
    function f(xs, s) {
        return good(s, xs, g(s));
    }
    return new Parser(f);
}

    // s -> Parser e s (m t) s
var putState = F.compose(updateState, F.constF),
    // Parser e s (m t) s
    getState = updateState(F.id);

function updateStateForKey(key, g) {
    /*
    x -> (y -> z) -> Parser e s (m t) z
    */
    checkFunction('updateStateForKey', g);
    function f(xs, s) {
        return good(s[key], xs, F.fmapObject(s, key, g));
    }
    return new Parser(f);
}

function putStateForKey(key, newValue) {
    /*
    y -> z -> Parser e s (m t) z
    */
    return updateStateForKey(key, F.constF(newValue));
}

function getStateForKey(key) {
    /*
    y -> Parser e s (m t) z
    */
    return updateStateForKey(key, F.id);
}

function check(predicate, parser) {
    /*
    (a -> Bool) -> Parser e s (m t) a -> Parser e s (m t) a
    */
    checkFunction('check', predicate);
    checkParser('check', parser);
    function f(xs, s) {
        var r = parser.parse(xs, s);
        if ( r.status !== 'success' ) {
            return r;
        } else if ( predicate(r.value.result) ) {
            return r;
        }
        return M.zero;
    }
    return new Parser(f);
}

function many0(parser) {
    /*
    Parser e s (m t) a -> Parser e s (m t) [a]
    */
    checkParser('many0', parser);
    function f(xs, s) {
        var vals = [],
            tokens = xs,
            state = s,
            r;
        while ( true ) {
            r = parser.parse(tokens, state);
            if ( r.status === 'success' ) {
                vals.push(r.value.result);
                state = r.value.state;
                tokens = r.value.rest;
            } else if ( r.status === 'failure' ) {
                return good(vals, tokens, state);
            } else { // must respect errors
                return r;
            }
        }
    }
    return new Parser(f);
}

function many1(parser) {
    /*
    Parser e s (m t) a -> Parser e s (m t) [a]
    */
    checkParser('many1', parser);
    return check(function(x) {return x.length > 0;}, many0(parser));
}

function seq() {
    /*
    [Parser e s (m t) a] -> Parser e s (m t) [a]
    */
    var parsers = F.getArgs(arguments, 0);
    parsers.map(checkParser.bind(null, 'seq')); // can I use `forEach` here instead of `map`?
    function f(xs, s) {
        var vals = [],
            state = s,
            tokens = xs,
            r;
        for(var i = 0; i < parsers.length; i++) {
            r = parsers[i].parse(tokens, state);
            if ( r.status === 'success' ) {
                vals.push(r.value.result);
                state = r.value.state;
                tokens = r.value.rest;
            } else {
                return r;
            }
        }
        return good(vals, tokens, state);
    }
    return new Parser(f);
}

function appP(p) {
    /*
    Parser e s (m t) (a -> ... -> z) -> Parser e s (m t) a -> ... -> Parser e s (m t) z
    */
    var parsers = F.getArgs(arguments, 1);
    checkParser('appP', p);
    parsers.map(checkParser.bind(null, 'appP'));
    return bind(p, function(f) {
        function g(args) {
            return f.apply(undefined, args);
        }
        return fmap(g, seq.apply(undefined, parsers));
    });
}

function app(f) {
    /*
    (a -> ... -> z) -> Parser e s (m t) a -> ... -> Parser e s (m t) z
    */
    var args = F.getArgs(arguments, 1);
    return appP.apply(null, [pure(f)].concat(args));
}

function seq2L(p1, p2) {
    /*
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) a
    */
    checkParser('seq2L', p1);
    checkParser('seq2L', p2);
    return app(F.first, p1, p2);
}

function seq2R(p1, p2) {
    /*
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) b
    */
    checkParser('seq2R', p1);
    checkParser('seq2R', p2);
    return app(F.second, p1, p2);
}

function lookahead(parser) {
    /*
    Parser e s (m t) a -> Parser e s (m t) None
    */
    checkParser('lookahead', parser);
    return bind(get, function(xs) {
        return bind(getState, function(s) {
            return seq2L(parser,
                         seq(put(xs), putState(s)));
        });
    });
}

function not0(parser) {
    /*
    Parser e s (m t) a -> Parser e s (m t) None
    */
    checkParser('not0', parser);
    function f(xs, s) {
        var r = parser.parse(xs, s);
        if ( r.status === 'error' ) {
            return r;
        } else if ( r.status === 'success' ) {
            return M.zero;
        } else {
            return good(null, xs, s);
        }
    }
    return new Parser(f);
}

function alt() {
    /*
    [Parser e s (m t) a] -> Parser e s (m t) a
    */
    var parsers = F.getArgs(arguments, 0);
    parsers.map(checkParser.bind(null, 'alt')); // use `forEach` here, too?
    function f(xs, s) {
        var r = M.zero;
        for(var i = 0; i < parsers.length; i++) {
            r = parsers[i].parse(xs, s);
            if ( r.status === 'success' || r.status === 'error' ) {
                return r;
            }
        }
        return r;
    }
    return new Parser(f);
}

function optional(parser, default_v) {
    /*
    Parser e s (m t) a -> a -> Parser e s (m t) a
    */
    // `default_v` is optional
    //   change undefineds to nulls to help distinguish accidents
    if ( typeof default_v === 'undefined' ) {
        default_v = null;
    }
    checkParser('optional', parser);
    return alt(parser, pure(default_v));
}

function commit(e, parser) {
    /*
    Parser e s (m t) a -> e -> Parser e s (m t) a
    */
    checkParser('commit', parser);
    return alt(parser, error(e));
}

function _buildSepByValue(fst, pairs) {
    var vals = [fst],
        seps = [];
    pairs.map(function(p) {
        var sep = p[0],
            val = p[1];
        vals.push(val);
        seps.push(sep);
    });
    return {
        'values': vals,
        'separators': seps
    };
}

function sepBy1(parser, separator) {
    /*
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) {'values': [a], 'separators': [b]}
    */
    return app(_buildSepByValue,
               parser,
               many0(app(F.pair, separator, parser)));
}

function sepBy0(parser, separator) {
    /*
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) {'values': [a], 'separators': [b]}
    */
    return optional(sepBy1(parser, separator), {'values': [], 'separators': []});
}

// Parser e s (m t) a
var zero = new Parser(F.constF(M.zero));


function _build_set(elems) {
    var obj = {};
    for(var i = 0; i < elems.length; i++) {
        obj[elems[i]] = 1;
    }
    return obj;
}


function Itemizer(f) {
    checkFunction('Itemizer', f);
    
    var item = new Parser(function(xs, s) {
            /*
            Parser e s (m t) t
            */
            if ( xs.length === 0 ) {
                return M.zero;
            }
            var first = xs[0],
                rest = xs.slice(1);
            return good(first, rest, f(first, s));
        });
    
    function literal(x) {
        /*
        Eq t => t -> Parser e s (m t) t
        */
        return check(function(y) {return x === y;}, item); // what about other notions of equality ??
    }
    
    function satisfy(pred) {
        /*
        (t -> Bool) -> Parser e s (m t) t
        */
        checkFunction('satisfy', pred);
        return check(pred, item);
    }
    
    function not1(parser) {
        /*
        Parser e s (m t) a -> Parser e s (m t) t
        */
        checkParser('not1', parser);
        return seq2R(not0(parser), item);
    }

    function string(elems) {
        /*
        Eq t => [t] -> Parser e s (m t) [t] 
        */
        var ps = [];
        for(var i = 0; i < elems.length; i++) { // have to do this b/c strings don't have a `map` method
            ps.push(literal(elems[i]));
        }
        var matcher = seq.apply(undefined, ps);
        return seq2R(matcher, pure(elems));
    }
    
    function oneOf(elems) {
        var c_set = _build_set(elems);
        return satisfy(function(x) {
            return c_set.hasOwnProperty(x); // TODO use actual set
        });
    }
    
    return {
        'item'   :  item,
        'literal':  literal,
        'satisfy':  satisfy,
        'string' :  string,
        'not1'   :  not1,
        'oneOf'  :  oneOf
    };
}


function _bump(char, s) {
    /*
    only treats `\n` as newline
    */
    return F.fmapObject(s, 'position', function(position) {
        var line = position[0],
            col = position[1];
        if ( char === '\n' ) {
            return [line + 1, 1];
        }
        return [line, col + 1];
    });
}

var basic = Itemizer(F.second),
    // assumes the state is a 2-tuple of integers (line, column)
    position = Itemizer(_bump),
    // assumes that state is an integer -- how many tokens have been consumed
    count = Itemizer(function(first, s) {
            return F.fmapObject(s, 'count', F.inc);
        });


function run(parser, input_string, state) {
    /*
    Run a parser given the token input and state.
    */
    return parser.parse(input_string, state);
}


module.exports = {
    'Parser'     : Parser,
    'Itemizer'   : Itemizer,
    
    'fmap'       : fmap,
    'pure'       : pure,
    'bind'       : bind,
    'error'      : error,
    'catchError' : catchError,
    'mapError'   : mapError,
    'update'     : update,
    'put'        : put,
    'get'        : get,
    'updateState': updateState,
    'putState'   : putState,
    'getState'   : getState,
    'updateStateForKey' : updateStateForKey,
    'putStateForKey'    : putStateForKey,
    'getStateForKey'    : getStateForKey,
    'check'      : check,
    'many0'      : many0,
    'many1'      : many1,
    'seq'        : seq,
    'app'        : app,
    'appP'       : appP,
    'optional'   : optional,
    'seq2L'      : seq2L,
    'seq2R'      : seq2R,
    'lookahead'  : lookahead,
    'not0'       : not0,
    'commit'     : commit,
    'alt'        : alt,
    'zero'       : zero,
    'sepBy0'     : sepBy0,
    'sepBy1'     : sepBy1,
    
    'basic'      : basic,
    'position'   : position,
    'count'      : count,
    
    'run'          : run,
    'checkFunction': checkFunction,
    'checkParser'  : checkParser,
    'good'         : good
};
