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

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (BinaryNode a b)
function chainR(operator, parser) {
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

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (BinaryNode a b)
function chainL(operator, parser) {
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

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (PrefixNode a b)
function prefix(operator, parser) {
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

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (PostfixNode a b)
function postfix(operator, parser) {
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

module.exports = {
    'chainL': chainL,
    'chainR': chainR,
    'prefix': prefix,
    'postfix': postfix,
    
    'dump': dump,
};
