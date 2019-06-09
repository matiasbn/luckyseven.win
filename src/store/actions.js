/* eslint-disable max-len */

import getWeb3 from '@/web3/getWeb3';
import truffleContract from '@/web3/truffleContract';
import Web3 from 'web3';

const web3 = new Web3(window.web3.currentProvider);

export default {
  async listenEvents({ commit }, payload) {
    const account = payload;
    const truffleContractInstance = await truffleContract(window.web3.currentProvider).deployed();
    truffleContractInstance
      .NewMuReceived({ owner: account }, (error, event) => {
        if (!error) {
          const payloadEvent = {
            value: event.returnValues.muParameter,
            type: 'mu',
          };
          commit('parameterReceived', payloadEvent);
        }
      });
    truffleContractInstance
      .NewIReceived({ owner: account }, (error, event) => {
        if (!error) {
          const payloadEvent = {
            value: event.returnValues.iParameter,
            type: 'i',
          };
          commit('parameterReceived', payloadEvent);
        }
      });
    truffleContractInstance
      .NewTicketReceived({ owner: account }, (error, event) => {
        if (!error) {
          const payloadEvent = {
            value: event.returnValues.newTicket,
            type: 'ticket',
          };
          commit('parameterReceived', payloadEvent);
        }
      });
    truffleContractInstance
      .NewLucky7Ticket({ owner: account }, (error, event) => {
        if (!error) {
          commit('newLucky7Ticket', event.returnValues);
        }
      });
    truffleContractInstance
      .BalanceUpdated((error, event) => {
        if (!error) {
          commit('balanceUpdated', event.returnValues.balance);
        }
      });
  },
  registerWeb3({ commit }) {
    getWeb3.then((result) => {
      commit('registerWeb3Instance', result);
    }).catch((e) => {
      console.log(e);
    });
  },
  pollWeb3({ commit }, payload) {
    commit('pollWeb3Instance', payload);
  },
  async retrieveGameInformation({ commit }) {
    const truffleContractInstance = await truffleContract(window.web3.currentProvider).deployed();
    const numberOfLucky7Numbers = parseInt(await truffleContractInstance.numberOfLucky7Numbers(), 10);
    const coinbase = await web3.eth.getCoinbase();
    const lucky7NumbersPromises = [];
    const lucky7TicketsValuePromises = [];
    const lucky7TicketsOwnerPromises = [];
    const lucky7TicketsDiffPromises = [];
    for (let i = 0; i < numberOfLucky7Numbers; i += 1) {
      lucky7NumbersPromises.push(truffleContractInstance.lucky7NumbersArray(i));
      lucky7TicketsValuePromises.push(truffleContractInstance.lucky7TicketValue(i));
      lucky7TicketsOwnerPromises.push(truffleContractInstance.lucky7TicketOwner(i));
      lucky7TicketsDiffPromises.push(truffleContractInstance.lucky7TicketDifference(i));
    }
    const lucky7NumbersValues = await Promise.all(lucky7NumbersPromises);
    const lucky7TicketsValues = await Promise.all(lucky7TicketsValuePromises);
    const lucky7TicketsOwners = await Promise.all(lucky7TicketsOwnerPromises);
    const lucky7TicketsDiffs = await Promise.all(lucky7TicketsDiffPromises);
    const lucky7Numbers = [];
    const lucky7Tickets = [];
    for (let i = 0; i < numberOfLucky7Numbers; i += 1) {
      lucky7Numbers[i] = parseInt(lucky7NumbersValues[i].ticketValue, 10);
      lucky7Tickets[i] = {
        ticket: parseInt(lucky7TicketsValues[i], 10),
        owner: lucky7TicketsOwners[i],
        difference: parseInt(lucky7TicketsDiffs[i], 10),
      };
    }
    const valuesPromises = [
      truffleContractInstance.generateTicketPrice(),
      truffleContractInstance.sellTicketPrice(),
      truffleContractInstance.userValues(coinbase),
      truffleContractInstance.pendingWithdrawals(coinbase),
    ];

    const values = await Promise.all(valuesPromises);
    console.log(values[3].gameID.toNumber());
    const payload = {
      lucky7Numbers,
      lucky7Tickets,
      generateTicketPrice: values[0],
      sellTicketPrice: values[1],
      userValues: values[2],
      currentPrize: values[3],
      prizeGameID: values[3].gameID.toNumber(),
    };
    commit('retrieveGameInfoInstance', payload);
  },
  async parameterReceived({ commit }, payload) {
    commit('parameterReceived', payload);
  },
  async askForValues({ commit }, payload) {
    commit('askForValues', payload);
  },
};
