// tasks:
//    integer portion of number: no leading 0's (except for the number 0)
//    no number overflow/underflow
//    no duplicate keys in maps
//    number literals to numbers
//    no illegal control characters in strings
//    escape sequences from strings are valid
//    unicode escape sequences to chars
//    characters to chars
//    escapes to chars
//    join up string literal

define(function() {
    "use strict";

    var _escapes = {'"': '"',  '\\': '\\', 
                    '/': '/',  'b': '\b' ,
                    'f': '\f', 'n': '\n' ,
                    'r': '\r', 't': '\t'  };
    
    function concat(first, second) {
        second.map(function(e) {
            first.push(e);
        });
    }
    
    function make_error(element, message, text, position) {
        return {
            'element' : element ,
            'message' : message ,
            'text'    : text    ,
            'position': position
        };
    }
    
    function ret_err(errors, value) {
        return {
            'errors': errors,
            'value': value
        };
    }
    
    function t_char(node) {
        var val = node.value;
        if ( node._name === 'unicode escape' ) {
            var char = String.fromCharCode(parseInt(val.join(''), 16));
            return ret_err([], char);
        } else if ( node._name === 'escape' ) {
            if ( !(val in _escapes) ) {
                throw new Error('invalid character escape -- ' + val);
            }
            return ret_err([], _escapes[val]);
        } else if ( node._name === 'character' ) {
            return ret_err([], val);
        }
        throw new Error('invalid character node type -- ' + node._name);
    }
    
    function t_string(node) {
        var errors = [],
            chars = [];
        node.value.map(function(t) {
            var c = t_char(t);
            concat(errors, c.errors);
            chars.push(c.value);
        });
        // a little hack -- if there's any errors, don't report a real value
        if ( errors.length > 0 ) {
            return ret_err(errors, undefined);
        } else {
            return ret_err(errors, chars.join(''));
        }
    }
    
    function format_number(sign, i, d, exp) {
        return [sign, i, d ? ( '.' + d ) : '', exp].join(''); 
    }
    
    function t_number(node) {
        // check that node _name is number (optional)
        var errors = [],
            sign = node.sign ? node.sign : '',
            i = [node.integer.first].concat(node.integer.rest).join(''),
            pos = node._state;
        var d = node.decimal ? node.decimal.digits.join('') : '', 
            exp = '';
        if ( node.exponent ) {
            exp += node.exponent.letter;
            if ( node.exponent.sign ) {
                exp += node.exponent.sign;
            }
            exp += node.exponent.power.join('');
        }
        var val = [sign, i, '.', d, exp].join(''),
            // convert to a float
            num = parseFloat(val);
        // check for overflow
        if ( num === Infinity || num === -Infinity ) {
            errors.push(make_error('number', 
                                   'overflow', 
                                   format_number(sign, i, d, exp), 
                                   pos));
        }
        // underflow check may be incorrect:
        // ??? false negatives ??? other IEEE 0's or NaN's or something ???
        if ( num === 0 && node.exponent ) {
            errors.push(make_error('number', 
                                   'possible underflow', 
                                   format_number(sign, i, d, exp), 
                                   pos));
        }
        console.log('val: ' + val);
        return ret_err(errors, num);
    }
    
    var _keywords = {
            'true' : true,
            'false': false,
            'null' : null
        };
    
    // invalid keywords aren't parsed, so this is really kind of a 
    //   sanity check more than something that's expected to happen
    function t_keyword(node) {
        if ( node.value in _keywords ) {
            return ret_err([], _keywords[node.value]);
        }
        return ret_err([make_error('keyword', 'invalid keyword', node.value, node._state)],
                       undefined);
    }
    
    function t_array(node) {
        var errors = [],
            vals = [];
        node.body.values.map(function(v) {
            var e = t_value(v);
            concat(errors, e.errors);
            vals.push(e.value);
        });
        return ret_err(errors, vals); // array position not important
    }
    
    function t_pair(node) {
        var errors = [],
            s = t_string(node.key),
            v = t_value(node.value);
        concat(errors, s.errors);
        concat(errors, v.errors);
        var kv_pair = [s.value, v.value];
        return ret_err(errors, kv_pair); // key/val position unimportant
    }
    
    function t_build_object(pairs) {
        var errors = [],
            obj = {},
            positions = {},
            seen_twice = {};
        pairs.map(function(pair) {
            var p = t_pair(pair),
                key = p.value[0];
            concat(errors, p.errors);
            if ( key in positions ) {
                seen_twice[key] = true;
            } else {
                positions[key] = [];
                obj[key] = p.value[1];
            }
            positions[key].push(pair.key._state);
        });
        for (var key in seen_twice) {
            errors.push(make_error('object', 'duplicate key', key, positions[key]));
        }
        return ret_err(errors, obj);
    }

    function t_object(node) {
        return t_build_object(node.body.values); // what about the object position?
    }
    
    var _values = {
            'keyword': t_keyword,
            'number' : t_number ,
            'string' : t_string ,
            'array'  : t_array  ,
            'object' : t_object
        };
    
    function t_value(node) {
        return _values[node._name](node);
    }
    
    function t_json(node) {
        return t_value(node.value);
    }
    
    
    return {
        't_json'    : t_json,
        't_value'   : t_value,
        'make_error': make_error,
        'ret_err'   : ret_err,
        't_char'    : t_char
    };
    
});
