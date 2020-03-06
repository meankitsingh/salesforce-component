/**
 * Common functionality for OAuth
 * */
const util = require('util');
const { handlebars } = require('hbs');
const _ = require('lodash');
const httpUtils = require('./newHttp-utils.js');

const appDef = require('../../component.json');

function getValueFromEnv(key) {
  const compiled = handlebars.compile(key);
  const value = compiled(process.env);
  if (value) {
    return value;
  }
  throw new Error(util.format("No value is defined for environment variable: '%s'", key));
}

/**
 * This function resolves the variables in the string using hanlebars
 *
 * @param template
 * @param context
 * @returns {*}
 */
function resolveVars(template, context) {
  const compiled = handlebars.compile(template);
  return compiled(context);
}

async function refreshAppToken(logger, conf) {
  const credentials = appDef.credentials || {};
  const { oauth2 } = credentials;
  const clientId = getValueFromEnv(oauth2.client_id);
  const clientSecret = getValueFromEnv(oauth2.client_secret);
  const refreshURI = resolveVars(oauth2.token_uri, conf);

  const params = {
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: conf.oauth ? conf.oauth.refresh_token : null,
  };

  const newConf = _.cloneDeep(conf);

  let refreshResponse;
  try {
    refreshResponse = await httpUtils.getJSON(logger, {
      url: refreshURI,
      method: 'post',
      form: params,
      json: true,
    });
  } catch (err) {
    logger.error('Failed to refresh token from %s', refreshURI);
    throw err;
  }

  logger.info('Refreshed token from %s', refreshURI);
  // update access token in configuration
  newConf.oauth.access_token = refreshResponse.access_token;
  // if new refresh_token returned, update that also
  // specification is here http://tools.ietf.org/html/rfc6749#page-47
  if (refreshResponse.refresh_token) {
    newConf.oauth.refresh_token = refreshResponse.refresh_token;
  }
  return newConf;
}

exports.refreshAppToken = refreshAppToken;
