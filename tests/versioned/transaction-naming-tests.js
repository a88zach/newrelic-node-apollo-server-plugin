/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const { executeQuery, executeQueryBatch } = require('../test-client')
const { checkResult } = require('./common')

const ANON_PLACEHOLDER = '<anonymous>'

/**
 * Creates a set of standard transaction tests to run against various
 * apollo-server libraries.
 * It is required that t.context.helper and t.context.serverUrl are set.
 * @param {*} t a tap test instance
 */
function createTransactionTests(t, frameworkName) {
  const EXPECTED_PREFIX = `WebTransaction/${frameworkName}/POST`

  t.test('anonymous query, single level, should use anonymous placeholder', (t) => {
    const { helper, serverUrl } = t.context

    const query = `query {
      hello
    }`

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${ANON_PLACEHOLDER}/hello`)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('named query, single level, should use query name', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'HeyThere'
    const query = `query ${expectedName} {
      hello
    }`

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${expectedName}/hello`)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test(
    'Federated Server health check query with only __typename ' +
      'in selection set should omit deepest unique path',
    (t) => {
      const { helper, serverUrl } = t.context

      const expectedName = '__ApolloServiceHealthCheck__'
      const query = `query ${expectedName} { __typename }`

      helper.agent.on('transactionFinished', (transaction) => {
        t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${expectedName}`)
      })

      executeQuery(serverUrl, query, (err, result) => {
        t.error(err)
        checkResult(t, result, () => {
          t.end()
        })
      })
    }
  )

  t.test('Nested queries with arguments', (t) => {
    const { helper, serverUrl } = t.context

    const query = `query {
      library(branch: "riverside") {
        magazines {
          title
        },
        books(category: NOVEL) {
          title
        }
      }
    }`

    const path = 'library'

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${ANON_PLACEHOLDER}/${path}`)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('anonymous query, multi-level should return deepest unique path', (t) => {
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

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${ANON_PLACEHOLDER}/${path}`)
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

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${expectedName}/${path}`)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('named query, multi-level with aliases should ignore aliases in naming', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'GetBooksByLibrary'
    const query = `query ${expectedName} {
      libAlias: libraries {
        bookAlias: books {
          title
          author {
            name
          }
        }
      }
    }`

    const path = 'libraries.books'

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${expectedName}/${path}`)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test(
    'anonymous mutation, single level, reserved field, should use anonymous placeholder',
    (t) => {
      const { helper, serverUrl } = t.context

      const query = `mutation {
      addToCollection(title: "Don Quixote") {
        id
      }
    }`

      helper.agent.on('transactionFinished', (transaction) => {
        t.equal(
          transaction.name,
          `${EXPECTED_PREFIX}//mutation/${ANON_PLACEHOLDER}/addToCollection`
        )
      })

      executeQuery(serverUrl, query, (err, result) => {
        t.error(err)
        checkResult(t, result, () => {
          t.end()
        })
      })
    }
  )

  t.test('anonymous mutation, single level, should use anonymous placeholder', (t) => {
    const { helper, serverUrl } = t.context

    const query = `mutation {
      addThing(name: "added thing!")
    }`

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//mutation/${ANON_PLACEHOLDER}/addThing`)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('named mutation, single level, reserved field, should use mutation name', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'addIt'
    const query = `mutation ${expectedName} {
      addToCollection(title: "Don Quixote") {
        id
      }
    }`

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//mutation/${expectedName}/addToCollection`)
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

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//mutation/${expectedName}/addThing`)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('anonymous query, with params, should use anonymous placeholder', (t) => {
    const { helper, serverUrl } = t.context

    const query = `query {
      paramQuery(blah: "blah", blee: "blee")
    }`

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${ANON_PLACEHOLDER}/paramQuery`)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('named query, with params, should use query name', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'BlahQuery'
    const query = `query ${expectedName} {
      paramQuery(blah: "blah")
    }`

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${expectedName}/paramQuery`)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('named query, with params, should return deepest unique path', (t) => {
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

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${expectedName}/${path}`)
    })

    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('batch query should include "batch" all queries separated by delimeter', (t) => {
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

    helper.agent.on('transactionFinished', (transaction) => {
      const expectedQuery1Name = `query/${expectedName1}/${path1}`
      const expectedQuery2Name = `mutation/${ANON_PLACEHOLDER}/addThing`
      t.equal(
        transaction.name,
        `${EXPECTED_PREFIX}//batch/${expectedQuery1Name}/${expectedQuery2Name}`
      )
    })

    executeQueryBatch(serverUrl, queries, (err, result) => {
      t.error(err)
      checkResult(t, result, () => {
        t.equal(result.length, 2)

        t.end()
      })
    })
  })

  t.test('union, should return deepest unique path', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'GetSearchResult'
    const query = `query ${expectedName} {
      search(contains: "Ollies") {
        __typename
        ... on Book {
          title
        }
      }
    }`

    const deepestPath = 'search<Book>.title'

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${expectedName}/${deepestPath}`)
    })

    const expectedResult = [
      {
        __typename: 'Book',
        title: "Ollies for O11y: A Sk8er's Guide to Observability"
      }
    ]
    executeQuery(serverUrl, query, (err, result) => {
      t.error(err)
      t.same(
        result.data.search,
        expectedResult,
        'should return expected results with union search query'
      )
      checkResult(t, result, () => {
        t.end()
      })
    })
  })

  t.test('union, multiple inline fragments, should return deepest unique path', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'GetSearchResult'
    const query = `query ${expectedName} {
      search(contains: "Node") {
        __typename
        ... on Magazine {
          title
        }
        ... on Book {
          title
        }
      }
    }`

    const deepestPath = 'search'

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${expectedName}/${deepestPath}`)
    })

    const expectedResult = [
      { __typename: 'Book', title: 'Node Agent: The Book' },
      { __typename: 'Magazine', title: 'Node Weekly' }
    ]
    executeQuery(serverUrl, query, (err, result) => {
      t.same(
        result.data.search,
        expectedResult,
        'should return expected results with union search query'
      )
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

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${expectedName}/${path}`)
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

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${expectedName}/${path}`)
    })

    executeQuery(serverUrl, query, (err) => {
      t.error(err)
      t.end()
    })
  })

  // there will be no document/AST nor resolved operation
  t.test('if the query cannot be parsed, should be named /*', (t) => {
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

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//*`)
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
  t.test('anonymous query, when cant validate, should use document/AST', (t) => {
    const { helper, serverUrl } = t.context

    const invalidQuery = `query {
      libraries {
        books {
          doesnotexist {
            name
          }
        }
      }
    }`

    const path = 'libraries.books.doesnotexist.name'

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${ANON_PLACEHOLDER}/${path}`)
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

  // if parse succeeds but validation fails, there will not be a resolved operation
  // but the document/AST can still be leveraged for what was intended.
  t.test('named query, when cant validate, should use document/AST', (t) => {
    const { helper, serverUrl } = t.context

    const expectedName = 'FailsToValidate'
    const invalidQuery = `query ${expectedName} {
      libraries {
        books {
          doesnotexist {
            name
          }
        }
      }
    }`

    const path = 'libraries.books.doesnotexist.name'

    helper.agent.on('transactionFinished', (transaction) => {
      t.equal(transaction.name, `${EXPECTED_PREFIX}//query/${expectedName}/${path}`)
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
  suiteName: 'transaction naming',
  createTests: createTransactionTests
}
