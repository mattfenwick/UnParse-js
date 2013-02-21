var MaybeError = (function() {
    "use strict";

    var STATUSES = {
        'success': 1,
        'failure': 1,
        'error'  : 1
    };

    function ME(status, value) {
        if(!(status in STATUSES)) {
            throw new Error('invalid MaybeError constructor name: ' + status);
        }
        this.status = status;
        this.value = value;
    }
    
    ME.prototype.fmap = function(f) {
        if(this.status === 'success') {
            return new ME('success', f(this.value));
        }
        return this;
    };
    
    ME.pure = function(x) {
        return new ME('success', x);
    };
    
    ME.prototype.ap = function(y) {
        if(this.status === 'success') {
            return y.fmap(this.value);
        }
        return this;
    }
    
    ME.prototype.bind = function(f) {
        if(this.status === 'success') {
            return f(this.value);
        }
        return this;
    }
    
    ME.error = function(e) {
        return new ME('error', e);
    };
    
    ME.prototype.mapError = function(f) {
        if(this.status === 'error') {
            return ME.error(f(this.value));
        }
        return this;
    };
    
    ME.prototype.plus = function(that) {
        if(this.status === 'failure') {
            return that;
        }
        return this;
    };
    
    ME.zero = new ME('failure', undefined);
        
    return ME;

})();





