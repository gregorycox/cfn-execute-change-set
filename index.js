#!/usr/bin/env node
'use strict'

const readline = require('readline')

const chalk = require('chalk')
const ttys = require('ttys')

const analysis = require('./lib/analysis')
const cfn = require('./lib/cfn')
const helpers = require('./lib/helpers')
const renderers = require('./lib/renderers')

let found = false

/**
 * Checks the given input for CloudFormation changeset ARN and
 * starts review if one is found.
 *
 * @param {String} input the input to parse
 */
function maybeReviewChangeSet (input) {
  if (found) {
    return
  }

  const info = helpers.getChangeSetInfoFromInput(input)
  if (!info) {
    return
  }

  found = true

  cfn.describeChangeSet(info, function (err, data) {
    if (err) throw err

    const resourceChanges = analysis.analyzeResourceChanges(data.changeset)
    printResourceChanges(resourceChanges)

    const tagChanges = analysis.analyzeTagChanges(data.changeset, data.stack)
    printKeyValueChanges(tagChanges, 'Tag Changes')

    const parameterChanges = analysis.analyzeParameterChanges(data.changeset, data.stack)
    printKeyValueChanges(parameterChanges, 'Parameter Changes')

    promptAndExecuteChanges(data.changeset)
  })
}

/**
 * @typedef KeyValueChange
 * @property {String} Key
 * @property {String} Value
 * @property {String} [OldValue]
 */

/**
 * @typedef KeyValueChanges
 * @property {KeyValueChange[]} added
 * @property {KeyValueChange[]} removed
 * @property {KeyValueChange[]} modified
 */

/**
 * @param {KeyValueChanges} changes
 */
function printKeyValueChanges (changes, title) {
  if (!changes.added.length && !changes.removed.length && !changes.modified.length) {
    // No tag changes!
    return
  }

  console.log() // Print empty line to separate this from previous section
  console.log(chalk.bold(title))
  /**
   * @param {String} action
   * @param {KeyValueChange[]} changes
   */
  function _printKeyValueChanges (action, changes) {
    for (let change of changes) {
      const type = renderers.renderAction({ Action: action })
      const summary = renderers.renderKeyValueChange(change)
      console.log(`${type} ${summary}`)
    }
  }

  _printKeyValueChanges('Add', changes.added)
  _printKeyValueChanges('Remove', changes.removed)
  _printKeyValueChanges('Modify', changes.modified)
}

/**
 * @param {Object} changes
 * @param {AWS.CloudFormation.ResourceChange[]} changes.added
 * @param {AWS.CloudFormation.ResourceChange[]} changes.removed
 * @param {AWS.CloudFormation.ResourceChange[]} changes.modified
 */
function printResourceChanges (changes) {
  /**
   * @param {AWS.CloudFormation.ResourceChange[]} changes
   */
  function _printResources (changes) {
    for (let change of changes) {
      const type = renderers.renderAction(change)
      const resource = renderers.renderResourceSummary(change)
      const replacement = renderers.renderReplacement(change)
      console.log(`${type} ${resource}${replacement}`)

      for (let detail of change.Details) {
        const recreation = renderers.renderRecreation(detail)
        console.log(`    - ${detail.Summary}${recreation}`)
        for (let cause of (detail.Causes || [])) {
          console.log(`        caused by ${cause}`)
        }
      }
    }
  }

  console.log(chalk.bold('Resource Changes'))
  _printResources(changes.added)
  _printResources(changes.removed)
  _printResources(changes.modified)
}

/**
 * @param {AWS.CloudFormation.DescribeChangeSetOutput} changeset
 */
function promptAndExecuteChanges (changeset) {
  const i = readline.createInterface(ttys.stdin, ttys.stdout)
  console.log() // Empty line
  i.question('Execute change set [y/N]? ', function (answer) {
    if (answer === 'y') {
      console.log('Executing change set...')
      cfn.executeChangeSet(changeset)
    } else {
      console.log('Skipping change set execution')
      process.exit(0)
    }
  })
}

// See if we have a changeset ARN(s) given as command line argument(s)
if (process.argv.length > 2) {
  maybeReviewChangeSet(process.argv[2])
}

// Also check if we have been piped some input and detect changeset
// IDs from there
if (!process.stdin.isTTY) {
  const rl = readline.createInterface({
    input: process.stdin
  })

  rl.on('line', line => {
    // echo to stdout
    console.log(line)
    maybeReviewChangeSet(line)
  })
}
