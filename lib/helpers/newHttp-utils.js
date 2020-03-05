const util = require('util');
const request = require('request-promise');
/**
 * This function creates a header value for Authentication header
 * using Basic base64 authentication encoding.
 *
 * For example username 'foo' and password 'bar' will be transformed into
 *
 * 'Basic Zm9vOmJhcg=='
 *
 * @param username
 * @param password
 * @return {String}
 */
exports.createBasicAuthorization = function createBasicAuthorization(username, password) {
  const credentials = util.format('%s:%s', username, password);
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

/**
 * This function fetches JSON response and do a necessary parsing and control
 * of the exception handling in case unexpected return code is returned
 *
 * It accept following parameters as properties of the first parameter
 *
 * url - required url to be fetched
 * auth - optional authentication header value
 * headers - optional hash with header values,
 * please note authentication header will be added automatically as well as Accept header
 *
 * @param logger
 * @param params
 */
exports.getJSON = async function getJSON(logger, params) {
  const { url } = params;
  const method = params.method || 'get';
  const headers = params.headers || {};
  const expectedStatus = params.statusExpected || 200;

  if (params.auth) {
    headers.Authorization = params.auth;
  }

  logger.trace('Sending %s request to %s', method, url);
  let resp;
  const isJson = params.json ? params.json : false;
  const parameters = {
    uri: url,
    headers,
    formData: params.form,
    json: isJson,
    resolveWithFullResponse: true,
  };
  try {
    resp = await request[method.toLowerCase()](parameters);
  } catch (err) {
    logger.error(`Failed to fetch JSON from ${url} with error: ${err}`);
    throw err;
  }
  const { statusCode, body } = resp;
  if (statusCode === expectedStatus) {
    let result = body;
    try {
      if (typeof body === 'string') {
        result = JSON.parse(body);
      }
    } catch (parseError) {
      logger.error('Failed to parse JSON', body);
      throw parseError;
    }
    if (result) {
      logger.trace('Have got %d response from %s to %s', expectedStatus, method, url);
    } else {
      logger.info('Have got empty response');
    }
    return result;
  }
  const msg = util.format(
    'Unexpected return code %d, expected %d, body %j',
    resp.statusCode,
    expectedStatus,
    body,
  );
  logger.error(msg);

  const errorResponse = new Error(msg);
  errorResponse.responseBody = body;
  errorResponse.statusCode = resp.statusCode;
  throw errorResponse;
};
