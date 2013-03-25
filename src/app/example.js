define(["app/parser"], function(Parser) {
    "use strict";

    var eg1 = Parser.all([Parser.literal('a'), Parser.get, Parser.getState, Parser.putState(13), Parser.literal('b')]);

    var Braces = (function() {
        
        function Braces(opens) {
            this.opens = opens;
        }
        
        Braces.prototype.push = function(b) {
            var newBs = this.opens.slice();
            newBs.push(b);
            return new Braces(newBs);
        };
        
        Braces.prototype.pop = function() {
            if(this.opens.length === 0) {
                return false;
            }
            var butLast = this.opens.slice(0, this.opens.length - 1),
                last = this.opens[this.opens.length - 1];
            return [last, new Braces(butLast)];
        };
        
        return Braces;
        
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
                var newBs = bs.pop();
                if(!newBs) {return Parser.error({message: "unmatched brace", brace: t});}
                var top = newBs[0],
                    rest = newBs[1];
                if(!top) {alert("oops .... unexpected error");}
                if ( matches(top, t) ) {
                    return Parser.putState(rest).seq2R(Parser.pure(t));
                }
                return Parser.error({message: 'mismatched braces', open: top, close: t});
            });
        }
        
        var OS = {'{': 1, '(': 1, '[': 1},
            CS = {'}': 1, ')': 1, ']': 1};
        
        var open = Parser.item.check(function(t) {return t[0] in OS;}).bind(pushToken),
            close = Parser.item.check(function(t) {return t[0] in CS;}).bind(popToken),
            normalChar = open.plus(close).not1().fmap(function(t) {return t[0];});
            
        var form = new Parser(function() {}); // forward declaration to allow recursion
        
        var block = open.bind(function(o) {
            return Parser.app(
                function(fs, cl) {
                    return {type: 'block', start: o.slice(1), forms: fs, end: cl.slice(1)};
                },
                form.many0(),
                close.commit({message: 'unmatched brace', brace: o}));
        });
        
        form.parse = normalChar.plus(block).parse; // set 'form' to its actual value
        
        var parser = form.many0();
        
        return parser;

    })();

    var str = "abc{\nd{derr}ef}g\nh}ib{largh".split(''),
        toks = addLineCol(str),
        toks2 = addLineCol("abcde");

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
        return BlockParser.parse(new Braces([]), addLineCol(str));
    }
    
    return {
        'Parser': Parser,
        'Braces': Braces,
        'BlockParser': BlockParser,
        'addLineCol' : addLineCol,
        'example' : example
    };
});