/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

// TODO: ideally, we wouldn't be reachign into internals
// and would have an API (in agent package?) to get what we need.
// This sort of thing makes future refactors more difficult even
// when extracted to a single location in the external module.

function getErrorTraces(agent) {
  return agent.errors.traceAggregator.errors
}

function getSpanEvents(agent) {
  return agent.spanEventAggregator.getEvents()
}

function findSpanById(agent, spanId) {
  const spans = getSpanEvents(agent)

  return spans.find((value) => {
    const { intrinsics } = value
    return intrinsics.guid === spanId
  })
}

function findSegmentByName(root, name) {
  if (root.name === name) {
    return root
  } else if (root.children && root.children.length) {
    for (let i = 0; i < root.children.length; i++) {
      const child = root.children[i]
      const found = findSegmentByName(child, name)
      if (found) {
        return found
      }
    }
  }

  return null
}

function temporarySetEnv(t, key, value) {
  const existing = process.env[key]
  process.env[key] = value

  t.teardown(() => {
    if (existing === undefined) {
      delete process.env[key]
      return
    }

    process.env[key] = existing
  })
}

function setupEnvConfig(t, enabled = true, appName = 'test app') {
  temporarySetEnv(t, 'NEW_RELIC_NO_CONFIG_FILE', true)
  temporarySetEnv(t, 'NEW_RELIC_ENABLED', enabled)
  temporarySetEnv(t, 'NEW_RELIC_APP_NAME', appName)
}

module.exports = {
  getErrorTraces,
  getSpanEvents,
  findSpanById,
  findSegmentByName,
  temporarySetEnv,
  setupEnvConfig
}
