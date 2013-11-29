define([
    "unparse-js/cst", 
    "unparse-js/combinators", 
    "unparse-js/maybeerror"
], function(Cst, C, M) {
    "use strict";

    return function() {
        var cut = Cst.cut, addError = Cst.addError, node = Cst.node;
        var basic = C.basic, zero = C.zero, error = C.error, count = C.count;
        var err = M.error;
        
        function good(rest, state, result) {
            return M.pure({
                'rest': rest,
                'state': state,
                'result': result
            });
        }
        
        function cstnode(name, state) {
            var pairs = Array.prototype.slice.call(arguments, 2),
                obj = {'_name': name, '_state': state};
            pairs.map(function(p) {
                obj[p[0]] = p[1];
            });
            return obj;
        }
    
        module("cst");
        
        test("CutSuccess", function() {
            deepEqual(cut('oops', basic.item).parse('abc', null), good('bc', null, 'a'));
        });
        
        test("CutFail", function() {
            deepEqual(cut('oops', zero).parse('abc', 12), err([['oops',12]]));
        });
        
        test("CutError", function() {
            deepEqual(cut('oops', error('err')).parse('abc', 12), err('err'));
        });
        
        test("AddErrorSuccess", function() {
            deepEqual(addError('oops', basic.item).parse('abc', null), 
                             good('bc', null, 'a'));
        });
    
        test("AddErrorFail", function() {
            deepEqual(addError('oops', zero).parse('abc', 12), 
                             M.zero);
        });
    
        test("AddErrorError", function() {
            deepEqual(addError('oops', error(['err'])).parse('abc', 12), 
                             err([['oops', 12], 'err']));
        });
    
        test("NodeSuccess", function() {
            deepEqual(node('blar').parse('abc', 17), 
                             good('abc', 17, cstnode('blar', 17)));
            deepEqual(node('blar', ['a', count.item]).parse('def', 17), 
                             good('ef', 18, cstnode('blar', 17, ['a', 'd'])));
            deepEqual(node('blar', ['a', count.item], ['b', count.item]).parse('def', 17), 
                             good('f', 19, cstnode('blar', 17, ['a', 'd'], ['b', 'e'])));
        });
        
        test("NodeFailure", function() {
            deepEqual(node('blar', ['a', zero]).parse('abc', 17),
                             M.zero);
        });
        
        test("NodeError", function() {
            deepEqual(node('blar', ['a', cut('oops', zero)]).parse('abc', 17), 
                             err([['blar', 17], ['oops', 17]]));
            deepEqual(node('blar', ['a', count.item], ['b', cut('oops', zero)]).parse('def', 17), 
                             err([['blar', 17], ['oops', 18]]));
        });
    };

});
