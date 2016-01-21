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
    var ops = C.bind(C.app(f, [parser, operator]), function(g) {
            return C.bind(chainR(operator, parser), function(x) {
                return C.pure(g(x));
            });
        });
    return C.alt([ops, parser]);
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
    rest.parse = C.alt([C.app(f, [operator, parser, rest]), C.pure(id)]).parse;
    return C.app(flipApply, [parser, rest]);
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

function prefix(operator, parser) {
    /*
    Parser e s (m t) (a -> a) -> Parser e s (m t) a -> Parser e s (m t) a
    */
    // using bind instead of `C.appP(operator, prefix(operator, parser))` to avoid infinite recursion
    var recurse = C.bind(operator, function(f) {
            return C.fmap(f, prefix(operator, parser));
        });
    return C.alt([recurse, parser]);
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
    return C.app(reverseApplyAll, [C.many0(operator), parser]);
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
    rest.parse = C.alt([C.app(f, [operator, rest]), C.pure(id)]).parse;
    return C.app(flipApply, [parser, rest]);
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
    return C.app(applyAll, [parser, C.many0(operator)]);
}

module.exports = {
    'chainL': chainL,
    'chainL2': chainL2,
    'chainR': chainR,
    'chainR2': chainR2,
    'prefix': prefix,
    'prefix2': prefix2,
    'postfix': postfix,
    'postfix2': postfix2,
};
