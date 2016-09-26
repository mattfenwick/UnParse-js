"use strict";

var M = require('./maybeerror.js');
var F = require('./functions.js');


// ([t] -> s -> MaybeError e ([t], s, a)) -> Parser e s (m t) a
function Parser(f) {
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


// a -> Parser e s (m t) a
function pure(x) {
    return new Parser((xs, s) => good(x, xs, s));
}

// Parser e s (m t) a
var zero = new Parser(F.constF(M.zero));

// e -> Parser e s (m t) a
function error(e) {
    return new Parser(F.constF(M.error(e)));
}

// (a -> b) -> Parser e s (m t) a -> Parser e s (m t) b
function fmap(g, parser) {
    checkParser('fmap', parser);
    checkFunction('fmap', g);
    function h(r) {
        return result(g(r.result), r.rest, r.state);
    }
    return new Parser((xs, s) => parser.parse(xs, s).fmap(h));
}

// Parser e s (m t) a -> (a -> Parser e s (m t) b) -> Parser e s (m t) b
function bind(parser, g) {
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

// (a -> Bool) -> Parser e s (m t) a -> Parser e s (m t) a
function check(predicate, parser) {
    checkFunction('check', predicate);
    checkParser('check', parser);
    return bind(parser, (value) => predicate(value) ? pure(value) : zero);
}

// (m t -> m t) -> Parser e s (m t) (m t)
function update(f) {
    checkFunction('update', f);
    return new Parser(function(xs, s) {
        var ys = f(xs);
        return good(ys, ys, s);
    });
}

// Parser e s (m t) (m t)
var get = update(F.id);

// m t -> Parser e s (m t) (m t)
var put = F.compose(update, F.constF);

// (s -> s) -> Parser e s (m t) ()
function updateState(g) {
    checkFunction('updateState', g);
    return new Parser(function(xs, s) {
        var newState = g(s);
        return good(newState, xs, newState);
    });
}

// s -> Parser e s (m t) s
var putState = F.compose(updateState, F.constF);

// Parser e s (m t) s
var getState = updateState(F.id);

// Parser e s (m t) a -> Parser e s (m t) [a]
function many0(parser) {
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

// Parser e s (m t) a -> Parser e s (m t) [a]
function many1(parser) {
    checkParser('many1', parser);
    return check((x) => x.length > 0, many0(parser));
}

// [Parser e s (m t) a] -> Parser e s (m t) [a]
function seq(parsers) {
    parsers.forEach(checkParser.bind(null, 'seq'));
    function f(xs, s) {
        var vals = [],
            state = s,
            tokens = xs,
            r;
        for (var i = 0; i < parsers.length; i++) {
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

// Parser e s (m t) (a -> ... -> z) -> Parser e s (m t) a -> ... -> Parser e s (m t) z
function appP(p, ...parsers) {
    checkParser('appP', p);
    parsers.forEach(checkParser.bind(null, 'appP'));
    return bind(p, function(f) {
        return fmap((args) => f.apply(undefined, args), seq(parsers));
    });
}

// (a -> ... -> z) -> Parser e s (m t) a -> ... -> Parser e s (m t) z
function app(f, ...args) {
    return appP.apply(null, [pure(f)].concat(args));
}

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) a
function seq2L(p1, p2) {
    checkParser('seq2L', p1);
    checkParser('seq2L', p2);
    return app(F.first, p1, p2);
}

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) b
function seq2R(p1, p2) {
    checkParser('seq2R', p1);
    checkParser('seq2R', p2);
    return app(F.second, p1, p2);
}

// Int -> Parser e s (m t) a -> Parser e s (m t) [a]
function repeat(count, parser) {
    checkParser('repeat', parser);
    return seq(F.replicate(count, parser));
}

// Parser e s (m t) a -> Parser e s (m t) a
function lookahead(parser) {
    checkParser('lookahead', parser);
    return bind(get, function(xs) {
        return bind(getState, function(s) {
            return seq2L(parser,
                         seq([put(xs), putState(s)]));
        });
    });
}

// Parser e s (m t) a -> Parser e s (m t) ()
function not0(parser) {
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

// [Parser e s (m t) a] -> Parser e s (m t) a
function alt(parsers) {
    parsers.forEach(checkParser.bind(null, 'alt'));
    function f(xs, s) {
        var r = M.zero;
        for (var i = 0; i < parsers.length; i++) {
            r = parsers[i].parse(xs, s);
            if ( r.status === 'success' || r.status === 'error' ) {
                return r;
            }
        }
        return r;
    }
    return new Parser(f);
}

// Parser e s (m t) a -> a -> Parser e s (m t) a
function optional(parser, default_v) {
    // `default_v` is optional
    //   change undefineds to nulls to help distinguish accidents
    if ( typeof default_v === 'undefined' ) {
        default_v = null;
    }
    checkParser('optional', parser);
    return alt([parser, pure(default_v)]);
}

// (e -> Parser e s (m t) a) -> Parser e s (m t) a -> Parser e s (m t) a
function catchError(f, parser) {
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

// (e -> e) -> Parser e s (m t) a -> Parser e s (m t) a
function mapError(f, parser) {
    checkFunction('mapError', f);
    checkParser('mapError', parser);
    return catchError(F.compose(error, f), parser);
}

// e -> Parser e s (m t) a -> Parser e s (m t) a
function commit(e, parser) {
    checkParser('commit', parser);
    return alt([parser, error(e)]);
}

// e -> Parser [(e, s)] s (m t) a -> Parser [(e, s)] s (m t) a
function cut(message, parser) {
    checkParser('cut', parser);
    function f(state) {
        return commit([[message, state]], parser);
    }
    return bind(getState, f);
}

// e -> Parser [(e, s)] s (m t) a -> Parser [(e, s)] s (m t) a
function addError(e, parser) {
    checkParser('addError', parser);
    function f(state) {
        return mapError(function(es) {return F.cons([e, state], es);}, parser);
    }
    return bind(getState, f);
}

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) {'values': [a], 'separators': [b]}
function sepBy1(parser, separator) {
    return app(F.buildSepByValue,
               parser,
               many0(app(F.pair, separator, parser)));
}

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) {'values': [a], 'separators': [b]}
function sepBy0(parser, separator) {
    return optional(sepBy1(parser, separator), {'values': [], 'separators': []});
}


function Itemizer(f) {
    checkFunction('Itemizer', f);
    
    // Parser e s (m t) t
    var item = new Parser(function(xs, s) {
            if ( xs.length === 0 ) {
                return M.zero;
            }
            var first = xs[0],
                rest = xs.slice(1);
            return good(first, rest, f(first, s));
        });
    
    // Eq t => t -> Parser e s (m t) t
    function literal(x) {
        return check((y) => x === y, item);
    }
    
    // (t -> Bool) -> Parser e s (m t) t
    function satisfy(pred) {
        checkFunction('satisfy', pred);
        return check(pred, item);
    }
    
    // Parser e s (m t) a -> Parser e s (m t) t
    function not1(parser) {
        checkParser('not1', parser);
        return seq2R(not0(parser), item);
    }

    // Eq t => [t] -> Parser e s (m t) [t] 
    function string(elems) {
        var ps = [];
        for (var i = 0; i < elems.length; i++) { // have to do this b/c strings don't have a `map` method
            ps.push(literal(elems[i]));
        }
        var matcher = seq(ps);
        return seq2R(matcher, pure(elems));
    }
    
    // Eq t => Set t -> Parser e s (m t) t
    function oneOf(elems) {
        var charSet = F.buildSet(elems);
        return satisfy((x) => charSet.hasOwnProperty(x));
    }
    
    return {
        'item'   :  item,
        'literal':  literal,
        'satisfy':  satisfy,
        'not1'   :  not1,
        'string' :  string,
        'oneOf'  :  oneOf
    };
}


function _bump(char, position) {
    /*
    only treats `\n` as newline
    */
    var line = position[0],
        col = position[1];
    if ( char === '\n' ) {
        return [line + 1, 1];
    }
    return [line, col + 1];
}

var basic = Itemizer(function(first, s) { return s; }),
    // assumes the state is a 2-tuple of integers (line, column)
    position = Itemizer(_bump),
    // assumes that state is an integer -- how many tokens have been consumed
    count = Itemizer(function(first, s) { return s + 1; });


function run(parser, input_string, state) {
    /*
    Run a parser given the token input and state.
    */
    return parser.parse(input_string, state);
}


module.exports = {
    'Parser'     : Parser,
    'Itemizer'   : Itemizer,
    
    'pure'       : pure,
    'zero'       : zero,
    'error'      : error,

    'fmap'       : fmap,
    'bind'       : bind,
    'check'      : check,

    'update'     : update,
    'get'        : get,
    'put'        : put,
    'updateState': updateState,
    'getState'   : getState,
    'putState'   : putState,

    'many0'      : many0,
    'many1'      : many1,
    'seq'        : seq,
    'appP'       : appP,
    'app'        : app,
    'seq2L'      : seq2L,
    'seq2R'      : seq2R,
    'repeat'     : repeat,

    'lookahead'  : lookahead,
    'not0'       : not0,
    'alt'        : alt,
    'optional'   : optional,

    'catchError' : catchError,
    'mapError'   : mapError,
    'commit'     : commit,
    'cut'        : cut,
    'addError'   : addError,

    'sepBy1'     : sepBy1,
    'sepBy0'     : sepBy0,
    
    'basic'      : basic,
    'position'   : position,
    'count'      : count,
    
    'run'          : run,
    'checkFunction': checkFunction,
    'checkParser'  : checkParser,
    'good'         : good
};