var Parser = (function () {
    "use strict";

    // ([t] -> m ([t], a)) -> Parser m t a
    function Parser(f) {
        this.parse = f;
    }
    
    function reportError(fName, type, expected, actual) {
        throw new Error(JSON.stringify({type: type, function: fName,
               expected: expected, actual: actual}));
    }
    
    // (a -> b) -> Parser t a -> Parser t b
    Parser.prototype.fmap = function(f) {
        if(typeof f !== 'function') {
            reportError('fmap', 'TypeError', 'function', f);
        }
        var self = this;
        return new Parser(function(xs) {
            return self.parse(xs).fmap(function(r) {
                return {
                    rest: r.rest,
                    result: f(r.result)
                };
            });
        });
    };
    
    // a -> Parser t a
    Parser.pure = function(x) {
        return new Parser(function(xs) {
            return MaybeError.pure({rest: xs, result: x});
        });
    };
    
    // skipping Applicative ... for now
    
    // m a -> (a -> m b) -> m b
    // ([t] -> m ([t], a)) -> (a -> [t] -> m ([t], b)) -> [t] -> m ([t], b)
    Parser.prototype.bind = function(f) {
        if(typeof f !== 'function') {
            reportError('bind', 'TypeError', 'function', f);
        }
        var self = this;
        return new Parser(function(xs) {
            var r = self.parse(xs);
            if(r.status === 'success') {
                return f(r.value.result).parse(r.value.rest);
            }
            return r;
        });
    };
    
    Parser.prototype.plus = function(that) {
        if(!(that instanceof Parser)) {
            reportError('plus', 'TypeError', 'Parser', that);
        }
        var self = this;
        return new Parser(function(xs) {
            return self.parse(xs).plus(that.parse(xs));
        });
    };
    
    Parser.zero = new Parser(function(xs) {
        return MaybeError.zero;
    });
    
    // Parser [t] t a
    Parser.error = function(value) {
        return new Parser(function(xs) {
            return MaybeError.error(value);
        });
    };
    
    // (e -> m) -> Parser e t a -> Parser m t a
    Parser.prototype.mapError = function(f) {
        if(typeof f !== 'function') {
            reportError('mapError', 'TypeError', 'function', f);
        }
        var self = this;
        return new Parser(function(xs) {
            return self.parse(xs).mapError(f);
        });
    };
    
    // Parser t [t]
    Parser.get = new Parser(function(xs) {
        return MaybeError.pure({rest: xs, result: xs});
    });
    
    // [t] -> Parser t ()   // just for completeness
    Parser.put = function(xs) {
        return new Parser(function() {
            return MaybeError.pure({rest: xs, result: null});
        });
    };

    // Parser t t
    Parser.item = new Parser(function(xs) {
        if(xs.length === 0) {
            return MaybeError.zero;
        }
        var x = xs[0];
        return MaybeError.pure({rest: xs.slice(1), result: x});
    });
    
    // (a -> Bool) -> Parser t a -> Parser t a
    Parser.prototype.check = function(p) {
        if(typeof p !== 'function') {
            reportError('check', 'TypeError', 'function', p);
        }
        var self = this;
        return new Parser(function(xs) {
            var r = self.parse(xs);
            if(r.status !== 'success') {
                return r;
            } else if(p(r.value.result)) {
                return r;
            }
            return MaybeError.zero;
        });
    };
    
    function equality(x, y) {
        return x === y;
    }

    // t -> Maybe (t -> t -> Bool) -> Parser t t    
    Parser.literal = function(x, f) {
        var eq = f ? f : equality;
        if(typeof eq !== 'function') {
            reportError('literal', 'TypeError', 'function', eq);
        }
        return Parser.item.check(function (y) {
                                     return eq(x, y);
                                 });
    };
    
    // (t -> Bool) -> Parser t t
    Parser.satisfy = function(pred) {
        if(typeof pred !== 'function') {
            reportError('satisfy', 'TypeError', 'function', pred);
        }
        return Parser.item.check(pred);
    };
    
    // Parser t a -> Parser t [a]
    Parser.prototype.many0 = function() {
        var self = this;
        return new Parser(function(xs) {
            var vals = [],
                tokens = xs,
                r;
            while(true) {
                r = self.parse(tokens);
                if(r.status === 'success') {
                    vals.push(r.value.result);
                    tokens = r.value.rest;
                } else if(r.status === 'failure') {
                    return MaybeError.pure({rest: tokens, result: vals});
                } else { // must respect errors
                    return r;
                }
            }
        });
    };
    
    // Parser t a -> Parser t [a]
    Parser.prototype.many1 = function() {
        return this.many0().check(function(x) {return x.length > 0;});
    };

    // (a -> b -> ... z) -> (Parser t a, Parser t b, ...) -> Parser t z
    // example:   app(myFunction, parser1, parser2, parser3, parser4)
    Parser.app = function(f, ps__) {
        var p = Parser.all(Array.prototype.slice.call(arguments, 1));
        return p.fmap(function(rs) {
            return f.apply(undefined, rs); // 'undefined' gets bound to 'this' inside f
        });
    };
    
    // a -> Parser t a -> Parser t a
    Parser.prototype.optional = function(x) {
        return this.plus(Parser.pure(x));
    };
    
    // [Parser t a] -> Parser t [a]
    Parser.all = function(ps) {
        ps.map(function(p) {
            if(!(p instanceof Parser)) {
                reportError('all', 'TypeError', 'Parser', p);
            }
        });
        return new Parser(function(xs) {
            var vals = [],
                i, r,
                tokens = xs;
            for(i = 0; i < ps.length; i++) {
                r = ps[i].parse(tokens);
                if(r.status === 'error') {
                    return r;
                } else if(r.status === 'success') {
                    vals.push(r.value.result);
                    tokens = r.value.rest;
                } else {
                    return MaybeError.zero;
                }
            }
            return MaybeError.pure({rest: tokens, result: vals});
        });
    };
    
    // Parser t a -> Parser t ()
    Parser.prototype.not0 = function() {
        var self = this;
        return new Parser(function(xs) {
            var r = self.parse(xs);
            if(r.status === 'error') {
                return r;
            } else if(r.status === 'success') {
                return MaybeError.zero;
            } else {
                return MaybeError.pure({rest: xs, result: null}); // or undefined?  ???
            }
        });
    };
    
    // Parser t a -> Parser t t
    Parser.prototype.not1 = function() {
        return this.not0().seq2R(Parser.item);
    };
    
    // e -> Parser e t a
    Parser.prototype.commit = function(e) {
        return this.plus(Parser.error(e));
    };
    
    Parser.prototype.seq2L = function(p) {
        if(!(p instanceof Parser)) {
            reportError('seq2L', 'TypeError', 'Parser', p);
        }
        return Parser.all([this, p]).fmap(function(x) {return x[0];});
    };
    
    Parser.prototype.seq2R = function(p) {
        if(!(p instanceof Parser)) {
            reportError('seq2R', 'TypeError', 'Parser', p);
        }
        return Parser.all([this, p]).fmap(function(x) {return x[1];});
    };
    
    // purpose:  '[].map' passes in index also
    //   which messed up literal because it
    //   expects 2nd arg to be a function or undefined
    // this function ensures that doesn't happen
    function safeMap(array, f) {
        var out = [], i;
        for(i = 0; i < array.length; i++) {
            out.push(f(array[i]));
        }
        return out;
    }
    
    // [t] -> Parser t [t]
    // n.b.:  [t] != string !!!
    Parser.string = function(str) {
        return Parser.all(safeMap(str, Parser.literal)).seq2R(Parser.pure(str));
    };

    // [Parser t a] -> Parser t a
    Parser.any = function (ps) {
        ps.map(function(p) {
            if(!(p instanceof Parser)) {
                reportError('any', 'TypeError', 'Parser', p);
            }
        });
        return new Parser(function(xs) {
            var r = MaybeError.zero,
                i;
            for(i = 0; i < ps.length; i++) {
                r = ps[i].parse(xs);
                if(r.status === 'success' || r.status === 'error') {
                    return r;
                }
            }
            return r;
        });
    };
    
    return Parser;
    
})();



var BlockParser = (function () {
    "use strict";
    
    var open = Parser.literal("{"),
        close = Parser.literal("}"),
        normalChar = open.plus(close).not1();
        
    var form = new Parser(function() {}); // forward declaration to allow recursion
    
    var block = open
        .seq2R(form.many1().optional())
        .seq2L(close);
    
    form.parse = normalChar.plus(block).parse; // set 'form' to its actual value
    
    var parser = form.many0();
    
    return parser;

})();