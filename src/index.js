(function( $ ) {
	"use strict";

	/**
	 * Validator registry
	 * @type {Object[]}
	 */
	var registry = [];

	/**
	 * Is the value undefined?
	 * @param {*} value
	 * @returns {boolean}
	 */
	function isUndefined( value ) {
		return typeof value === 'undefined';
	}

	/**
	 * Is this a promise object?
	 * @param {*} promise
	 * @returns {boolean}
	 */
	function isPromise( promise ) {
		return promise instanceof Object && typeof promise.then === 'function';
	}

	/**
	 * Register validator
	 * @param {string|Function|jQuery|HTMLElement|HTMLElement[]} selector
	 * @param {Function} validator
	 * @param {boolean} fix
	 * @param {boolean} prepend
	 */
	function insert( selector, validator, fix, prepend ) {
		if( selector && $.isFunction( validator ) ) {
			registry[prepend ? 'unshift' : 'push']( {
				selector: selector,
				validator: validator,
				fix: !!fix
			} );
		}
	}

	/**
	 * Prepend validator to validator stack
	 * @param {string|Function|jQuery|HTMLElement|HTMLElement[]} selector
	 * @param {Function} validator
	 * @param {boolean} [fix]
	 */
	function prepend( selector, validator, fix ) {
		insert( selector, validator, fix, true );
	}

	/**
	 * Append validator to validator stack
	 * @param {string|Function|jQuery|HTMLElement|HTMLElement[]} selector
	 * @param {Function} validator
	 * @param {boolean} [fix=false]
	 */
	function append( selector, validator, fix ) {
		insert( selector, validator, fix, false );
	}

	/**
	 * Remove validator from validator stack
	 * @param {string|Function|jQuery|HTMLElement|HTMLElement[]} selector
	 * @param {Function} [validator]
	 * @returns {number}
	 */
	function remove( selector, validator ) {
		var amount = 0,
			index, entry;
		if( selector && (isUndefined( validator ) || $.isFunction( validator )) ) {
			index = registry.length;
			while( index > 0 ) {
				index--;
				entry = registry[index];
				if( entry.selector === selector && (entry.validator === validator || !entry.fix && isUndefined( validator )) ) {
					registry.splice( index, 1 );
					amount++;
				}
			}
		}
		return amount;
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
	function setLength( amount ) {
		var length = registry.length,
			index = length - 1;
		for( index; index >= 0 && length > amount; index-- ) {
			if( !registry[index].fix ) {
				registry.splice( index, 1 );
				length--;
			}
		}
	}

	/**
	 * Registry handler
	 * @type {Object}
	 */
	$.validating = Object.defineProperty( {
		prepend: prepend,
		append: append,
		remove: remove
	}, 'length', {
		configurable: false,
		enumerable: false,
		get: getLength,
		set: setLength
	} );

	/**
	 * Trigger validation process
	 * @param {boolean} [notify=false]
	 * @returns {promise}
	 */
	$.fn.validating = function( notify ) {
		var promises = [],
			trigger;

		/**
		 * Trigger status event on element
		 * if it is enabled.
		 * @type {Function}
		 */
		trigger = notify ? function( element, name, value ) {
			element.trigger( name + '.validating', value );
		} : $.noop;

		/**
		 * Validate each element
		 */
		this.each( function() {
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
			trigger( element, 'validating', elementPromises );
			elementPromises.then( function() {
				trigger( element, 'valid' );
			}, function( issue ) {
				trigger( element, 'invalid', issue );
			} );
		} );

		return $.when.apply( $, promises ).then( $.noop );
	};

}( jQuery ));