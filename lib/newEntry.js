/* eslint-disable no-use-before-define,no-param-reassign,no-await-in-loop */
const { messages } = require('elasticio-node');
const fetchObjectsQuery = require('./helpers/objectFetcherQuery');
const createPresentableError = require('./helpers/error.js');
const oAuthUtils = require('./helpers/newOauth-utils.js');
const common = require('./common.js');

function SalesforceEntity(callScope) {
  const self = this;

  /**
   * This function refreshes salesforce token
   * @param conf - configuration with so that conf.oauth.refresh_token should be available
   */
  this.refreshToken = async function refreshToken(conf) {
    const newConf = await oAuthUtils.refreshAppToken(callScope.logger, conf);
    callScope.emit('updateKeys', { oauth: newConf.oauth });
    return newConf;
  };

  this.processQuery = async function processQuery(query, cfg) {
    const params = { query };
    params.cfg = await self.refreshToken(cfg);
    params.cfg.apiVersion = `v${common.globalConsts.SALESFORCE_API_VERSION}`;
    let results;
    try {
      results = await fetchObjectsQuery(callScope.logger, params);
    } catch (e) {
      onError(e);
    }
    if (!results.objects.totalSize) {
      callScope.logger.info('No new objects found');
      return;
    }
    if (params.cfg.outputMethod === 'emitAll') {
      const data = messages.newMessageWithBody({ records: results.objects.records });
      callScope.emit('data', data);
    } else {
      results.objects.records.forEach((record) => {
        callScope.emit('data', messages.newMessageWithBody(record));
      });
    }
    callScope.emit('end');
  };

  function onError(err) {
    const error = createPresentableError(err) || err;
    callScope.logger.error('emitting SalesforceEntity error', error, error.stack);
    callScope.emit('error', error);
  }
}

exports.processQuery = function processQuery(msg, conf, snapshot) {
  const self = new SalesforceEntity(this);
  return self.processQuery(msg, conf, snapshot);
};
exports.SalesforceEntity = SalesforceEntity;
