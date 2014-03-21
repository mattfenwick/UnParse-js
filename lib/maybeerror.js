"use strict";

var STATUSES = {
    'success': 1,
    'failure': 1,
    'error'  : 1
};

function MaybeError(status, value) {
    if ( !(status in STATUSES) ) {
        throw new Error('invalid MaybeError constructor name: ' + status);
    }
    this.status = status;
    this.value = value;
}

MaybeError.pure = function(x) {
    return new MaybeError('success', x);
};

MaybeError.error = function(e) {
    return new MaybeError('error', e);
};

MaybeError.prototype.fmap = function(f) {
    if ( this.status === 'success' ) {
        return MaybeError.pure(f(this.value));
    }
    return this;
};

MaybeError.app = function(f) {
    var vals = Array.prototype.slice.call(arguments, 1),
        args = [];
    for(var i = 0; i < vals.length; i++) {
        if ( vals[i].status === 'success' ) {
            args.push(vals[i].value);
        } else {
            return vals[i];
        }
    }
    return MaybeError.pure(f.apply(undefined, args));
};
        
MaybeError.prototype.bind = function(f) {
    if ( this.status === 'success' ) {
        return f(this.value);
    }
    return this;
};

MaybeError.prototype.mapError = function(f) {
    if ( this.status === 'error' ) {
        return MaybeError.error(f(this.value));
    }
    return this;
};

MaybeError.prototype.plus = function(that) {
    if ( this.status === 'failure' ) {
        return that;
    }
    return this;
};

MaybeError.zero = new MaybeError('failure', undefined);


module.exports = MaybeError;

