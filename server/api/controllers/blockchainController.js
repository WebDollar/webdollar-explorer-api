'use strict';
var atob = require('atob'),
  bs58 = require('bs58'),
  crypto = require('crypto'),
  request = require('request'),
  requestPromise = require('request-promise'),
  config = require('../../config'),
  BlockchainDB = require('nano')(config.couchdb.host).use(config.couchdb.db_name),
  BlockchainSyncerDB = require('nano')(config.couchdb.host).use(config.couchdb.syncer.db_name),
  blockchainUtils = require('../blockchain/utils');

const AMOUNT_DIVIDER = 10000
const REWARD = AMOUNT_DIVIDER * 6000
const ADDRESS_CACHE_DB = "address"
const BALANCE_RATIO_DECIMALS = 5
const MAX_POOLED_TRXS = 15
const MAX_DEPTH = 1

function getEmptyAddress(miner_address) {
  return {
    'address': miner_address,
    'balance': 0,
    'total_supply_ratio': 0,
    'last_block': 0,
    'miner_balance': 0,
    'miner_fee_balance': 0,
    'miner_fee_to_balance': 0,
    'trx_to_balance': 0,
    'trx_from_balance': 0,
    'blocks': [],
    'transactions': []
  }
}

exports.list_all_blocks = function(req, res) {
  var blocks = [];
  var max_block_length;
  var max_blocks = 14;

  res.header("Access-Control-Allow-Origin", "*");
  res.header("Cache-Control", "public, max-age=10")

  request.get(config.webdollar.pouchdb_sync_url + '/blocks/' + max_blocks, function (error, response, body) {
    if (error) {
      console.error(error)
      console.error(body)
    } else {
      try {
        var raw_blocks = JSON.parse(body).blocks
        raw_blocks.forEach(function(block) {
          block.reward = block.reward / AMOUNT_DIVIDER
          var date = new Date((block.raw_timestamp + 1524742312) * 1000)
          block.timestamp = date.toUTCString()
          block.reward = block.reward / AMOUNT_DIVIDER
          block.miner_address = blockchainUtils.decodeMinerAddress(block.miner_address)
          blocks.push(block)
        })
      } catch(ex) {
        console.error(body)
        console.error(ex.message)
      }
    }

    blocks = blocks.sort((a, b) => Number(b.block_id) - Number(a.block_id))
    res.json(blocks)
    return
  });
}

exports.read_a_block = function(req, res) {
  var blockId = parseInt(req.params.blockId);
  var block = {}

  res.header("Access-Control-Allow-Origin", "*");
  res.header("Cache-Control", "public, max-age=10")

  request.get(config.webdollar.pouchdb_sync_url + '/block/' + blockId, function (error, response, body) {
    if (error) {
      console.error(error)
      console.error(body)
    } else {
      try {
        block = JSON.parse(body).block
        block.reward = block.reward / AMOUNT_DIVIDER
        block.miner_address = blockchainUtils.decodeMinerAddress(block.miner_address)
        var date = new Date((block.raw_timestamp + 1524742312) * 1000)
        block.timestamp = date.toUTCString()
        var transactions_parsed = []

        block.trxs.forEach(function(transaction) {
          var transaction_parsed = transaction
          transaction_parsed.block_id = block.id
          transaction_parsed.id = block.id
          transaction_parsed.timestamp = block.timestamp
          transaction_parsed.fee = 0
          var to_amount = 0

          transaction_parsed.from.address = []
          transaction_parsed.from.amount = 0

          transaction_parsed.from.addresses.forEach(function(from) {
            transaction_parsed.from.address.push(from.address)
            transaction_parsed.from.amount += parseInt(from.amount)
          })

          transaction_parsed.to.address = []
          transaction_parsed.to.addresses.forEach(function(to) {
            transaction_parsed.to.address.push(to.address)
            to_amount += parseInt(to.amount)
          })

          transaction_parsed.fee = transaction_parsed.from.amount - to_amount
          transaction_parsed.fee = transaction_parsed.fee / AMOUNT_DIVIDER
          transaction_parsed.from.amount = transaction_parsed.from.amount / AMOUNT_DIVIDER

          transactions_parsed.push(transaction_parsed)
        })

        block.trxs = transactions_parsed
        block.transactions_number = block.trxs.length
      } catch(ex) {
        console.error(body)
        console.error(ex.message)
      }
    }
    res.json(block)
    return
  });
}

