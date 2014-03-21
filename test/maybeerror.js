define([
    "unparse-js/maybeerror"
], function(M) {
    
    return function() {
    
        module("maybeerror");
        
        function inc(x) {
            return x + 1;
        }
        
        function f_b(x){
            if (x == 3) {
                return M.pure(x + 1);
            } else if (x == 4) {
                return M.zero;
            }
            return M.error('e1');
        }
        
        function f_a(x, y, z) {
            return [x, z, y, z];
        }
        
        var g1 = M.pure('g1'),
            g2 = M.pure('g2'),
            g3 = M.pure(3),
            g4 = M.pure(4),
            e1 = M.error('e1'),
            e2 = M.error('e2'),
            e3 = M.error(3),
            e4 = M.error(4),
            b1 = M.zero;
        
        
        test("testPure", function() {
            deepEqual(g1.value, 'g1');
            deepEqual(g1.status, 'success');
        });
        
        test("testZero", function() {
            deepEqual(b1.value, undefined);
            deepEqual(b1.status, 'failure');
        });
        
        test("testError", function() {
            deepEqual(e1.value, 'e1');
            deepEqual(e1.status, 'error');
        });
    
        test("testConstructors", function() {
            deepEqual(g1, new M('success', 'g1'));
            deepEqual(b1, new M('failure', undefined));
            deepEqual(e1, new M('error', 'e1'));
        });
        
        test("testEquality", function() {
            deepEqual(g1, g1);
            deepEqual(b1, b1);
            deepEqual(e1, e1);
        });

/* may need to upgrade QUnit version to get this working            
        test("testInequality", function() {
            deepNotEqual(g1, g2);
            deepNotEqual(g1, b1);
            deepNotEqual(g1, e1);
            deepNotEqual(b1, g1);
            deepNotEqual(b1, e1);
            deepNotEqual(e1, g1);
            deepNotEqual(e1, b1);
            deepNotEqual(e1, e2);
        });
*/
        
        test("testFmap", function() {
            deepEqual(g3.fmap(inc), g4);
            deepEqual(b1.fmap(inc), b1);
            deepEqual(e3.fmap(inc), e3);
        });
        
        test("testBind", function() {
            deepEqual(g2.bind(f_b), e1);
            deepEqual(g3.bind(f_b), g4);
            deepEqual(g4.bind(f_b), b1);
            deepEqual(b1.bind(f_b), b1);
            deepEqual(e1.bind(f_b), e1);
        });
        
        test("testApp", function() {
            // apply over lots of success
            deepEqual(M.app(f_a, g1, g2, g3), M.pure(['g1', 3, 'g2', 3]));
            // short-circuit zero
            deepEqual(M.app(f_a, g1, b1, g2), b1);
            // short-circuit error
            deepEqual(M.app(f_a, g1, g3, e1), e1);
        });
        
        test("testPlus", function() {
            // good + x -> good (left-biased)
            deepEqual(g1.plus(g2), g1);
            deepEqual(g1.plus(b1), g1);
            deepEqual(g1.plus(e1), g1);
            // bad + x -> x
            deepEqual(b1.plus(g1), g1);
            deepEqual(b1.plus(b1), b1);
            deepEqual(b1.plus(e1), e1);
            // error + x -> error (left-biased)
            deepEqual(e1.plus(g1), e1);
            deepEqual(e1.plus(b1), e1);
            deepEqual(e1.plus(e2), e1);
        });
        
        test("testMapError", function() {
            deepEqual(g1.mapError(inc), g1);
            deepEqual(b1.mapError(inc), b1);
            deepEqual(e3.mapError(inc), e4);
        });
        
    };

});