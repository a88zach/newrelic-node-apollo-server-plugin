/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const { executeQuery, executeQueryBatch } = require('../test-client')
const { checkResult } = require('./common')

const ANON_PLACEHOLDER = '<anonymous>'
const UNKNOWN_OPERATION = '<unknown>'

const OPERATION_PREFIX = 'GraphQL/operation/ApolloServer'
const RESOLVE_PREFIX = 'GraphQL/resolve/ApolloServer'

/**
 * Creates a set of standard segment naming and nesting tests to run
 * against express-based apollo-server libraries.
 * It is required that t.context.helper and t.context.serverUrl are set.
 * @param {*} t a tap test instance
 */
function createSegmentsTests(t, frameworkName, isApollo4) {
  const TRANSACTION_PREFIX = `WebTransaction/${frameworkName}/POST`

  /**
   * Creates the root segment based on a prefix and operation part
   */
  function baseSegment(operationPart, prefix = TRANSACTION_PREFIX) {
    return {
      name: `${prefix}//${operationPart}`,
      children: []
    }
  }

  /**
   * Creates the appropriate sibling hierarchy of segments
   * In apollo 4 they tweaked how the apollo server express instance is constructed.
   * It lacks a / router and routes everything through a global middleware
   */
  function constructSegments(expectedSegments, operationSegments) {
    if (isApollo4) {
      expectedSegments.children.push(operationSegments)
    } else {
      expectedSegments.children.push({
        name: 'Expressjs/Router: /',
        children: operationSegments
      })
    }
  }

  t.test('anonymous query, single level', (t) => {
    const { helper, serverUrl } = t.context

    const query = `query {
      hello
    }`

    helper.agent.once('transactionFinished', (transaction) => {
      const operationPart = `query/${ANON_PLACEHOLDER}/hello`
      const expectedSegments = baseSegment(operationPart)
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${operationPart}`,
              children: [
                {
                  name: `${RESOLVE_PREFIX}/hello`
                }
              ]
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('named query, single level', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'HeyThere'
    const query = `query ${expectedName} {
      hello
    }`

    helper.agent.once('transactionFinished', (transaction) => {
      const operationPart = `query/${expectedName}/hello`
      const expectedSegments = baseSegment(operationPart)
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${operationPart}`,
              children: [
                {
                  name: `${RESOLVE_PREFIX}/hello`
                }
              ]
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('anonymous query, multi-level', (t) => {
    const { helper, serverUrl } = t.context

    const query = `query {
      libraries {
        books {
          title
          author {
            name
          }
        }
      }
    }`

    const path = 'libraries.books'

    helper.agent.once('transactionFinished', (transaction) => {
      const operationPart = `query/${ANON_PLACEHOLDER}/${path}`
      const expectedSegments = baseSegment(operationPart)
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${operationPart}`,
              children: [
                { name: `${RESOLVE_PREFIX}/libraries` },
                { name: `${RESOLVE_PREFIX}/libraries.books` },
                { name: `${RESOLVE_PREFIX}/libraries.books.author` },
                { name: `${RESOLVE_PREFIX}/libraries.books.author.name` }
              ]
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('named query, multi-level should return deepest unique path', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'GetBooksByLibrary'
    const query = `query ${expectedName} {
      libraries {
        books {
          title
          author {
            name
          }
        }
      }
    }`

    const path = 'libraries.books'

    helper.agent.once('transactionFinished', (transaction) => {
      const operationPart = `query/${expectedName}/${path}`
      const expectedSegments = baseSegment(operationPart)
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${operationPart}`,
              children: [
                {
                  name: `${OPERATION_PREFIX}/${operationPart}`,
                  children: [
                    { name: `${RESOLVE_PREFIX}/libraries` },
                    { name: `${RESOLVE_PREFIX}/libraries.books` },
                    { name: `${RESOLVE_PREFIX}/libraries.books.title` },
                    { name: `${RESOLVE_PREFIX}/libraries.books.author` },
                    { name: `${RESOLVE_PREFIX}/libraries.books.author.name` }
                  ]
                }
              ]
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('anonymous mutation, single level', (t) => {
    const { helper, serverUrl } = t.context

    const query = `mutation {
      addThing(name: "added thing!")
    }`

    helper.agent.once('transactionFinished', (transaction) => {
      const operationPart = `mutation/${ANON_PLACEHOLDER}/addThing`
      const expectedSegments = baseSegment(operationPart)
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${operationPart}`,
              children: [
                {
                  name: `${OPERATION_PREFIX}/${operationPart}`,
                  children: [
                    {
                      name: `${RESOLVE_PREFIX}/addThing`,
                      children: [
                        {
                          name: 'timers.setTimeout',
                          children: [
                            {
                              name: 'Callback: namedCallback'
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('named mutation, single level, should use mutation name', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'AddThing'
    const query = `mutation ${expectedName} {
      addThing(name: "added thing!")
    }`

    helper.agent.once('transactionFinished', (transaction) => {
      const operationPart = `mutation/${expectedName}/addThing`
      const expectedSegments = baseSegment(operationPart)
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${operationPart}`,
              children: [
                {
                  name: `${RESOLVE_PREFIX}/addThing`,
                  children: [
                    {
                      name: 'timers.setTimeout',
                      children: [
                        {
                          name: 'Callback: namedCallback'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('anonymous query, with params', (t) => {
    const { helper, serverUrl } = t.context

    const query = `query {
      paramQuery(blah: "blah", blee: "blee")
    }`

    helper.agent.once('transactionFinished', (transaction) => {
      const operationPart = `query/${ANON_PLACEHOLDER}/paramQuery`
      const expectedSegments = baseSegment(operationPart)
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${operationPart}`,
              children: [{ name: `${RESOLVE_PREFIX}/paramQuery` }]
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('named query, with params', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'BlahQuery'
    const query = `query ${expectedName} {
      paramQuery(blah: "blah")
    }`

    helper.agent.once('transactionFinished', (transaction) => {
      const operationPart = `query/${expectedName}/paramQuery`
      const expectedSegments = baseSegment(operationPart)
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${operationPart}`,
              children: [{ name: `${RESOLVE_PREFIX}/paramQuery` }]
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('named query, with params, multi-level', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'GetBookForLibrary'
    const query = `query ${expectedName} {
      library(branch: "downtown") {
        books {
          title
          author {
            name
          }
        }
      }
    }`

    const path = 'library.books'

    helper.agent.once('transactionFinished', (transaction) => {
      const operationPart = `query/${expectedName}/${path}`
      const expectedSegments = baseSegment(operationPart)
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${operationPart}`,
              children: [
                {
                  name: `${RESOLVE_PREFIX}/library`,
                  children: [
                    {
                      name: 'timers.setTimeout',
                      children: [
                        {
                          name: 'Callback: <anonymous>'
                        }
                      ]
                    }
                  ]
                },
                { name: `${RESOLVE_PREFIX}/library.books` },
                { name: `${RESOLVE_PREFIX}/library.books.title` },
                { name: `${RESOLVE_PREFIX}/library.books.author` },
                { name: `${RESOLVE_PREFIX}/library.books.author.name` }
              ]
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('named query with fragment, query first', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'GetBookForLibrary'
    const query = `query ${expectedName} {
      library(branch: "downtown") {
        books {
          ... LibraryBook
        }
      }
    }
    fragment LibraryBook on Book {
      title
      author {
        name
      }
    }`

    const path = 'library.books.LibraryBook'

    helper.agent.once('transactionFinished', (transaction) => {
      const operationPart = `query/${expectedName}/${path}`
      const expectedSegments = baseSegment(operationPart)
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${operationPart}`,
              children: [
                {
                  name: `${RESOLVE_PREFIX}/library`,
                  children: [
                    {
                      name: 'timers.setTimeout',
                      children: [
                        {
                          name: 'Callback: <anonymous>'
                        }
                      ]
                    }
                  ]
                },
                { name: `${RESOLVE_PREFIX}/library.books` },
                { name: `${RESOLVE_PREFIX}/library.books.title` },
                { name: `${RESOLVE_PREFIX}/library.books.author` },
                { name: `${RESOLVE_PREFIX}/library.books.author.name` }
              ]
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQuery(serverUrl, query, (err) => {
      t.error(err)
      t.end()
    })
  })

  t.test('named query with fragment, fragment first', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'GetBookForLibrary'
    const query = `fragment LibraryBook on Book {
      title
      author {
        name
      }
    }
    query ${expectedName} {
      library(branch: "downtown") {
        books {
          ... LibraryBook
        }
      }
    }`

    const path = 'library.books.LibraryBook'

    helper.agent.once('transactionFinished', (transaction) => {
      const operationPart = `query/${expectedName}/${path}`
      const expectedSegments = baseSegment(operationPart)
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${operationPart}`,
              children: [
                {
                  name: `${RESOLVE_PREFIX}/library`,
                  children: [
                    {
                      name: 'timers.setTimeout',
                      children: [
                        {
                          name: 'Callback: <anonymous>'
                        }
                      ]
                    }
                  ]
                },
                { name: `${RESOLVE_PREFIX}/library.books` },
                { name: `${RESOLVE_PREFIX}/library.books.title` },
                { name: `${RESOLVE_PREFIX}/library.books.author` },
                { name: `${RESOLVE_PREFIX}/library.books.author.name` }
              ]
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQuery(serverUrl, query, (err) => {
      t.error(err)
      t.end()
    })
  })

  t.test('batch query should include segments for nested queries', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName1 = 'GetBookForLibrary'
    const query1 = `query ${expectedName1} {
      library(branch: "downtown") {
        books {
          title
          author {
            name
          }
        }
      }
    }`

    const query2 = `mutation {
      addThing(name: "added thing!")
    }`

    const path1 = 'library.books'

    const queries = [query1, query2]

    helper.agent.once('transactionFinished', (transaction) => {
      const operationPart1 = `query/${expectedName1}/${path1}`
      const expectedQuery1Name = `${operationPart1}`
      const operationPart2 = `mutation/${ANON_PLACEHOLDER}/addThing`
      const expectedQuery2Name = `${operationPart2}`

      const batchTransactionPrefix = `${TRANSACTION_PREFIX}//batch`
      const operationPart = `${expectedQuery1Name}/${expectedQuery2Name}`

      const expectedSegments = baseSegment(operationPart, batchTransactionPrefix)
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${operationPart1}`,
              children: [
                {
                  name: `${RESOLVE_PREFIX}/library`,
                  children: [
                    {
                      name: 'timers.setTimeout',
                      children: [
                        {
                          name: 'Callback: <anonymous>'
                        }
                      ]
                    }
                  ]
                },
                { name: `${RESOLVE_PREFIX}/library.books` },
                { name: `${RESOLVE_PREFIX}/library.books.title` },
                { name: `${RESOLVE_PREFIX}/library.books.author` },
                { name: `${RESOLVE_PREFIX}/library.books.author.name` }
              ]
            },
            {
              name: `${OPERATION_PREFIX}/${operationPart2}`,
              children: [
                {
                  name: `${RESOLVE_PREFIX}/addThing`,
                  children: [
                    {
                      name: 'timers.setTimeout',
                      children: [
                        {
                          name: 'Callback: namedCallback'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQueryBatch(serverUrl, queries, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.equal(result.length, 2)

        t.end()
      })
    })
  })

  // there will be no document/AST nor resolved operation
  t.test('when the query cannot be parsed, should have operation placeholder', (t) => {
    const { helper, serverUrl } = t.context

    const invalidQuery = `query {
      libraries {
        books {
          title
          author {
            name
          }
        }
      }
    ` // missing closing }

    helper.agent.once('transactionFinished', (transaction) => {
      const expectedSegments = baseSegment('*')
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${UNKNOWN_OPERATION}`
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQuery(serverUrl, invalidQuery, (err, result) => {
      t.error(err)

      t.ok(result)
      t.ok(result.errors)
      t.equal(result.errors.length, 1) // should have one parsing error

      const [parseError] = result.errors
      t.equal(parseError.extensions.code, 'GRAPHQL_PARSE_FAILED')

      t.end()
    })
  })

  // if parse succeeds but validation fails, there will not be a resolved operation
  // but the document/AST can still be leveraged for what was intended.
  t.test('when cannot validate, should include operation segment', (t) => {
    const { helper, serverUrl } = t.context

    const invalidQuery = `query {
      libraries {
        books {
          title
          doesnotexist {
            name
          }
        }
      }
    }`

    const path = 'libraries.books'

    helper.agent.once('transactionFinished', (transaction) => {
      const operationPart = `query/${ANON_PLACEHOLDER}/${path}`
      const expectedSegments = baseSegment('*')
      const operationSegments = [
        {
          name: 'Nodejs/Middleware/Expressjs/<anonymous>',
          children: [
            {
              name: `${OPERATION_PREFIX}/${operationPart}`
            }
          ]
        }
      ]
      constructSegments(expectedSegments, operationSegments)

      t.segments(transaction.trace.root, expectedSegments)
    })

    executeQuery(serverUrl, invalidQuery, (err, result) => {
      t.error(err)

      t.ok(result)
      t.ok(result.errors)
      t.equal(result.errors.length, 1) // should have one parsing error

      const [parseError] = result.errors
      t.equal(parseError.extensions.code, 'GRAPHQL_VALIDATION_FAILED')

      t.end()
    })
  })
}

module.exports = {
  suiteName: 'express segments with scalars',
  createTests: createSegmentsTests,
  pluginConfig: { captureScalars: true }
}