exports.read_an_address = function (req, res) {
  var miner_address = req.params.address
  var show_all_transactions = false
  if (req.query.show_all_transactions) {
    if (req.query.show_all_transactions == 'true' || req.query.show_all_transactions === true) {
      show_all_transactions = true
      console.log('Showing all trxs for address:' + miner_address)
    }
  }
  var miner = getEmptyAddress(miner_address)

  res.header("Cache-Control", "public, max-age=100")
  res.header("Access-Control-Allow-Origin", "*");

  if (miner_address.length != 40) {
    console.log("Address " + miner_address + " is not 40 char long")
    res.json(miner);
    return
  }
  request.get(config.webdollar.pouchdb_sync_url + '/address/' + encodeURIComponent(miner_address), function (error, response, body) {
    if (error) {
      console.error(error)
      res.json(miner)
      return
    }
    try {
      var miner_received = JSON.parse(body)
      miner.balance = miner_received.balance
      miner.last_block = miner_received.last_block
      if (miner.last_block) {
        var totalSupply = blockchainUtils.getTotalSupply(miner.last_block)
        miner.total_supply_ratio = (miner.balance / totalSupply * 100).toFixed(BALANCE_RATIO_DECIMALS)
      }

      var blocks_parsed = []
      miner_received.minedBlocks.forEach(function(block) {
        var block_parsed = block
        block_parsed.block_id = block_parsed.blockId
        block_parsed.id = block_parsed.blockId
        var date = new Date((block_parsed.timestamp + 1524742312) * 1000)
        block_parsed.timestamp = date.toUTCString()
        block_parsed.trxs = block_parsed.transactions

        blocks_parsed.push(block_parsed)
      })
      miner.blocks = blocks_parsed
      miner.blocks = miner.blocks.sort((a, b) => Number(b.block_id) - Number(a.block_id))

      var transactions_parsed = []
      miner.trx_to_balance = 0
      miner.trx_from_balance = 0

      miner_received.transactions =  miner_received.transactions.sort((a, b) => Number(b.blockId) - Number(a.blockId))
      miner.pooled_trxs = 0
      miner_received.transactions.forEach(function(transaction) {
        var transaction_parsed = transaction
        transaction_parsed.block_id = transaction.blockId
        transaction_parsed.id = transaction.blockId
        var date = new Date((transaction.timestamp + 1524742312) * 1000)
        transaction_parsed.timestamp = date.toUTCString()
        transaction_parsed.fee = 0
        var to_amount = 0

        transaction_parsed.from = {
          amount: 0,
          address: []
        }
        if (transaction_parsed.transaction.from.addresses.length > 1 || transaction_parsed.transaction.to.addresses.length > 1) {
          miner.pooled_trxs += 1
        }
        transaction_parsed.transaction.from.addresses.forEach(function(from) {
          transaction_parsed.from.address.push(from.address)
          transaction_parsed.from.amount += parseInt(from.amount)
          if (miner.address == from.address) {
            miner.trx_to_balance += parseInt(from.amount)
          }
        })

        transaction_parsed.to = {
          address: []
        }
        transaction_parsed.transaction.to.addresses.forEach(function(to) {
          transaction_parsed.to.address.push(to.address)
          to_amount += parseInt(to.amount)
          if (miner.address == to.address) {
            miner.trx_from_balance += parseInt(to.amount)
          }
        })

        transaction_parsed.fee = transaction_parsed.from.amount - to_amount
        transaction_parsed.fee = transaction_parsed.fee / AMOUNT_DIVIDER
        transaction_parsed.from.amount = transaction_parsed.from.amount / AMOUNT_DIVIDER

        transactions_parsed.push(transaction_parsed)
      })
      miner.transactions = transactions_parsed
      miner.transactions_number = miner.transactions.length
      if (!show_all_transactions && miner.pooled_trxs > MAX_POOLED_TRXS) {
        miner.transactions = miner.transactions.slice(0,MAX_POOLED_TRXS)
      }
      miner.miner_balance = (miner.balance * AMOUNT_DIVIDER + miner.trx_to_balance - miner.trx_from_balance) / AMOUNT_DIVIDER
      miner.trx_to_balance = miner.trx_to_balance / AMOUNT_DIVIDER
      miner.trx_from_balance = miner.trx_from_balance / AMOUNT_DIVIDER

      res.json(miner)
      return
    } catch (exception) {
      console.log(exception.message)
      res.json(miner)
      return
    }
  })
}

async function getStars(address, depth, addresses, stars, first) {

  let first_depth = depth * 13
  if (first || depth == MAX_DEPTH + 1) {
    first_depth = 1001
  }
  if (!addresses.includes(address)) {
    addresses.push(address)
    stars.nodes.push({
      id: address,
      group: first_depth
    })
  }

  var options = {
    uri: config.webdollar.pouchdb_sync_url + '/address/' + encodeURIComponent(address),
    json: true
  };

  let address_info = await requestPromise(options)
    try {
      let current_addresses = []
      address_info.transactions.forEach(function(transaction) {
        let is_from = false
        let is_to = false
        let from_addresses = []
        let to_addresses = []
        transaction.transaction.from.addresses.forEach(function(from) {
          if (!addresses.includes(from.address)) {
            from_addresses.push(from.address)
          }
          if (from.address == address) {
            is_from = true
          }
        })
        transaction.transaction.to.addresses.forEach(function(to) {
          if (!addresses.includes(to.address)) {
            to_addresses.push(to.address)
          }
          if (to.address == address) {
            is_to = true
          }
        })
        if (is_from) {
          current_addresses = current_addresses.concat(to_addresses)
        }
        if (is_to) {
          current_addresses = current_addresses.concat(from_addresses)
        }
      })

      current_addresses.forEach(function(curr_address) {
        if (!addresses.includes(curr_address)) {
          console.log("Found star: " + curr_address)
          addresses.push(curr_address)
          stars.nodes.push({
            id: curr_address,
            group: (depth + 1) * 13
          });
          stars.links.push({
            source: address,
            target: curr_address,
            value: 1
          });
        }
      })
      if (depth == 1) {
        return Promise.resolve(stars)
      } else {
        let stars1 = []
        current_addresses.forEach(function(curr_address) {
          stars1 = Promise.resolve(getStars(curr_address, depth - 1, addresses, stars))
        })
        return Promise.resolve(stars1)
      }
    } catch (exception) {
      console.log(exception.message)
      return stars
    }
}

exports.get_stars = async function (req, res) {
  res.header("Cache-Control", "public, max-age=1000")
  res.header("Access-Control-Allow-Origin", "*");

  let address = req.params.address;
  let depth = 1;
  if (req.query.depth) {
    depth = parseInt(req.query.depth);
  }

  if (address.length != 40 || depth > MAX_DEPTH + 1) {
    res.json(false);
    return
  }
  console.log("Getting stars for address: " + address + ", depth: " + depth)
  let stars = await getStars(address, depth, [], { nodes: [], links: []}, true)
  res.json(stars);
  return;
}
