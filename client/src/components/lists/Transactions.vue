<template>

  <div class="transactionsWrapper">

    <div class="transactionsTableBox" v-if="transactions && transactions.length">

      <div class="tableHeader transactionsTable">
        <div class="title">No.</div>
        <div class="title">Block</div>
        <div class="title">From & Amount</div>
        <div class="title">To & Amount</div>
        <!--<div class="title">Total Amount</div>-->
        <div class="title">Fee</div>
        <div class="title">Timestamp</div>
      </div>

      <div class="dataTable">
        <div v-for="(trx,index) in transactions" class="transactionsTable transactionsTableHover" @click="verifyIfIsOpen(trx.transaction,index)" :class="showTransactionClass(index)">

          <div align="left">
            {{ transactions.length - index}}
          </div>

          <div align="left">
            <router-link replace v-bind:to="{ name: 'Block', params: { block_id: trx.block_id }}">{{ trx.block_id}}</router-link>
          </div>

          <div v-if="trx.transaction" class="fromTransaction">
             <span class="addressAndAmount p2pTransaction" v-for="from_address in trx.transaction.from.addresses">
               <a :class=" isReceivingMoney(address,from_address.address,trx.to.address)" :href="'#/miner/' + from_address.address">{{ from_address.address.substring(0,10)}}..{{ from_address.address.substring(from_address.address.length-5) }}</a>
               <span>{{ formatMoneyNumber(from_address.amount,4)}}</span>
             </span>
          </div>
          <div v-else align="left" class="fromTransaction">
             <span class="addressAndAmount p2pTransaction" v-for="from_address in trx.from.addresses">
               <a :class=" isReceivingMoney(address,from_address.address,trx.to.address)" :href="'#/miner/' + from_address.address">{{ from_address.address.substring(0,10)}}..{{ from_address.address.substring(from_address.address.length-5) }}</a>
               <span>{{ formatMoneyNumber(from_address.amount,4)}} </span>
             </span>
          </div>

          <div v-if="trx.transaction" class="toTransaction">

             <span class="addressAndAmount p2pTransaction" v-for="to_address in trx.transaction.to.addresses">
               <a :class=" isReceivingMoney(address,trx.from.address,to_address.address)" :href="'#/miner/' + to_address.address">{{ to_address.address.substring(0,10)}}..{{ to_address.address.substring(to_address.address.length-5) }}</a>
               <span>{{ formatMoneyNumber(to_address.amount,4)}} </span>
             </span>

          </div>
          <div class="toTransaction" v-else >
             <span class="addressAndAmount p2pTransaction" v-for="to_address in trx.to.addresses">
               <a :class=" isReceivingMoney(address,trx.from.address,to_address.address)" :href="'#/miner/' + to_address.address">{{ to_address.address.substring(0,10)}}..{{ to_address.address.substring(to_address.address.length-5) }}</a>
               <span>{{ formatMoneyNumber(to_address.amount,4)}}</span>
             </span>
          </div>

          <!--<div align="left">-->
          <!--{{ formatMoneyNumber(trx.from.amount*10000,4) }}-->
          <!--</div>-->

          <div align="left">
            {{ formatMoneyNumber(trx.fee*10000,4) }}
          </div>

          <div align="left">
            {{ trx.timestamp }}
          </div>
        </div>
      </div>

    </div>

  </div>

</template>

<script>

import Utils from '@/services/utils'
import BlocksService from '@/services/BlocksService'
export default {

  name: 'transactions',

  data: () => {
    return {
      selected: undefined,
      opened: undefined
    }
  },

  props:{
    transactions:{ default:()=>{return [] }},
    address: { default:()=>{return [] }}
  },

  methods: {

    formatMoneyNumber(number, decimals){
      return Utils.formatMoneyNumber(number, decimals);
    },

    isReceivingMoney(mainAddress,compareAddressFrom,compareAddressTo){

      if (compareAddressFrom.includes(mainAddress)) return 'toColor';
      if (compareAddressTo.includes(mainAddress)) return 'fromColor';

      return '';

    },

    showAllAddresses(reff){

      return false;

    },

    verifyIfIsOpen(index){

      if (this.opened!==index){
        this.selected = index;
        this.opened = index;
      }else{
        this.selected = undefined;
        this.opened = undefined;
      }

    },

    showTransactionClass(trx,index){

      var result = '';

      if (!trx) result = 'showCursor';

      if(index!==this.selected) result+= ' selectedTransaction'

      return result;

    }

  }

}
</script>

<style>

  .fromColor, .fromColor a{
    color: #35b151!important;
  }

  .toColor, .toColor a{
    color: #da6654!important;
  }

  .addressAndAmount{
    display: grid!important;
    grid-template-columns: 1fr 1fr ;
  }

  .transactionsTableBox{
    display: block;
    margin: 0 auto;
    width: 100%;
  }

  .transactionsTable{
    width: 1100px!important;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 60px 100px 1fr 1fr 100px 250px;
  }

  .showCursor{
    cursor: pointer;
  }

  .tableHeader{
    background: #fec02c!important;
    color: #000;
    vertical-align: top;
  }

  .tableHeader .title{
    border-bottom: none;
    border-left: solid 1px #353535;
    text-align: center;
    padding: 10px;
  }

  .transactionsTable div{
    text-align: center;
    padding: 10px;
    border-left: solid 1px #505050;
  }

  .transactionsTable div:first-child{
    border:none
  }

  .transactionsTable:nth-child(odd){
    background: #383838;
  }

  .transactionsTableHover:hover {
    background-color: #494c4e !important;
    transition: 0.5s ease;
  }

  .selectedTransaction .toTransaction .p2pTransaction, .selectedTransaction .fromTransaction .p2pTransaction{
    display: none!important;
  }

  .selectedTransaction .toTransaction .p2pTransaction:first-child, .selectedTransaction .fromTransaction .p2pTransaction:first-child{
    display: grid!important;
  }

  /*.showAllTransactions{*/
    /*display: grid!important;*/
  /*}*/

</style>
