const Lucky7Store = artifacts.require('Lucky7Store');
const Lucky7Library = artifacts.require('Lucky7Library');
const Lighthouse = artifacts.require('Lighthouse');
const Web3 = require('web3')

contract('Lucky7Store', (accounts) => {

  // Events function
  const lucky7Event = async (contract, event) => {
    return new Promise((resolve, reject) => {
      contract.once(event, {
        fromBlock: 'latest'
      }, (error, result) => {
        resolve(result);
      })
    })
  }

  // Using websockets to listen to events
  const web3Contract = (address) => {
    const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
    return new web3.eth.Contract(Lucky7Store.abi, address);
  }

  let lucky7Store;
  let web3contract;

  beforeEach(async function () {
    const lightHouse = await Lighthouse.new();
    const lucky7Library = await Lucky7Library.new();
    await Lucky7Store.link('Lucky7Library', lucky7Library.address);
    lucky7Store = await Lucky7Store.new(lightHouse.address, true, true, {
      value: web3.utils.toWei('0.1', 'ether')
    });
    web3contract = web3Contract(lucky7Store.address)
  });

  const user1 = accounts[1];

  it('should sell a random ticket to an user', async () => {
    // For this test, i'm going to call the sellRandomTicket function to sell a random ticket for the user.
    // First, the user should have it mu parameter, i parameter and ticketValue empty, and the muReady, iReady and
    // userPaidTicket booleans of the UserParametersValue of the Lucky7TicketFactory contract setted to false.
    // After calling the sellRandomTicket function, i'll wait for the NewTicketReceived event event to check
    // if the user actually received a ticket. While i wait for the ticket, i'll check if the muReady and iReady are setted
    // to false and the userPaidTicket boolean is setted to true, which means the system identifies the user as one that
    // actually paid for it ticket

    // First, lets check the state of the parameters of the user.
    const initiallUserParameters = await lucky7Store.userValues(user1);
    const initiallMuParameter = initiallUserParameters[0];
    const initiallIParameter = initiallUserParameters[1];
    const initiallTicket = initiallUserParameters[2];
    const initiallMuReadyState = initiallUserParameters[3];
    const initiallIReadyState = initiallUserParameters[4];
    const initiallUserPaidTicketState = initiallUserParameters[5];
    assert.empty(initiallMuParameter, 'mu parameter is not empty at first');
    assert.empty(initiallIParameter, 'i parameter is not empty at first');
    assert.equal(initiallTicket, 0, 'ticket is not 0 at first');
    assert.isFalse(initiallMuReadyState, 'muReady boolean is not false at first');
    assert.isFalse(initiallIReadyState, 'iReady boolean is not false at first');
    assert.isFalse(initiallUserPaidTicketState, 'userPaidTicket boolean is not false at first');

    // Now i'll call the sellRandomTicket function and check inmediatly if the muReady and iReady are setted to false, and userPaidTicket boolean
    // is setted to true, which means the user actually paid for the ticket. The mu, i and ticket generation takes time but the assignment is automatic.
    // Is necessary to shut off the settingLucky7Numbers circuit breaker to buy tickets.
    // As we are using Rhombus contract to obtain mu parameter, it would be 'not empty', 
    // and i parameter would be because we have to wait for the Oraclize response.

    await lucky7Store.toggleLucky7Setting();
    await lucky7Store.sellRandomTicket({
      from: user1,
      value: web3.utils.toWei('0.020', 'ether')
    });
    const secondStateUserParameters = await lucky7Store.userValues(user1);
    const secondStateMuParameter = secondStateUserParameters[0];
    const secondStateIParameter = secondStateUserParameters[1];
    const secondStateTicket = secondStateUserParameters[2];
    const secondStateMuReadyState = secondStateUserParameters[3];
    const secondStateIReadyState = secondStateUserParameters[4];
    const secondStateUserPaidTicketState = secondStateUserParameters[5];
    assert.notEmpty(secondStateMuParameter, 'mu parameter is empty at second state');
    assert.empty(secondStateIParameter, 'i parameter is not empty at second state');
    assert.equal(secondStateTicket, 0, 'ticket is not 0 at second state');
    assert.isTrue(secondStateMuReadyState, 'muReady boolean is not false at second state');
    assert.isFalse(secondStateIReadyState, 'iReady boolean is not false at second state');
    assert.isTrue(secondStateUserPaidTicketState, 'userPaidTicket boolean is not true at second state');

    // Then i'll wait for the NewTicketReceived event and check again if all the values of the UserValuesParameters struct of
    // The Lucky7TicketFactory contract are setted to the proper values.
    // Once the ticket have been delivered, mu and i  are going to be "not empty" (because they're strings, not comparables to 0),
    // ticketValue is going to be different than zero, muReady and iReady are going to be true, i.e. they're already received from
    // the oraclize's callback function of the Lucky7TicketFactory contract, and userPaidTicket is going to be setted to false (which
    // means the user already received the paid ticket and can't receive another ticket until it pays again).

    await lucky7Event(web3contract, 'NewTicketReceived')
    const thirdStateUserParameters = await lucky7Store.userValues(user1);
    const thirdStateMuParameter = thirdStateUserParameters[0];
    const thirdStateIParameter = thirdStateUserParameters[1];
    const thirdStateTicket = thirdStateUserParameters[2];
    const thirdStateMuReadyState = thirdStateUserParameters[3];
    const thirdStateIReadyState = thirdStateUserParameters[4];
    const thirdStateUserPaidTicketState = thirdStateUserParameters[5];
    assert.notEmpty(thirdStateMuParameter, 'mu parameter is empty at third state');
    assert.notEmpty(thirdStateIParameter, 'i parameter is not empty at third state');
    assert.notEqual(thirdStateTicket, 0, 'ticket is 0 at third state');
    assert.isTrue(thirdStateMuReadyState, 'muReady boolean is not true at third state');
    assert.isTrue(thirdStateIReadyState, 'iReady boolean is not true at third state');
    assert.isFalse(thirdStateUserPaidTicketState, 'userPaidTicket boolean is not false at third state');
  });

  it('should sell parameters to an user without converting them to ticket', async () => {
    // For this test, i'm going to call the generateRandomTicket function to generate (but not sell) a random ticket for the user.
    // First, the user should have it mu parameter, i parameter and ticketValue empty, and the muReady, iReady and
    // userPaidTicket booleans of the UserParametersValue of the Lucky7TicketFactory contract setted to false.
    // After calling the generateRandomTicket function, i'll wait for the NewMuParameter and NewIParameter events to check
    // if the user actually received a the parameters.


    // First i'll call the generateRandomTicket function and check inmediatly if the muReady, iReady and userPaidTicket boolean are setted to false,
    // which means the user did not paid for the ticket. The mu and i takes time but the assignment is automatic.
    // Is necessary to shut off the settingLucky7Numbers circuit breaker to buy tickets.
    await lucky7Store.toggleLucky7Setting();
    await lucky7Store.generateRandomTicket({
      from: user1,
      value: web3.utils.toWei('0.020', 'ether')
    });
    const secondStateUserParameters = await lucky7Store.userValues(user1);
    const secondStateMuParameter = secondStateUserParameters[0];
    const secondStateIParameter = secondStateUserParameters[1];
    const secondStateTicket = secondStateUserParameters[2];
    const secondStateMuReadyState = secondStateUserParameters[3];
    const secondStateIReadyState = secondStateUserParameters[4];
    const secondStateUserPaidTicketState = secondStateUserParameters[5];
    assert.notEmpty(secondStateMuParameter, 'mu parameter is not empty at second state');
    assert.empty(secondStateIParameter, 'i parameter is not empty at second state');
    assert.equal(secondStateTicket, 0, 'ticket is not 0 at second state');
    assert.isTrue(secondStateMuReadyState, 'muReady boolean is not false at second state');
    assert.isFalse(secondStateIReadyState, 'iReady boolean is not false at second state');
    assert.isFalse(secondStateUserPaidTicketState, 'userPaidTicket boolean is not false at second state');

    // Then i'll wait for the NewMuReceived and NewIReceived events and check again if all the values of the UserValuesParameters struct of
    // The Lucky7TicketFactory contract are setted to the initial state, i.e. compare them with the parameteres stored above.
    // Once the parameters have been delivered, mu and i are going to be "not empty" (because they're strings, not comparables to 0),
    // ticketValue is going to be zero, muReady and iReady are going to be true, i.e. they're already received from
    // the oraclize's callback function of the Lucky7TicketFactory contract, and userPaidTicket is going to be setted to false (it never
    // never changed because the user did not paid for a ticket).

    await lucky7Event(web3contract, 'GeneratedParametersReceived')
    const thirdStateUserParameters = await lucky7Store.userValues(user1);
    const thirdStateMuParameter = thirdStateUserParameters[0];
    const thirdStateIParameter = thirdStateUserParameters[1];
    const thirdStateTicket = thirdStateUserParameters[2];
    const thirdStateMuReadyState = thirdStateUserParameters[3];
    const thirdStateIReadyState = thirdStateUserParameters[4];
    const thirdStateUserPaidTicketState = thirdStateUserParameters[5];
    assert.notEmpty(thirdStateMuParameter, 'mu parameter is empty at third state');
    assert.notEmpty(thirdStateIParameter, 'i parameter is empty at third state');
    assert.equal(thirdStateTicket, 0, 'ticket is not 0 at third state');
    assert.isTrue(thirdStateMuReadyState, 'muReady boolean is not true at third state');
    assert.isTrue(thirdStateIReadyState, 'iReady boolean is not true at third state');
    assert.isFalse(thirdStateUserPaidTicketState, 'userPaidTicket boolean is not false at third state');
  });

  it('should sell a ticket after a user generated it parameters', async () => {
    // For this test, i'm going to call the generateRandomTicket function to generate (but not sell) a random ticket for the user.
    // Then, i'll call sellGeneratedTicket to actually buy the ticket.
    // First, the user should have it mu parameter, i parameter and ticketValue empty, and the muReady, iReady and
    // userPaidTicket booleans of the UserParametersValue of the Lucky7TicketFactory contract setted to false.
    // After calling the generateRandomTicket function, i'll wait for the NewMuParameter and NewIParameter events to check
    // if the user actually received a the parameters.


    // First i'll call the generateRandomTicket function and check inmediatly if the muReady, iReady and userPaidTicket boolean are setted to false,
    // which means the user did not paid for the ticket. The mu and i takes time but the assignment is automatic.
    // Is necessary to shut off the settingLucky7Numbers circuit breaker to buy tickets.
    await lucky7Store.toggleLucky7Setting();
    await lucky7Store.generateRandomTicket({
      from: user1,
      value: web3.utils.toWei('0.020', 'ether')
    });

    // Then i'll wait for the NewMuReceived and NewIReceived events and check again if all the values of the UserValuesParameters struct of
    // The Lucky7TicketFactory contract are setted to the initial state, i.e. compare them with the parameteres stored above.
    // Once the parameters have been delivered, mu and i are going to be "not empty" (because they're strings, not comparables to 0),
    // ticketValue is going to be zero, muReady and iReady are going to be true, i.e. they're already received from
    // the oraclize's callback function of the Lucky7TicketFactory contract, and userPaidTicket is going to be setted to false (it never
    // never changed because the user did not paid for a ticket).

    await lucky7Event(web3contract, 'GeneratedParametersReceived');
    const firstStateUserParameters = await lucky7Store.userValues(user1);
    const firstStateMuParameter = firstStateUserParameters[0];
    const firstStateIParameter = firstStateUserParameters[1];
    const firstStateTicket = firstStateUserParameters[2];
    const firstStateMuReadyState = firstStateUserParameters[3];
    const firstStateIReadyState = firstStateUserParameters[4];
    const firstStateUserPaidTicketState = firstStateUserParameters[5];
    assert.notEmpty(firstStateMuParameter, 'mu parameter is empty at first state');
    assert.notEmpty(firstStateIParameter, 'i parameter is empty at first state');
    assert.equal(firstStateTicket, 0, 'ticket is not 0 at first state');
    assert.isTrue(firstStateMuReadyState, 'muReady boolean is not true at first state');
    assert.isTrue(firstStateIReadyState, 'iReady boolean is not true at first state');
    assert.isFalse(firstStateUserPaidTicketState, 'userPaidTicket boolean is not false at first state');

    // Now i'm going to call the sellGeneratedTicket function to buy the ticket generated through those parameters.
    // Once called, i'm going to wait for the NewTicketReceived event and check if the mu parameter and i parameter are still the same
    // and if the ticket is not equal to 0,i.e. a ticket was received and stored.
    await lucky7Store.sellGeneratedTicket({
      from: user1,
      value: web3.utils.toWei('0.020', 'ether')
    });
    await lucky7Event(web3contract, 'NewTicketReceived');
    const secondStateUserParameters = await lucky7Store.userValues(user1);
    const secondStateMuParameter = secondStateUserParameters[0];
    const secondStateIParameter = secondStateUserParameters[1];
    const secondStateTicket = secondStateUserParameters[2];
    const secondStateMuReadyState = secondStateUserParameters[3];
    const secondStateIReadyState = secondStateUserParameters[4];
    const secondStateUserPaidTicketState = secondStateUserParameters[5];
    assert.notEmpty(secondStateMuParameter, 'mu parameter is empty at second state');
    assert.notEmpty(secondStateIParameter, 'i parameter is empty at second state');
    assert.notEqual(secondStateTicket, 0, 'ticket is 0 at second state');
    assert.isTrue(secondStateMuReadyState, 'muReady boolean is not true at second state');
    assert.isTrue(secondStateIReadyState, 'iReady boolean is not true at second state');
    assert.isFalse(secondStateUserPaidTicketState, 'userPaidTicket boolean is not false at first state');
  });

  it('should sell parameters and then sell a random ticket', async () => {
    // For this test, i'm going to call the generateRandomTicket function to generate (but not sell) a random ticket for the user.
    // Then, i'll call sellRandomTicket to actually buy a ticket. This way, the test check if the user is capable of generate tickets
    // and buy a random ticket not related with the previous parameters generated.

    // First i'll call the generateRandomTicket.
    await lucky7Store.toggleLucky7Setting();
    await lucky7Store.generateRandomTicket({
      from: user1,
      value: web3.utils.toWei('0.020', 'ether')
    });

    // Then i'll wait for the NewMuReceived and NewIReceived events.
    // Once the parameters have been delivered, mu and i are going to be "not empty" (because they're strings, not comparables to 0),
    // ticketValue is going to be zero, muReady and iReady are going to be true, i.e. they're already received from
    // the oraclize's callback function of the Lucky7TicketFactory contract, and userPaidTicket is going to be setted to false (it never
    // never changed because the user did not paid for a ticket).

    await lucky7Event(web3contract,'GeneratedParametersReceived');
    const firstStateUserParameters = await lucky7Store.userValues(user1);
    const firstStateMuParameter = firstStateUserParameters[0];
    const firstStateIParameter = firstStateUserParameters[1];
    const firstStateTicket = firstStateUserParameters[2];
    assert.notEmpty(firstStateMuParameter, 'mu parameter is empty at first state');
    assert.notEmpty(firstStateIParameter, 'i parameter is empty at first state');
    assert.equal(firstStateTicket, 0, 'ticket is not 0 at first state');

    // Now i'm going to call the sellRandomTicket function to buy a random ticket.
    // Once called, i'm going to wait for the NewTicketReceived event and check if the mu parameter and i parameter are not the same
    // and if the ticket is not equal to 0, i.e. a ticket was received and stored.
    await lucky7Store.sellRandomTicket({
      from: user1,
      value: web3.utils.toWei('0.020', 'ether')
    });
    await lucky7Event(web3contract,'NewTicketReceived');
    const secondStateUserParameters = await lucky7Store.userValues(user1);
    const secondStateMuParameter = secondStateUserParameters[0];
    const secondStateIParameter = secondStateUserParameters[1];
    const secondStateTicket = secondStateUserParameters[2];
    assert.notEmpty(secondStateMuParameter, 'mu parameter is empty at second state');
    assert.notEmpty(secondStateIParameter, 'i parameter is empty at second state');
    assert.notEqual(secondStateTicket, 0, 'ticket is 0 at second state');
    assert.notEqual(secondStateMuParameter, firstStateMuParameter, 'mu parameters of both states are equal');
    assert.notEqual(secondStateIParameter, firstStateIParameter, 'i parameters of both states are equal');
  });

  it('should sell a random ticket and generate new parameters without replacing the current ticket', async () => {
    // For this test, i'm going to call the sellRandomTicket function to sell a random ticket to the user.
    // Then, i'll call generateRandomTicket to generate new parameters. This way, the test check if the user keep it last ticket

    await lucky7Store.toggleLucky7Setting();
    await lucky7Store.sellRandomTicket({
      from: user1,
      value: web3.utils.toWei('0.020', 'ether')
    });

    // Then i'll wait for the NewTicketReceived event.
    // Once the ticket have been delivered, mu and i are going to be "not empty" (because they're strings, not comparables to 0) and
    // ticketValue is not going to be zero.

    await lucky7Event(web3contract,'NewTicketReceived');
    const firstStateUserParameters = await lucky7Store.userValues(user1);
    const firstStateMuParameter = firstStateUserParameters[0];
    const firstStateIParameter = firstStateUserParameters[1];
    const firstStateTicket = firstStateUserParameters[2];
    assert.notEmpty(firstStateMuParameter, 'mu parameter is empty at first state');
    assert.notEmpty(firstStateIParameter, 'i parameter is empty at first state');
    assert.notEqual(firstStateTicket, 0, 'ticket is 0 at first state');

    // Now i'm going to call the generateRandomTicket function to buy a generate a random ticket (without buying it).
    // Once called, i'm going to wait for the NewMuReceived and NewIReceived event and check if the mu parameter and i parameter are not the same
    // as before, and if the ticket is the same as before, i.e. parameters were received but the ticket did not changed.
    await lucky7Store.generateRandomTicket({
      from: user1,
      value: web3.utils.toWei('0.020', 'ether')
    });
    await lucky7Event(web3contract,'GeneratedParametersReceived');
    const secondStateUserParameters = await lucky7Store.userValues(user1);
    const secondStateMuParameter = secondStateUserParameters[0];
    const secondStateIParameter = secondStateUserParameters[1];
    const secondStateTicket = secondStateUserParameters[2];
    assert.notEqual(secondStateMuParameter, firstStateMuParameter, 'mu parameters are equal');
    assert.notEqual(secondStateIParameter, firstStateIParameter, 'i parameters are equal');
    assert.equal(parseInt(secondStateTicket), parseInt(firstStateTicket), 'tickets are not equal');
  });
});
