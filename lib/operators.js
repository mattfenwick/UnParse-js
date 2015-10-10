"use strict";

var C = require('./combinators');

var checkFunction = C.private.checkFunction,
    checkParser = C.private.checkParser,
    good = C.private.good;

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
    function flipApply(x, g) {
        return g(x);
    }
    function f(b, c, rs) {
        return function(a) {
            return rs(b(a, c));
        };
    }
    function id(x) {
        return x;
    }
    var rest = C.error('undefined');
    rest.parse = C.alt(C.app(f, operator, parser, rest), C.pure(id)).parse;
    return C.app(flipApply, parser, rest);
}
/*
chainR :: Parser t (a -> a -> a) -> Parser t a -> Parser t a
chainR op p = (f <$> p <*> op <*> chainR op p) <|> p -- TODO make more efficient -- factor out the `p`
  where
    f a b c = b a c

chainL :: Parser t (a -> a -> a) -> Parser t a -> Parser t a
chainL op p = flip ($) <$> p <*> rest
  where
    f b c rs a = rs (b a c)
    rest = (f <$> op <*> p <*> rest) <|> pReturn id

sepBy1 :: Parser t a -> Parser t b -> Parser t [b]
sepBy1 sep p = (:) <$> p <*> (pMany0 (sep *> p))

sepBy0 :: Parser t a -> Parser t b -> Parser t [b]
sepBy0 sep p = sepBy1 sep p <|> pReturn []

prefix :: Parser t (a -> a) -> Parser t a -> Parser t a
prefix op p = (op <*> prefix op p) <|> p

postfix :: Parser t (a -> a) -> Parser t a -> Parser t a
postfix op p = flip ($) <$> p <*> rest
  where
    rest = (f <$> op <*> rest) <|> pReturn id
    f o os a = os (o a)

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

module.exports = {
    'chainL': chainL,
    'chainR': chainR,
    
    'add': add,
    'mult': mult,
    'eg1': add.parse('a+b*c*d/e+f-g', [1,1]),
    'eg2': a2.parse('a+b*c*d/e+f-g', [1,1]),
};
