/* eslint-disable no-return-assign */
const fs = require('fs');
const sinon = require('sinon');
const { expect } = require('chai');
const { messages } = require('elasticio-node');
const logger = require('@elastic.io/component-logger')();
const queryTrigger = require('../../lib/triggers/newQuery');

describe('queryTrigger', () => {
  let message;
  let lastCall;
  let configuration;

  beforeEach(async () => {
    lastCall.reset();
  });

  before(async () => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }

    lastCall = sinon.stub(messages, 'newMessageWithBody').returns(Promise.resolve());

    configuration = {
      apiVersion: '39.0',
      oauth: {
        instance_url: 'https://na38.salesforce.com',
        refresh_token: process.env.REFRESH_TOKEN,
        access_token: process.env.ACCESS_TOKEN,
      },
      prodEnv: 'login',
    };
    message = {
      body: {},
    };
  });

  after(async () => {
    messages.newMessageWithBody.restore();
  });

  const emitter = {
    emit: sinon.spy(),
    logger,
  };

  it('execute queryTrigger', async () => {
    configuration.query = 'SELECT ID, Name from Contact';
    await queryTrigger.process.call(emitter, message, configuration);
    expect(emitter.emit.withArgs('data').callCount).to.be.equal(5);
    expect(emitter.emit.withArgs('snapshot').callCount).to.be.equal(1);
  });
});
