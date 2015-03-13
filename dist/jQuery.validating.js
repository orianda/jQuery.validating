/*!
 * jQuery.validating
 * jQuery plugin to validate elements
 *
 * @version v2.0.2
 * @link https://github.com/orianda/jQuery.validating
 * @author Orianda <orianda@paan.de>
 * @license MIT
 */
(function ($) {
    "use strict";

    /**
     * Is the value undefined?
     * @param {*} value
     * @returns {boolean}
     */
    function isUndefined(value) {
        return typeof value === 'undefined';
    }

    /**
     * Is the value an boolean?
     * @param value
     * @returns {boolean}
     */
    function isBoolean(value) {
        return typeof value === 'boolean' || value instanceof Boolean;
    }

    /**
     * Is this a promise object?
     * @param {*} promise
     * @returns {boolean}
     */
    function isPromise(promise) {
        return promise instanceof Object && typeof promise.then === 'function';
    }

    function wait(promises) {
        var defer = $.Deferred(),
            finished = 0,
            action = 'resolve',
            issue, i, l;

        /**
         * Fail handler
         * @param {*} error
         */
        function fail(error) {
            action = 'reject';
            issue = error;
        }

        /**
         * Reduce counter and finish deferred
         * if the last element promise resolved
         */
        function finish() {
            finished++;
            if (finished <= l) {
                return;
            }
            if (isUndefined(issue) || l > 1) {
                defer[action]();
            } else {
                defer[action](issue);
            }
        }

        for (i = 0, l = promises.length; i < l; i++) {
            promises[i].fail(fail).always(finish);
        }

        finish();
        return defer.promise();
    }

    /**
     * Create validator controller
     */
    $.Validating = function Validating() {

        /**
         * Validator registry
         * @type {Object[]}
         */
        var registry = [];

        /**
         * Make sure this is created by a new call
         */
        if (!(this instanceof Validating)) {
            return new Validating();
        }

        /**
         * Register validator
         * @param {string|Function|jQuery|HTMLElement|HTMLElement[]} selector
         * @param {Function} validator
         * @param {Object} data
         * @param {boolean} prepend
         */
        function insert(selector, validator, data, prepend) {
            if (selector && $.isFunction(validator)) {
                registry[prepend ? 'unshift' : 'push']({
                    selector  : selector,
                    validator : validator,
                    data      : data
                });
            }
        }

        /**
         * Prepend validator to validator stack
         * @param {string|Function|jQuery|HTMLElement|HTMLElement[]} selector
         * @param {Function} validator
         * @param {Object} [data]
         */
        this.prepend = function (selector, validator, data) {
            insert(selector, validator, data, true);
        };

        /**
         * Append validator to validator stack
         * @param {string|Function|jQuery|HTMLElement|HTMLElement[]} selector
         * @param {Function} validator
         * @param {Object} [data]
         */
        this.append = function (selector, validator, data) {
            insert(selector, validator, data, false);
        };

        /**
         * Remove validator from validator stack
         * @param {string|Function|jQuery|HTMLElement|HTMLElement[]} selector
         * @param {Function} [validator]
         * @returns {number}
         */
        this.remove = function (selector, validator) {
            var amount = 0,
                index, entry;
            if (selector && (isUndefined(validator) || $.isFunction(validator))) {
                index = registry.length;
                while (index > 0) {
                    index--;
                    entry = registry[index];
                    if (entry.selector === selector && (entry.validator === validator || !entry.fix && isUndefined(validator))) {
                        registry.splice(index, 1);
                        amount++;
                    }
                }
            }
            return amount;
        };

        /**
         * Trigger validation process
         * @param {jQuery} elements
         * @param {boolean} [notify=false]
         * @returns {promise}
         */
        this.validate = function (elements, notify) {
            var promises = [];

            /**
             * Validate each element
             */
            elements.each(function () {
                var element = $(this),
                    elementPromises = [],
                    context = {};

                $.each(registry, function () {
                    var issue;
                    if (element.is(this.selector)) {
                        issue = this.validator.call(context, element[0], this.data);
                    }
                    if (isPromise(issue)) {
                        elementPromises.push(issue);
                    } else if (isBoolean(issue)) {
                        return issue;
                    } else if (!isUndefined(issue)) {
                        elementPromises.push($.Deferred().reject(issue).promise());
                        return false;
                    }
                });

                elementPromises = $.when.apply($, elementPromises);
                promises.push(elementPromises);
                if (notify) {
                    element.trigger('validating.validating', elementPromises);
                    elementPromises.then(function () {
                        element.trigger('valid.validating');
                    }, function (issue) {
                        element.trigger('invalid.validating', issue);
                    });
                }
            });

            return wait(promises);
        };

        /**
         * Registry handler
         * @type {Object}
         */
        Object.defineProperty(this, 'length', {
            configurable : false,
            enumerable   : false,
            get          : function () {
                return registry.length;
            },
            set          : function (length) {
                registry.length = length;
            }
        });

    };

}(jQuery));