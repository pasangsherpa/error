/**
 * Module dependencies.
 */

var swig = require('swig');
var http = require('http');

/**
 * Expose `error`.
 */

module.exports = error;

/**
 * Error middleware.
 *
 *  - `template` defaults to ./error.html
 *
 * @param {Object} opts
 * @api public
 */

function error(opts) {
  opts = opts || {};

  // template
  var path = opts.template || __dirname + '/error.html';
  var render = swig.compileFile(path);

  // env
  var env = process.env.NODE_ENV || 'development';

  return function* error(next) {
    try {
      yield next;
      if (404 == this.response.status && !this.response.body) this.throw(404);
    } catch (err) {
      this.status = err.status || 500;

      // application
      this.app.emit('error', err, this);

      var accepts = this.accepts('html', 'text', 'json',
        'application/vnd.api+json');
      // accepted types
      switch (accepts) {
        case 'text':
          this.type = 'text/plain';
          if ('development' == env) this.body = err.message
          else if (err.expose) this.body = err.message
          else throw err;
          break;

        case 'application/vnd.api+json':
        case 'json':
          this.type = accepts == 'json' ? 'application/json' : accepts;
          if ('development' == env || err.expose) {
            var errors = [];

            if (err.errors) {
              errors = err.errors.map(error => _generateJsonApiError(error));
            } else {
              errors.push(_generateJsonApiError(err));
            }

            this.body = {
              errors: errors
            }
          } else this.body = {
            error: http.STATUS_CODES[this.status]
          }
          break;

        case 'html':
          this.type = 'text/html';
          this.body = render({
            env: env,
            ctx: this,
            request: this.request,
            response: this.response,
            error: err.message,
            stack: err.stack,
            status: this.status,
            code: err.code
          });
          break;
      }
    }
  }
}

/**
 * Generate JsonApi compliant Error object
 * http://jsonapi.org/format/#errors
 * http://jsonapi.org/examples/#error-objects-basics
 *
 * @param  {Object} err
 * @return {Object}
 */
function _generateJsonApiError(err) {
  return {
    id: err.id,
    links: err.links,
    status: err.status && err.status.toString(),
    code: err.code && err.status.toString(),
    title: err.message,
    detail: err.detail,
    source: err.source,
    meta: err.meta
  }
}
