import Api from '@/services/Api'
require('axios-debug-log')

export default {

  fetchBlocks (pageNumber, minerAddress, resolverAddress) {
    if (!pageNumber) {
      pageNumber = 1
    }
    let extraURLParams = '?page_number=' + pageNumber
    if (minerAddress) {
      extraURLParams += '&miner=' + encodeURIComponent(minerAddress)
    }
    if (resolverAddress) {
      extraURLParams += '&resolver=' + encodeURIComponent(resolverAddress)
    }
    return Api().get('block' + extraURLParams)
  },

  fetchBlock (blockId) {
    return Api().get('block/' + blockId)
  },

  fetchMiner (minerAddress, showAllTransactions, startDate, endDate) {
    let extraURLParams = '?show_all_transactions=false'
    if (showAllTransactions) {
      extraURLParams = '?show_all_transactions=true'
    }
    if (startDate && endDate) {
      extraURLParams += '&start_date=' + startDate + '&end_date=' + endDate
    }
    return Api().get('address/' + encodeURIComponent(minerAddress) + extraURLParams)
  },

  fetchStars (starUrl) {
    return Api().get('stars/' + starUrl)
  },

  fetchPendingTransactions () {
    return Api().get('pending_trx')
  },

  fetchLatestTransactions () {
    return Api().get('latest_trx')
  },

  fetchLatestMiners () {
    return Api().get('latest_miners')
  },

  fetchTransactions (pageNumber, minerAddress, isFrom, isTo, trxType) {
    if (!pageNumber) {
      pageNumber = 1
    }
    let extraURLParams = '?page_number=' + pageNumber
    if (minerAddress) {
      extraURLParams += '&miner=' + encodeURIComponent(minerAddress)
    }
    if (isFrom) {
      extraURLParams += '&is_from=' + isFrom
    }
    if (isTo) {
      extraURLParams += '&is_to=' + isTo
    }
    if (trxType) {
      extraURLParams += '&trx_type=' + trxType
    }

    return Api().get('trx' + extraURLParams)
  },

  fetchUncles () {
    return Api().get('uncle')
  }
}
