"use strict";

var C = require('./combinators');

var checkParser = C.checkParser,
    good = C.good;

function id(x) {
    return x;
}

function flipApply(x, f) {
    return f(x);
}

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
    /*
    Parser e s (m t) (a -> a -> a) -> Parser e s (m t) a -> Parser e s (m t) a
    */
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

function PrefixNode(op, arg) {
    this.op = op;
    this.arg = arg;
}

function PostfixNode(op, arg) {
    this.op = op;
    this.arg = arg;
}

function BinaryNode(op, arg1, arg2) {
    this.op = op;
    this.arg1 = arg1;
    this.arg2 = arg2;
}

function dump(x) {
    if (x instanceof BinaryNode) {
        return ['(', x.op, ' ', dump(x.arg1), ' ', dump(x.arg2), ')'].join('');
    } else if (x instanceof PrefixNode) {
        return ['(', x.op, ' ', dump(x.arg), ')'].join('');
    } else if (x instanceof PostfixNode) {
        return ['(', dump(x.arg), ' ', x.op, ')'].join('');
    }
    return x;
}

function chainR3(operator, parser) {
    /*
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (BinaryNode a b)
    */
    function f(sepVal) {
        var ops = sepVal.separators,
            values = sepVal.values;
        if (values.length !== (ops.length + 1)) {
            throw new Error('unexpected condition -- # of values is !== to (# of operators + 1)');
        }
        var val = values[values.length - 1];
        for (var i = ops.length - 1; i >= 0; i--) {
            val = new BinaryNode(ops[i], values[i], val);
        }
        return val;
    }
    return C.app(f, C.sepBy1(parser, operator));
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

function chainL2(operator, parser) {
    /*
    Parser e s (m t) (a -> a -> a) -> Parser e s (m t) a -> Parser e s (m t) a
    */
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

function chainL3(operator, parser) {
    /*
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (BinaryNode a b)
    */
    function f(sepVal) {
        var ops = sepVal.separators,
            values = sepVal.values;
        if (values.length !== (ops.length + 1)) {
            throw new Error('unexpected condition -- # of values is !== to (# of operators + 1)');
        }
        var val = values[0];
        for (var i = 0; i < ops.length; i++) {
            val = new BinaryNode(ops[i], val, values[i+1]);
        }
        return val;
    }
    return C.app(f, C.sepBy1(parser, operator));
}

function prefix(operator, parser) {
    /*
    Parser e s (m t) (a -> a) -> Parser e s (m t) a -> Parser e s (m t) a
    */
    // using bind instead of `C.appP(operator, prefix(operator, parser))` to avoid infinite recursion
    var recurse = C.bind(operator, function(f) {
            return C.fmap(f, prefix(operator, parser));
        });
    return C.alt(recurse, parser);
}

function prefix2(operator, parser) {
    /*
    Parser e s (m t) (a -> a) -> Parser e s (m t) a -> Parser e s (m t) a
    */
    function reverseApplyAll(fs, x) {
        for (var i = fs.length - 1; i >= 0; i--) {
            x = fs[i](x);
        }
        return x;
    }
    return C.app(reverseApplyAll, C.many0(operator), parser);
}

function prefix3(operator, parser) {
    /*
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (PrefixNode a b)
    */
    function reverseApplyAll(os, x) {
        for (var i = os.length - 1; i >= 0; i--) {
            x = new PrefixNode(os[i], x);
        }
        return x;
    }
    return C.app(reverseApplyAll, C.many0(operator), parser);
}

function postfix(operator, parser) {
    /*
    Parser e s (m t) (a -> a) -> Parser e s (m t) a -> Parser e s (m t) a
    */
    function f(o, os) {
        return function inner(a) {
            return os(o(a));
        };
    }
    var rest = C.error('undefined');
    rest.parse = C.alt(C.app(f, operator, rest), C.pure(id)).parse;
    return C.app(flipApply, parser, rest);
}

function postfix2(operator, parser) {
    /*
    Parser e s (m t) (a -> a) -> Parser e s (m t) a -> Parser e s (m t) a
    */
    function applyAll(x, fs) {
        for (var i = 0; i < fs.length; i++) {
            x = fs[i](x);
        }
        return x;
    }
    return C.app(applyAll, parser, C.many0(operator));
}

function postfix3(operator, parser) {
    /*
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (PostfixNode a b)
    */
    function applyAll(x, os) {
        for (var i = 0; i < os.length; i++) {
            x = new PostfixNode(os[i], x);
        }
        return x;
    }
    return C.app(applyAll, parser, C.many0(operator));
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

module.exports = {
    'chainL': chainL,
    'chainL2': chainL2,
    'chainL3': chainL3,
    'chainR': chainR,
    'chainR2': chainR2,
    'chainR3': chainR3,
    'prefix': prefix,
    'prefix2': prefix2,
    'prefix3': prefix3,
    'postfix': postfix,
    'postfix2': postfix2,
    'postfix3': postfix3,
    
    'dump': dump,
};
