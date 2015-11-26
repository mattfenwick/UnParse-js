"use strict";

var C = require('./combinators');

var checkParser = C.checkParser;

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
//    return JSON.stringify(x);
    return x;
}

function chainR(operator, parser) {
    /*
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (BinaryNode a b)
    */
    checkParser('chainR', operator);
    checkParser('chainR', parser);
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
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (BinaryNode a b)
    */
    checkParser('chainL', operator);
    checkParser('chainL', parser);
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
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (PrefixNode a b)
    */
    checkParser('prefix', operator);
    checkParser('prefix', parser);
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
    Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (PostfixNode a b)
    */
    checkParser('postfix', operator);
    checkParser('postfix', parser);
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
    'chainR': chainR,
    'prefix': prefix,
    'postfix': postfix,
    
    'dump': dump,
};
