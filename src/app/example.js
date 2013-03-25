define(["app/parser"], function(Parser) {
    "use strict";

    var eg1 = Parser.all([Parser.literal('a'), Parser.get, Parser.getState, Parser.putState(13), Parser.literal('b')]);
    
    var Stack = (function() {
    
        function Stack(elem, rest) {
            this.elem = elem;
            this.rest = rest;
        }
        
        var empty = new Stack(undefined, undefined);
        empty.isEmpty = true;
        Stack.empty = empty;
        
        Stack.prototype.push = function(elem) {
            return new Stack(elem, this);
        };
        
        Stack.prototype.pop = function() {
            if ( this.isEmpty ) {
                throw new Error("can't pop empty stack");
            }
            return [this.elem, this.rest];
        };
        
        // top of stack (i.e. the business end) corresponds to the end of the array
        Stack.fromArray = function(elems) {
            var stack = empty;
            elems.map(function(e) {
                stack = stack.push(e);
            });
            return stack;
        };
        
        Stack.prototype.toArray = function() {
            var stack = this,
                elems = [],
                popped;
            while(!stack.isEmpty) {
                popped = stack.pop();
                elems.unshift(popped[0]);
                stack = popped[1];
            }
            return elems;
        };
        
        return Stack;
        
    })();
        
    var BlockParser = (function () {
        
        function eq(a, b) {
            return a === b[0];
        }
        
        function pushToken(t) {
            return Parser.updateState(function(bs) {
                return bs.push(t);
            }).seq2R(Parser.pure(t));
        }
        
        function matches(open, close) {
            var o = open[0],
                c = close[0];
            var ms = { '{' : '}', '(': ')', '[': ']'};
            return ms[o] === c;
        }        
        
        function popToken(t) {
            return Parser.getState.bind(function(bs) {
                if ( bs.isEmpty ) {
                    return Parser.error({message: "unmatched close brace", brace: t});
                }
                var newBs = bs.pop();
                var top = newBs[0],
                    rest = newBs[1];
                if ( matches(top, t) ) {
                    return Parser.putState(rest).seq2R(Parser.pure(t));
                }
                return Parser.error({message: 'mismatched braces', open: top, close: t});
            });
        }
        
        var OS = {'{': 1, '(': 1, '[': 1},
            CS = {'}': 1, ')': 1, ']': 1};
        
        var open = Parser
                .item                  // consume a token
                .check(function(t) {   // see if it's an opening brace
                    return t[0] in OS;
                })
                .bind(pushToken),      // update the state
            close = Parser
                .item
                .check(function(t) {
                    return t[0] in CS;
                })
                .bind(popToken),
            normalChar = open
                .plus(close)
                .not1()
                .fmap(function(t) {return t[0];});
            
        var form = new Parser(function() {}); // forward declaration to allow recursion
        
        var block = open.bind(function(o) {
            return Parser.app(
                function(fs, cl) { // looks like the slices are for grabbing the line/column info
                    return {type: 'block', start: o.slice(1), forms: fs, end: cl.slice(1)};
                },
                form.many0(),
                close.commit({message: 'unmatched open brace', brace: o}));
        });
        
        form.parse = normalChar.plus(block).parse; // set 'form' to its actual value
        
        var parser = form.many0();
        
        return parser;

    })();

    function addLineCol(str) {
        var toks = [],
            line = 1, 
            column = 1;
        for(var i = 0; i < str.length; i++) {
            toks.push([str[i], line, column]);
            column++;
            if(str[i] === '\n') {line++; column = 1;}
        }
        return toks;
    }

    function example(str) {
        return BlockParser.parse(addLineCol(str), Stack.fromArray([]));
    }
    
    return {
        'Parser': Parser,
        'Stack' : Stack,
        'BlockParser': BlockParser,
        'addLineCol' : addLineCol,
        'example' : example
    };
});