"use strict";

const STATUSES = new Set(['success', 'failure', 'error']);

function MaybeError(status, value) {
    if ( !STATUSES.has(status) ) {
        throw new Error('invalid MaybeError constructor name: ' + status);
    }
    this.status = status;
    this.value = value;
}

MaybeError.pure = (x) => new MaybeError('success', x);

MaybeError.zero = new MaybeError('failure', undefined);

MaybeError.error = (e) => new MaybeError('error', e);

MaybeError.prototype.fmap = function(f) {
    return (this.status === 'success') ? MaybeError.pure(f(this.value)) : this;
};

MaybeError.app = function(f, ...vals) {
    var args = [];
    for (var i = 0; i < vals.length; i++) {
        if ( vals[i].status === 'success' ) {
            args.push(vals[i].value);
        } else {
            return vals[i];
        }
    }
    return MaybeError.pure(f(...args));
};

MaybeError.prototype.bind = function(f) {
    return (this.status === 'success') ? f(this.value) : this;
};

MaybeError.prototype.mapError = function(f) {
    return (this.status === 'error') ? MaybeError.error(f(this.value)) : this;
};

MaybeError.prototype.plus = function(that) {
    return (this.status === 'failure') ? that : this;
};


module.exports = MaybeError;

