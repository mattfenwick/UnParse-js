define(function() {
    "use strict";

    function ParserFactory(Type) {
        
        // ([t] -> s -> ME e (a, [t], s)) -> Parser t e s a
        function Parser(f) {
            this.parse = f;
        }
        
        function reportError(fName, type, expected, actual) {
            throw new Error(JSON.stringify({type: type, function: fName,
                   expected: expected, actual: actual}));
        }

        function result(value, rest, state) {
            return {state: state, rest: rest, result: value};
        }
        
        function good(value, rest, state) {
            return Type.pure(result(value, rest, state));
        }

        
        // Parser t e s t
        Parser.item = new Parser(function(xs, s) {
            if(xs.length === 0) {
                return Type.zero;
            }
            var x = xs[0];
            return good(x, xs.slice(1), s);
        });
        
        // (a -> b) -> Parser t e s a -> Parser t e s b
        Parser.prototype.fmap = function(f) {
            if(typeof f !== 'function') {
                reportError('fmap', 'TypeError', 'function', f);
            }
            var self = this;
            return new Parser(function(xs, s) {
                return self.parse(xs, s).fmap(function(r) {
                    return result(f(r.result), r.rest, r.state);
                });
            });
        };
        
        // a -> Parser t e s a
        Parser.pure = function(x) {
            return new Parser(function(xs, s) {
                return good(x, xs, s);
            });
        };
        
        // skipping Applicative ... for now
        
        // Parser t e s a -> (a -> Parser t e s b) -> Parser t e s b
        Parser.prototype.bind = function(f) {
            if(typeof f !== 'function') {
                reportError('bind', 'TypeError', 'function', f);
            }
            var self = this;
            return new Parser(function(xs, s) {
                var r = self.parse(xs, s),
                    val = r.value;
                if(r.status === 'success') {
                    return f(val.result).parse(val.rest, val.state);
                }
                return r;
            });
        };
        
        // Parser t e s a -> Parser t e s a -> Parser t e s a
        Parser.prototype.plus = function(that) {
            if(!(that instanceof Parser)) {
                reportError('plus', 'TypeError', 'Parser', that);
            }
            var self = this;
            return new Parser(function(xs, s) {
                return self.parse(xs, s).plus(that.parse(xs, s));
            });
        };
        
        // Parser t e s a
        Parser.zero = new Parser(function(xs, s) {
            return Type.zero;
        });
        
        // e -> Parser t e s a
        Parser.error = function(value) {
            return new Parser(function(xs, s) {
                return Type.error(value);
            });
        };
        
        // (e1 -> e2) -> Parser t e1 s a -> Parser t e2 s a
        Parser.prototype.mapError = function(f) {
            if(typeof f !== 'function') {
                reportError('mapError', 'TypeError', 'function', f);
            }
            var self = this;
            return new Parser(function(xs, s) {
                return self.parse(xs, s).mapError(f);
            });
        };
        
        // Parser t e s [t]
        Parser.get = new Parser(function(xs, s) {
            return good(xs, xs, s);
        });
        
        // [t] -> Parser t e s ()
        Parser.put = function(xs) {
            return new Parser(function(_xs_, s) {
                return good(null, xs, s);
            });
        };

        // Parser t e s s
        Parser.getState = new Parser(function(xs, s) {
            return good(s, xs, s);
        });

        // s -> Parser t e s ()
        Parser.putState = function(s) {
            return new Parser(function(xs, _s_) {
                return good(null, xs, s);
            });
        };
        
        // (s -> s) -> Parser t e s ()
        Parser.updateState = function(f) {
            return new Parser(function(xs, s) {
                return good(null, xs, f(s));
            });
        };
        // how about:
        //    Parser.getState.bind(function(s) {
        //        return Parser.putState(f(s));
        //    });
        // or:
        //    Parser.getState.bind(compose(Parser.putState, f))
        
        // (a -> Bool) -> Parser t e s a -> Parser t e s a
        Parser.prototype.check = function(p) {
            if(typeof p !== 'function') {
                reportError('check', 'TypeError', 'function', p);
            }
            var self = this;
            return new Parser(function(xs, s) {
                var r = self.parse(xs, s);
                if(r.status !== 'success') {
                    return r;
                } else if(p(r.value.result)) {
                    return r;
                }
                return Type.zero;
            });
        };
        
        function equality(x, y) {
            return x === y;
        }

        // t -> Maybe (t -> t -> Bool) -> Parser t e s t    
        Parser.literal = function(x, f) {
            var eq = f ? f : equality;
            if(typeof eq !== 'function') {
                reportError('literal', 'TypeError', 'function', eq);
            }
            return Parser.item.check(eq.bind(null, x));
        };
        
        // (t -> Bool) -> Parser t e s t
        Parser.satisfy = function(pred) {
            if(typeof pred !== 'function') {
                reportError('satisfy', 'TypeError', 'function', pred);
            }
            return Parser.item.check(pred);
        };
        
        // Parser t e s a -> Parser t e s [a]
        Parser.prototype.many0 = function() {
            var self = this;
            return new Parser(function(xs, s) {
                var vals = [],
                    tokens = xs,
                    state = s,
                    r;
                while(true) {
                    r = self.parse(tokens, state);
                    if(r.status === 'success') {
                        vals.push(r.value.result);
                        state = r.value.state;
                        tokens = r.value.rest;
                    } else if(r.status === 'failure') {
                        return good(vals, tokens, state);
                    } else { // must respect errors
                        return r;
                    }
                }
            });
        };
        
        // Parser t e s a -> Parser t e s [a]
        Parser.prototype.many1 = function() {
            return this.many0().check(function(x) {return x.length > 0;});
        };
        
        // [Parser t e s a] -> Parser t e s [a]
        Parser.all = function(ps) {
            ps.map(function(p) {
                if(!(p instanceof Parser)) {
                    reportError('all', 'TypeError', 'Parser', p);
                }
            });
            return new Parser(function(xs, s) {
                var vals = [],
                    i, r,
                    state = s,
                    tokens = xs;
                for(i = 0; i < ps.length; i++) {
                    r = ps[i].parse(tokens, state);
                    if(r.status === 'error') {
                        return r;
                    } else if(r.status === 'success') {
                        vals.push(r.value.result);
                        state = r.value.state;
                        tokens = r.value.rest;
                    } else {
                        return Type.zero;
                    }
                }
                return Type.pure({state: state, rest: tokens, result: vals});
            });
        };

        // (a -> ... z) -> (Parser t e s a, ...) -> Parser t e s z
        // example:   app(myFunction, parser1, parser2, parser3, parser4)
        Parser.app = function(f, ps__) {
            var p = Parser.all(Array.prototype.slice.call(arguments, 1));
            return p.fmap(function(rs) {
                return f.apply(undefined, rs); // 'undefined' gets bound to 'this' inside f
            });
        };
        
        // a -> Parser t e s a -> Parser t e s a
        Parser.prototype.optional = function(x) {
            return this.plus(Parser.pure(x));
        };
        
        // Parser t e s a -> Parser t e s ()
        Parser.prototype.not0 = function() {
            var self = this;
            return new Parser(function(xs, s) {
                var r = self.parse(xs, s);
                if(r.status === 'error') {
                    return r;
                } else if(r.status === 'success') {
                    return Type.zero;
                } else {
                    return good(null, xs, s);
                }
            });
        };
        
        // Parser t e s a -> Parser t e s t
        Parser.prototype.not1 = function() {
            return this.not0().seq2R(Parser.item);
        };
        
        // Parser t e s a -> e -> Parser t e s a
        Parser.prototype.commit = function(e) {
            return this.plus(Parser.error(e));
        };
        
        // Parser t e s a -> Parser t e s b -> Parser t e s a
        Parser.prototype.seq2L = function(p) {
            if(!(p instanceof Parser)) {
                reportError('seq2L', 'TypeError', 'Parser', p);
            }
            return Parser.all([this, p]).fmap(function(x) {return x[0];});
        };
        
        // Parser t e s a -> Parser t e s b -> Parser t e s b
        Parser.prototype.seq2R = function(p) {
            if(!(p instanceof Parser)) {
                reportError('seq2R', 'TypeError', 'Parser', p);
            }
            return Parser.all([this, p]).fmap(function(x) {return x[1];});
        };
        
        // [t] -> Parser t e s [t]
        Parser.string = function(str, f) {
            var ps = [];
            for(var i = 0; i < str.length; i++) {
                ps.push(Parser.literal(str[i], f));
            }
            return Parser.all(ps).seq2R(Parser.pure(str));
        };

        // [Parser t e s a] -> Parser t e s a
        Parser.any = function (ps) {
            ps.map(function(p) {
                if(!(p instanceof Parser)) {
                    reportError('any', 'TypeError', 'Parser', p);
                }
            });
            return new Parser(function(s, xs) {
                var r = Type.zero,
                    i;
                for(i = 0; i < ps.length; i++) {
                    r = ps[i].parse(s, xs);
                    if(r.status === 'success' || r.status === 'error') {
                        return r;
                    }
                }
                return r;
            });
        };
        
        return Parser;
        
    };
    
    return ParserFactory;
});
