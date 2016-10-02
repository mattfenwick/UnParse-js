"use strict";

const C = require('./combinators.js');
const F = require('./functions.js');

const app  = C.app, addError = C.addError,
    seq  = C.seq, getState = C.getState,
    fmap = C.fmap;

function _forbid_duplicates(arr) {
    const keySet = new Set();
    arr.forEach(function(key) {
        if ( keySet.has(key) ) {
            throw new Error('duplicate name -- ' + key);
        }
        keySet.add(key);
    });
}

function _forbid_keys(forbidden, keys) {
    const keySet = new Set(keys);
    forbidden.forEach(function(key) {
        if ( keySet.has(key) ) {
            throw new Error('cst node: forbidden key: ' + key);
        }
    });
}

function node(name, ...pairs) {
    /*
    _pairs_: 0+ 2-element arrays
    1. runs parsers in sequence
    2. collects results into a dictionary
    3. grabs state at which parsers started
    4. adds an error frame
    */
    const names = pairs.map((x) => x[0]);
    _forbid_duplicates(names);
    _forbid_keys(['_name', '_start', '_end'], names);
    function action(start, results, end) {
        const out = F.dict(results);
        out._start = start;
        out._name = name;
        out._end = end;
        return out;
    }
    const childParsers = seq(pairs.map(([name, parser]) => {
        return fmap(value => [name, value], parser);
    }));
    return addError(name,
                    app(action,
                        getState,
                        childParsers,
                        getState));
}

module.exports = {
    'node'    :  node,
};

