/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')

const utils = require('@newrelic/test-utilities')
utils.assert.extendTap(tap)

const { getTypeDefs, resolvers } = require('../../data-definitions')
const setupErrorSchema = require('../error-setup')
const { clearCachedModules } = require('../../utils')

const WEB_FRAMEWORK = 'Hapi'

function setupApolloServerHapiTests({ suiteName, createTests, pluginConfig }, config) {
  tap.test(`apollo-server-hapi: ${suiteName}`, (t) => {
    t.autoend()

    let server = null
    let hapiServer = null
    let serverUrl = null
    let helper = null

    t.beforeEach(async () => {
      // load default instrumentation. hapi being critical
      helper = utils.TestAgent.makeInstrumented(config)
      const createPlugin = require('../../../lib/create-plugin')
      const nrApi = helper.getAgentApi()

      // TODO: eventually use proper function for instrumenting and not .shim
      const plugin = createPlugin(nrApi.shim, pluginConfig)

      const Hapi = require('@hapi/hapi')

      const graphqlPath = '/gql'

      // Do after instrumentation to ensure hapi isn't loaded too soon.
      const hapiServerPkg = require('apollo-server-hapi')
      const { ApolloServer, gql } = hapiServerPkg
      const schema = getTypeDefs(gql)
      const errorSchema = setupErrorSchema(hapiServerPkg, resolvers)
      server = new ApolloServer({
        typeDefs: [schema, errorSchema],
        resolvers,
        plugins: [plugin]
      })

      hapiServer = Hapi.server({
        host: 'localhost',
        port: 5000
      })

      await server.start()
      await server.applyMiddleware({ app: hapiServer, path: graphqlPath })

      await hapiServer.start()

      serverUrl = `http://localhost:${hapiServer.settings.port}${graphqlPath}`
      t.context.helper = helper
      t.context.serverUrl = serverUrl
    })

    t.afterEach(() => {
      hapiServer && hapiServer.stop()
      server && server.stop()

      helper.unload()
      server = null
      serverUrl = null
      helper = null

      clearCachedModules(['@hapi/hapi', 'apollo-server-hapi'], __dirname)
    })

    createTests(t, WEB_FRAMEWORK)
  })
}

module.exports = {
  setupApolloServerHapiTests
}
