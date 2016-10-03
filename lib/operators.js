"use strict";

const C = require('./combinators');

const checkParser = C.checkParser;

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

function constructR(left, pairs) {
    if ( pairs.length === 0 ) {
        return left;
    } else {
        const [[op, right], ...restPairs] = pairs;
        return new BinaryNode(op, left, constructR(right, restPairs));
    }
}

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (BinaryNode a b)
function chainR(operator, parser) {
    checkParser('chainR', operator);
    checkParser('chainR', parser);
    return C.app(([first, pairs]) => constructR(first, pairs), C.sepBy1(parser, operator));
}

function constructL(first, pairs) {
    return pairs.reduce((left, [op, right]) => new BinaryNode(op, left, right), first);
}

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (BinaryNode a b)
function chainL(operator, parser) {
    checkParser('chainL', operator);
    checkParser('chainL', parser);
    return C.app(([first, pairs]) => constructL(first, pairs), C.sepBy1(parser, operator));
}

function constructPrefix(operators, value) {
    return operators.reduceRight((accum, op) => new PrefixNode(op, accum), value);
}

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (PrefixNode a b)
function prefix(operator, parser) {
    checkParser('prefix', operator);
    checkParser('prefix', parser);
    return C.app(constructPrefix, C.many0(operator), parser);
}

function constructPostfix(value, operators) {
    return operators.reduce((accum, op) => new PostfixNode(op, accum), value);
}

// Parser e s (m t) a -> Parser e s (m t) b -> Parser e s (m t) (PostfixNode a b)
function postfix(operator, parser) {
    checkParser('postfix', operator);
    checkParser('postfix', parser);
    return C.app(constructPostfix, parser, C.many0(operator));
}

module.exports = {
    'BinaryNode' : BinaryNode,
    'PrefixNode' : PrefixNode,
    'PostfixNode': PostfixNode,
    
    'chainL' : chainL,
    'chainR' : chainR,
    'prefix' : prefix,
    'postfix': postfix,
    
    'constructL'      : constructL,
    'constructR'      : constructR,
    'constructPrefix' : constructPrefix,
    'constructPostfix': constructPostfix,
    
    'dump': dump,
};
