define(["app/maybeerror"], function(ME) {
    
    return function() {
    
        module("maybeerror");
        
        function f(x) {return x + 5;}

        function g(x) {
            if(x > 2) return ME.pure(x * 2);
            return ME.zero;
        }
        
        function h(x, y, z) {
            return x * y + z;
        }
        
        test("maybeerror", function() {
            var tests = [
                ['constructor -- success', new ME('success', [2, 'hi']),   ME.pure([2, 'hi'])],
                ['constructor -- success', [1,2,3],                        ME.pure([1,2,3]).value],
                ['constructor -- failure', new ME('failure'),              ME.zero],
                ['constructor -- failure', undefined,                      ME.zero.value],
                ['constructor -- error',   new ME('error', 'oopsy-daisy'), ME.error('oopsy-daisy')],
                ['constructor -- error',   'message',                      ME.error('message').value],
                ['fmap',         ME.pure(13),     ME.pure(8).fmap(f)       ],
                ['fmap',         ME.zero,         ME.zero.fmap(f)          ],
                ['fmap',         ME.error('abc'), ME.error('abc').fmap(f)  ],
                ['app',          ME.pure(10),     ME.app(h, ME.pure(2), ME.pure(3), ME.pure(4))],
                ['ap',           ME.zero,         ME.app(h, ME.pure(18), ME.zero)    ],
                ['ap',           ME.error(2),     ME.app(h, ME.pure(3), ME.error(2)) ],
                ['bind',         ME.pure(8),      ME.pure(4).bind(g)       ],
                ['bind',         ME.zero,         ME.pure(2).bind(g)       ],
                ['plus -- left-biased success',     ME.pure(3),       ME.pure(3).plus(ME.pure(4))], 
                ['plus -- left-biased error',       ME.error('left'), ME.error('left').plus(ME.error('right'))],
                ['plus -- left zero: return right', ME.pure(4),       ME.zero.plus(ME.pure(4))],
                ['plus',         ME.zero,         ME.zero.plus(ME.zero)    ],
                ['plus',         ME.pure(18),     ME.pure(18).plus(ME.error('right'))], 
                ['plus',         ME.error('left'), ME.error('left').plus(ME.pure(24))],
                ['mapError',     ME.pure(3),      ME.pure(3).mapError(f)   ],
                ['mapError',     ME.zero,         ME.zero.mapError(f)      ],
                ['mapError',     ME.error(13),    ME.error(8).mapError(f)  ]
            ];
            
            tests.map(function(x) {
                deepEqual(x[2], x[1], x[0]);
            });
        });
        
    };

});