var List = (function() {
    "use strict";

    function isArray(v) {
        return (typeof v !== 'string') && (v.length !== undefined);
    }

    function List(value) {
        if(!isArray(value)) {
            throw new Error('type error -- needs array');
        }
        this.value = value;
    }
    
    List.pure = function(x) {
        return new List([x]);
    };
    
    List.prototype.fmap = function(f) {
        return new List(this.value.map(f)); // 'map' is dangerous due to extra parameters
    };
    
    List.prototype.ap = function(y) {
        var vals = [];
        this.value.map(function(f) {
            y.value.map(function(x) {
                vals.push(f(x));
            });
        });
        return new List(vals);
    }
    
    List.prototype.bind = function(f) {
        var vals = [];
        this.value.map(function(v) {
            f(v).map(function(x) {
                vals.push(x);
            });
        });
        return new List(vals);
    }
    
    List.prototype.plus = function(that) {
        var left = this.value.slice();
        that.value.map(function(x) {
            left.push(x);
        });
        return new List(left);
    };
    
    List.zero = new List([]);
        
    return List;

})();