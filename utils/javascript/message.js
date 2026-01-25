/**
 * Get HTTP status code message
 * @param {number} code - HTTP status code
 * @returns {string|null} Status message or null if not found
 */
function _getCodeMessage(code) {
  const statusMessages = {
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    509: 'Network Timeout'
  };

  return statusMessages[code] || null;
}

/**
 * Base response class
 */
class RResponse {
  constructor(responseCode = 200) {
    this.message = {};
    this.code = responseCode;
  }

  /**
   * Get Express response tuple [json, statusCode]
   * @returns {Array} [json, statusCode]
   */
  get() {
    return [this.message, this.code];
  }

  /**
   * Add a key-value pair to the response message
   * @param {string} key - Key name
   * @param {*} value - Value
   * @returns {RResponse} This instance for chaining
   */
  add(key, value) {
    this.message[key] = value;
    return this;
  }

  /**
   * Set the message field
   * @param {string} value - Message text
   * @returns {RResponse} This instance for chaining
   */
  msg(value) {
    return this.add('message', value);
  }
}

/**
 * Response with HTTP status message
 */
class RMessage extends RResponse {
  constructor(responseCode = 200) {
    super(responseCode);
    const statusMessage = _getCodeMessage(responseCode);
    if (statusMessage) {
      this.message.message = statusMessage;
    }
  }
}

/**
 * Error response with error text
 */
class RErrorMessage extends RMessage {
  constructor(errorText = 'Unexpected error', responseCode = 501) {
    super(responseCode);
    this.message.error = errorText;
  }
}

/**
 * Helper function to create error response middleware
 * @param {string} errorText - Error message
 * @param {number} responseCode - HTTP status code
 * @returns {Function} Express middleware function
 */
function errorResponse(errorText, responseCode = 401) {
  return function(req, res, next) {
    const error = new RErrorMessage(errorText, responseCode);
    const [json, status] = error.get();
    return res.status(status).json(json);
  };
}

/**
 * Helper function to create success response
 * @param {Object} data - Response data
 * @param {number} responseCode - HTTP status code
 * @returns {Function} Express response function
 */
function successResponse(data, responseCode = 200) {
  return function(req, res) {
    const response = new RMessage(responseCode);
    Object.keys(data).forEach(key => {
      response.add(key, data[key]);
    });
    const [json, status] = response.get();
    return res.status(status).json(json);
  };
}

module.exports = {
  RResponse,
  RMessage,
  RErrorMessage,
  errorResponse,
  successResponse,
  _getCodeMessage
};
