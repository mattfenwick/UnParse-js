"use strict";

const M = require('./maybeerror.js');
const F = require('./functions.js');


// ([t] -> s -> MaybeError e ([t], s, a)) -> Parser e s (m t) a
function Parser(f) {
    this.parse = f;
}

function checkFunction(fName, actual) {
    if ( typeof actual !== 'function' ) {
        const obj = {
            'message' : 'type error',
            'function': fName,
            'expected': 'function',
            'actual'  : F.debugString(actual)
        };
        throw new Error(JSON.stringify(obj));
    }
    // else:  nothing to do
}

function checkParser(fName, actual) {
    if ( !(actual instanceof Parser) ) {
        const obj = {
            'message' : 'type error',
            'function': fName,
            'expected': 'Parser',
            'actual'  : F.debugString(actual)
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
const zero = new Parser(F.constF(M.zero));

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
        const r = parser.parse(xs, s),
            val = r.value;
        return (r.status === 'success') ? g(val.result).parse(val.rest, val.state) : r;
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
        const ys = f(xs);
        return good(ys, ys, s);
    });
}

// Parser e s (m t) (m t)
const get = update(F.id);

// m t -> Parser e s (m t) (m t)
const put = F.compose(update, F.constF);

// (s -> s) -> Parser e s (m t) s
function updateState(g) {
    checkFunction('updateState', g);
    return new Parser(function(xs, s) {
        const newState = g(s);
        return good(newState, xs, newState);
    });
}

// Parser e s (m t) s
const getState = updateState(F.id);

// s -> Parser e s (m t) s
const putState = F.compose(updateState, F.constF);

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
        return fmap((args) => f(...args), seq(parsers));
    });
}

// (a -> ... -> z) -> Parser e s (m t) a -> ... -> Parser e s (m t) z
function app(f, ...args) {
    return appP(pure(f), ...args);
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
            return app((a, _1, _2) => a, parser, put(xs), putState(s));
        });
    });
}

// Parser e s (m t) a -> Parser e s (m t) ()
function not0(parser) {
    checkParser('not0', parser);
    function f(xs, s) {
        const r = parser.parse(xs, s);
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
        for (var i = 0; i < parsers.length; i++) {
            const r = parsers[i].parse(xs, s);
            if ( r.status === 'success' || r.status === 'error' ) {
                return r;
            }
        }
        return M.zero;
    }
    return new Parser(f);
}

// Parser e s (m t) a -> a -> Parser e s (m t) a
function optional(parser, defaultValue = null) {
    checkParser('optional', parser);
    return alt([parser, pure(defaultValue)]);
}

// Parser e s (m t) a -> (e -> Parser e s (m t) a) -> Parser e s (m t) a
function catchError(parser, f) {
    checkParser('catchError', parser);
    checkFunction('catchError', f);
    return new Parser(function(xs, s) {
        const v = parser.parse(xs, s);
        return (v.status === 'error') ? f(v.value).parse(xs, s) : v;
    });
}

// (e -> e) -> Parser e s (m t) a -> Parser e s (m t) a
function mapError(f, parser) {
    checkFunction('mapError', f);
    checkParser('mapError', parser);
    return catchError(parser, F.compose(error, f));
}

// e -> Parser e s (m t) a -> Parser e s (m t) a
function commit(e, parser) {
    checkParser('commit', parser);
    return alt([parser, error(e)]);
}

// e -> Parser [e] s (m t) a -> Parser [e] s (m t) a
function addError(e, parser) {
    checkParser('addError', parser);
    return mapError(errors => F.cons(e, errors), parser);
}

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (a, [(b, a)])
function sepBy1(parser, separator) {
    return app(F.pair, parser, many0(app(F.pair, separator, parser)));
}

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (Maybe (a, [(b, a)]))
function sepBy0(parser, separator) {
    return optional(sepBy1(parser, separator));
}


function itemizer(f) {
    checkFunction('itemizer', f);
    
    // Parser e s (m t) t
    const item = new Parser(function(xs, s) {
            if ( xs.length === 0 ) {
                return M.zero;
            }
            const first = xs[0],
                rest = xs.slice(1);
            return good(first, rest, f(first, s));
        });
    
    // (t -> Bool) -> Parser e s (m t) t
    function satisfy(pred) {
        checkFunction('satisfy', pred);
        return check(pred, item);
    }
    
    // Eq t => t -> Parser e s (m t) t
    function literal(x) {
        return satisfy((y) => x === y);
    }
    
    // Parser e s (m t) a -> Parser e s (m t) t
    function not1(parser) {
        checkParser('not1', parser);
        return seq2R(not0(parser), item);
    }

    // Eq t => [t] -> Parser e s (m t) [t] 
    function string(elems) {
        // this allows a string to be passed in
        const matcher = seq(Array.from(elems).map(literal));
        return seq2R(matcher, pure(elems));
    }
    
    // Eq t => Set t -> Parser e s (m t) t
    function oneOf(elems) {
        const charSet = new Set(elems);
        return satisfy((x) => charSet.has(x));
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


// doesn't do anything to the state
const basic = itemizer(F.second);
// assumes the state is a 2-tuple of integers (line, column)
const position = itemizer(F.updatePosition);
// assumes that state is an integer -- how many tokens have been consumed
const count = itemizer((_, s) => s + 1);


function run(parser, input_string, state) {
    /*
    Run a parser given the token input and state.
    */
    return parser.parse(input_string, state);
}


module.exports = {
    'Parser'     : Parser,
    'itemizer'   : itemizer,
    
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

