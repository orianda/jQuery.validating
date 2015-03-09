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
     * Is this a promise object?
     * @param {*} promise
     * @returns {boolean}
     */
    function isPromise(promise) {
        return promise instanceof Object && typeof promise.then === 'function';
    }

    /**
     * Create validator controller
     */
    $.validating = function () {

        /**
         * Validator registry
         * @type {Object[]}
         */
        var registry = [];

        /**
         * Register validator
         * @param {string|Function|jQuery|HTMLElement|HTMLElement[]} selector
         * @param {Function} validator
         * @param {boolean} prepend
         */
        function insert(selector, validator, prepend) {
            if (selector && $.isFunction(validator)) {
                registry[prepend ? 'unshift' : 'push']({
                    selector  : selector,
                    validator : validator
                });
            }
        }

        /**
         * Prepend validator to validator stack
         * @param {string|Function|jQuery|HTMLElement|HTMLElement[]} selector
         * @param {Function} validator
         */
        function prepend(selector, validator) {
            insert(selector, validator, true);
        }

        /**
         * Append validator to validator stack
         * @param {string|Function|jQuery|HTMLElement|HTMLElement[]} selector
         * @param {Function} validator
         */
        function append(selector, validator) {
            insert(selector, validator, false);
        }

        /**
         * Remove validator from validator stack
         * @param {string|Function|jQuery|HTMLElement|HTMLElement[]} selector
         * @param {Function} [validator]
         * @returns {number}
         */
        function remove(selector, validator) {
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
        }

        /**
         * Trigger validation process
         * @param {jQuery} elements
         * @param {boolean} [notify=false]
         * @returns {promise}
         */
        function validate(elements, notify) {
            var promises = [];

            /**
             * Validate each element
             */
            elements.each(function () {
                var element = $( this ),
                    elementPromises = [];

                $.each( registry, function() {
                    var issue = element.is( this.selector ) && this.validator.call( element, element );
                    if( isPromise( issue ) ) {
                        elementPromises.push( issue );
                    } else if( issue ) {
                        elementPromises.push( $.Deferred().reject( issue ).promise() );
                        return false;
                    }
                } );

                elementPromises = $.when.apply( $, elementPromises );
                promises.push( elementPromises );
                if (notify) {
                    element.trigger('validating.validating', elementPromises);
                    elementPromises.then(function () {
                        element.trigger('valid.validating');
                    }, function (issue) {
                        element.trigger('invalid.validating', issue);
                    });
                }
            });

            return $.when.apply($, promises).then($.noop);
        }

        /**
         * Get amount of registered validators
         * @returns {Number}
         */
        function getLength() {
            return registry.length;
        }

        /**
         * Reduce the registered validators to the given amount
         * Behaves similar to native array (e.g [1,2,3,4,5,6,7,8,9,0].length = 5 -> [1,2,3,4,5])
         * @param {number} amount
         */
        function setLength(amount) {
            registry.length = amount;
        }

        /**
         * Registry handler
         * @type {Object}
         */
        return Object.defineProperty({
            validate : validate,
            prepend  : prepend,
            append   : append,
            remove   : remove
        }, 'length', {
            configurable : false,
            enumerable   : false,
            get          : getLength,
            set          : setLength
        });

    };

}(jQuery));