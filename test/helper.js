"use strict";

const deepEqual = require("assert").deepEqual;

function assertThrow(f, tests) {
	var thrown = false;
	var exception = null;
	try {
		f();
	} catch (e) {
		thrown = true;
		exception = e;
	}
	if (thrown) {
		deepEqual(1, 1, "successfully threw");
		tests(exception);
	} else {
		deepEqual(0, 1, "failed to throw");
	}
}

function assertNoThrow(f, tests) {
    var thrown = false;
    var exception = null;
    var value = null;
    try {
        value = f();
    } catch (e) {
        thrown = true;
        exception = e;
    }
    if (thrown) {
        deepEqual(0, 1, "unexpectedly threw -- " + exception);
    } else {
        deepEqual(1, 1, "successfully did not throw");
        tests(value);
    }
}

module.exports = {
    'assertThrow'  : assertThrow,
    'assertNoThrow': assertNoThrow
};
