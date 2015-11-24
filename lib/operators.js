"use strict";

var C = require('./combinators');

var checkFunction = C.private.checkFunction,
    checkParser = C.private.checkParser,
    good = C.private.good;

function id(x) {
    return x;
}

function flipApply(x, f) {
    return f(x);
}

// TODO: can this be made more clear?
function chainR(operator, parser) {
    /*
    Parser e s (m t) (a -> a -> a) -> Parser e s (m t) a -> Parser e s (m t) a
    */
    checkParser('chainR', operator);
    checkParser('chainR', parser);
    function f(a, b) {
        return function(c) {
            return b(a, c);
        };
    }
    var ops = C.bind(C.app(f, parser, operator), function(g) {
            return C.bind(chainR(operator, parser), function(x) {
                return C.pure(g(x));
            });
        });
    return C.alt(ops, parser);
}

function chainR2(operator, parser) {
    // TODO alternative approach: build up a list of terms and operators, and use them at the end
    checkParser('chainR2', operator);
    checkParser('chainR2', parser);
    function f(xs, s) {
        var r = parser.parse(xs, s);
        if ( r.status !== 'success' ) { return r; }

        var o = operator.parse(r.value.rest, r.value.state);
        if ( o.status === 'failure' ) { return r; }
        else if ( o.status === 'error' ) { return o; }

        var c = chainR2(operator, parser).parse(o.value.rest, o.value.state);
        if ( c.status === 'failure' ) { return r; }
        else if ( c.status === 'error' ) { return c; }

        var left = r.value.result,
            op = o.value.result,
            right = c.value.result;
        return good(op(left, right), c.value.rest, c.value.state);
    }
    return new C.Parser(f);
}

function chainL2(operator, parser) {
    checkParser('chainL2', operator);
    checkParser('chainL2', parser);
    function f(xs, s) {
        var r = parser.parse(xs, s),
            o, term, op;
        if ( r.status !== 'success' ) { return r; }
        term = r.value.result;
        while (true) {
            o = operator.parse(r.value.rest, r.value.state);
            if ( o.status === 'failure' ) { break; }
            else if ( o .status === 'error' ) { return o; }

            r = parser.parse(o.value.rest, o.value.state);
            if ( r.status === 'failure' ) { break; }
            else if ( r.status === 'error' ) { return r; }

            op = o.value.result;
            term = op(term, r.value.result);
        }
        return good(term, r.value.rest, r.value.state);
    }
    return new C.Parser(f);
}

function chainL(operator, parser) {
    /*
    Parser e s (m t) (a -> a -> a) -> Parser e s (m t) a -> Parser e s (m t) a    
    */
    checkParser('chainL', operator);
    checkParser('chainL', parser);
    function f(b, c, rs) {
        return function(a) {
            return rs(b(a, c));
        };
    }
    var rest = C.error('undefined');
    rest.parse = C.alt(C.app(f, operator, parser, rest), C.pure(id)).parse;
    return C.app(flipApply, parser, rest);
}

function prefix(operator, parser) {
    /*
    Parser e s (m t) (a -> a) -> Parser e s (m t) a -> Parser e s (m t) a
    */
    // TODO appP hasn't been implemented yet!
    return C.alt(C.appP(operator, prefix(operator, parser)), parser);
}

function postfix(operator, parser) {
    /*
    Parser e s (m t) (a -> a) -> Parser e s (m t) a -> Parser e s (m t) a
    */
    function f(o, os, a) {
        return os(o, a);
    }
    var rest = C.error('undefined');
    rest.parse = C.alt(C.app(f, operator, rest), C.pure(id)).parse;
    return C.app(flipApply, parser, rest);
}

/*
sepBy1 :: Parser t a -> Parser t b -> Parser t [b]
sepBy1 sep p = (:) <$> p <*> (pMany0 (sep *> p))

sepBy0 :: Parser t a -> Parser t b -> Parser t [b]
sepBy0 sep p = sepBy1 sep p <|> pReturn []

-- need a `ternaryL` function for left-associative
ternaryR :: (a -> a -> a -> a) -> Parser t b -> Parser t c -> Parser t a -> Parser t a
ternaryR f op1 op2 p = (g <$> p <*> op1 <*> recur <*> op2 <*> recur) <|> p -- TODO factor out the `p`
  where
    recur = ternaryR f op1 op2 p
    g a1 _ a2 _ a3 = f a1 a2 a3
*/

var mult = chainR2(C.app(function(o) {return function(l, r) {return ['(', l, ' ', o, ' ', r, ')'].join('');};},
                         C.position.oneOf('*/')),
                   C.position.oneOf('abcdefg')),
    add = chainR2(C.app(function(o) {return function(l, r) {return ['(', l, ' ', o, ' ', r, ')'].join('');};},
                        C.position.oneOf('+-')),
                  mult);

var m2 = chainL2(C.app(function(o) {return function(l, r) {return ['(', l, ' ', o, ' ', r, ')'].join('');};},
                      C.position.oneOf('*/')),
                C.position.oneOf('abcdefg')),
	a2 = chainL2(C.app(function(o) {return function(l, r) {return ['(', l, ' ', o, ' ', r, ')'].join('');};},
                      C.position.oneOf('+-')),
                m2);

function node(op) {
    return function(l, r) {
        return {'l': l, 'r': r, 'op': op};
    };
}

function dump(n) {
    if (!n.l || !n.r) { console.log('oops -- ' + JSON.stringify(n)); }
    var l = (typeof n.l === 'string') ? n.l : dump(n.l),
        r = (typeof n.r === 'string') ? n.r : dump(n.r);
    return ['(', l, ' ', n.op, ' ', r, ')'].join('');
}

var letter = C.position.satisfy(function(c) {return c >= 'a' && c <= 'z';}),
    word = C.fmap(function(x) {return x.join('');}, C.many1(letter)),
    a = chainL(C.app(node, C.position.string('**')), word),
    b = chainR2(C.app(node, C.position.literal('^')), a),
    c = chainL2(C.app(node, C.position.oneOf('+-')), b);

var q = c.parse('abc**def**ghi^jkl^mno+pqr+stu', [1,1]);

module.exports = {
    'chainL': chainL,
    'chainR': chainR,
    
    'add': add,
    'mult': mult,
    'c': c,
    'eg1': add.parse('a+b*c*d/e+f-g', [1,1]),
    'eg2': a2.parse('a+b*c*d/e+f-g', [1,1]),
    'eg3': q,
    'eg3s': dump(q.value.result)
};
