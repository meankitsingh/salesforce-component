/* eslint-disable no-use-before-define,no-param-reassign,no-await-in-loop */
const elasticio = require('elasticio-node');

const { messages } = elasticio;
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
    const newConf = await oAuthUtils.refreshAppToken(callScope.logger, 'salesforce', conf);
    callScope.emit('updateKeys', { oauth: newConf.oauth });
    return newConf;
  };

  this.processQuery = async function processQuery(query, cfg) {
    const params = {};
    params.cfg = cfg;
    params.cfg.apiVersion = `v${common.globalConsts.SALESFORCE_API_VERSION}`;

    params.query = query;
    const newConf = await self.refreshToken(params.cfg);
    const paramsUpdated = updateCfg(newConf);
    let resultsObj;
    try {
      resultsObj = await fetchObjectsQuery(callScope.logger, paramsUpdated);
    } catch (e) {
      onError(e);
    }
    await processResults(resultsObj);
    emitEnd();

    function updateCfg(config) {
      params.cfg = config;
      return params;
    }

    function processResults(results) {
      if (!results.objects.totalSize) {
        callScope.logger.info('No new objects found');
        return;
      }
      if (params.cfg.outputMethod === 'emitAll') {
        results.objects.records({ records: emitResultObject });
      } else {
        results.objects.records.forEach(emitResultObject);
      }
    }

    function emitResultObject(object) {
      const msg = messages.newEmptyMessage();
      msg.headers = {
        objectId: object.attributes.url,
      };
      msg.body = object;
      emitData(msg);
    }
  };

  function emitError(err) {
    callScope.logger.error('emitting SalesforceEntity error', err, err.stack);
    callScope.emit('error', err);
  }

  function onError(err) {
    emitError(createPresentableError(err) || err);
  }

  function emitData(data) {
    callScope.emit('data', data);
  }

  function emitEnd() {
    callScope.emit('end');
  }
}

exports.processQuery = function processQuery(msg, conf, snapshot) {
  const self = new SalesforceEntity(this);
  return self.processQuery(msg, conf, snapshot);
};
exports.SalesforceEntity = SalesforceEntity;
