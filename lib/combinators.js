"use strict";

var M = require('./maybeerror.js');


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
        var obj = {
            'message' : 'type error',
            'function': fName,
            'expected': 'Parser',
            'actual'  : actual
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

function compose(f, g) {
    return function(x) { return f(g(x)); };
}


function fmap(g, parser) {
    /*
    (a -> b) -> Parser e s (m t) a -> Parser e s (m t) b
    */
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
    function f(xs, s) {
        return M.error(e);
    }
    return new Parser(f);
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
    return catchError(compose(error, f), parser);
}

function put(xs) {
    /*
    m t -> Parser e s (m t) a
    */
    function f(_xs_, s) {
        return good(null, xs, s);
    }
    return new Parser(f);
}

function putState(s) {
    /*
    s -> Parser e s (m t) a
    */
    function f(xs, _s_) {
        return good(null, xs, s);
    }
    return new Parser(f);
}

function updateState(g) {
    /*
    (s -> s) -> Parser e s (m t) a
    */
    checkFunction('updateState', g);
    function f(xs, s) {
        return good(null, xs, g(s));
    }
    return new Parser(f);
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

function _get_args(args, ix) {
    return Array.prototype.slice.call(args, ix);
}

function seq() {
    /*
    [Parser e s (m t) a] -> Parser e s (m t) [a]
    */
    var parsers = _get_args(arguments, 0);
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

function app(f) {
    var parsers = _get_args(arguments, 1);
    checkFunction('app', f);
    parsers.map(checkParser.bind(null, 'app')); // can I use `forEach` here as well?
    function g(args) {
        return f.apply(undefined, args);
    }
    return fmap(g, seq.apply(undefined, parsers));
}

function _first(x, _) {
    return x;
}

function _second(_, y) {
    return y;
}

function seq2L(p1, p2) {
    /*
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) a
    */
    checkParser('seq2L', p1);
    checkParser('seq2L', p2);
    return app(_first, p1, p2);
}

function seq2R(p1, p2) {
    /*
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) b
    */
    checkParser('seq2R', p1);
    checkParser('seq2R', p2);
    return app(_second, p1, p2);
}

function lookahead(parser) {
    /*
    Parser e s (m t) a -> Parser e s (m t) None
    */
    checkParser('lookahead', parser);
    return bind(get, function(xs) {return seq2R(parser, put(xs));});
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
    var parsers = _get_args(arguments, 0);
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

// Parser e s (m t) a
var zero = new Parser(function(xs, s) {return M.zero;});

// Parser e s (m t) (m t)
var get = new Parser(function(xs, s) {return good(xs, xs, s);});

// Parser e s (m t) s
var getState = new Parser(function(xs, s) {return good(s, xs, s);});


function _build_set(elems) {
    var obj = {};
    for(var i = 0; i < elems.length; i++) {
        obj[elems[i]] = 1;
    }
    return obj;
}

/*
item :: Parser e s (m t) t
`item` is the most basic parser and should:
 - succeed, consuming one single token if there are any tokens left
 - fail if there are no tokens left
*/
function Itemizer(item) {
    checkParser('Itemizer', item);
    
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
        return satisfy(function(x) {return x in c_set;}); // does this hit prototype properties ... ???
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


function _item_basic(xs, s) {
    /*
    Simply consumes a single token if one is available, presenting that token
    as the value.  Fails if token stream is empty.
    */
    if ( xs.length === 0 ) {
        return M.zero;
    }
    var first = xs[0],
        rest = xs.slice(1);
    return good(first, rest, s);
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

function _item_position(xs, position) {
    /*
    Assumes that the state is a 2-tuple of integers, (line, column).
    Does two things:
      1. see `_item_basic`
      2. updates the line/col position in the parsing state
    */
    if ( xs.length === 0 ) {
        return M.zero;
    }
    var first = xs[0],
        rest = xs.slice(1);
    return good(first, rest, _bump(first, position));
}


function _item_count(xs, ct) {
    /*
    Does two things:
      1. see `_item_basic`
      2. increments a counter -- which tells how many tokens have been consumed
    */
    if ( xs.length === 0 ) {
        return M.zero;
    }
    var first = xs[0],
        rest = xs.slice(1);
    return good(first, rest, ct + 1);
}


var basic    = Itemizer(new Parser(_item_basic)),
    position = Itemizer(new Parser(_item_position)),
    count    = Itemizer(new Parser(_item_count));


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
    'put'        : put,
    'putState'   : putState,
    'updateState': updateState,
    'check'      : check,
    'many0'      : many0,
    'many1'      : many1,
    'seq'        : seq,
    'app'        : app,
    'optional'   : optional,
    'seq2L'      : seq2L,
    'seq2R'      : seq2R,
    'lookahead'  : lookahead,
    'not0'       : not0,
    'commit'     : commit,
    'alt'        : alt,
    'zero'       : zero,
    'get'        : get,
    'getState'   : getState,
    
    'basic'      : basic,
    'position'   : position,
    'count'      : count,
    
    'run'        : run,
    
    '__version__': '0.1.3'
};

