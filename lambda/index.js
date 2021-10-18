'use strict';

const Alexa = require('ask-sdk-core');
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');
const SkillMessagingApi = require('./api/skillMessaging.js');
const SyncListClient = require('./client.js');
const events = require('./events.js');
const config = require('./config.js');

const HouseholdListEventHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'AlexaHouseholdListEvent.ItemsCreated' ||
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'AlexaHouseholdListEvent.ItemsUpdated' ||
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'AlexaHouseholdListEvent.ItemsDeleted';
  },
  async handle(handlerInput) {
    try {
      // Get latest user attributes from database
      const attributes = await handlerInput.attributesManager.getPersistentAttributes();
      // Define request object
      const request = Object.assign(handlerInput.requestEnvelope.request.body, {
        // timestamp: handlerInput.requestEnvelope.request.timestamp,
        type: Alexa.getRequestType(handlerInput.requestEnvelope).split('.').pop()
      });
      // Initialize sync list client
      const client = new SyncListClient(
        handlerInput.serviceClientFactory.getListManagementServiceClient(), attributes.syncedList);
      // Update synced list attribute based on OurGroceries list changes
      attributes.syncedList = await client.updateOurGroceriesList(request);
      console.info('OurGroceries shopping list has been synced.', JSON.stringify(attributes.syncedList));
      // Store latest user attributes to database
      handlerInput.attributesManager.setPersistentAttributes(attributes);
      await handlerInput.attributesManager.savePersistentAttributes();
      console.info('User attributes have been saved.');
    } catch (error) {
      console.error('Failed to handle household list items event:', JSON.stringify(error));
    }
  }
};

const SkillEventHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'AlexaSkillEvent.SkillDisabled' ||
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'AlexaSkillEvent.SkillPermissionAccepted' ||
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'AlexaSkillEvent.SkillPermissionChanged';
  },
  async handle(handlerInput) {
    try {
      // Define attributes object
      const attributes = {
        clientId: config.OUR_GROCERIES_USERNAME
      };
      // Determine accepted permissions
      const permissions = (handlerInput.requestEnvelope.request.body.acceptedPermissions || []).map(
        permission => permission.scope.split(':').pop());

      // Update alexa shopping list if read/write permissions accepted, otherwise clean up database
      if (permissions.includes('read') && permissions.includes('write')) {
        // Initialize sync list client
        const client = new SyncListClient(
          handlerInput.serviceClientFactory.getListManagementServiceClient());
        // Update synced list attribute based on Alexa list changes
        attributes.syncedList = await client.updateAlexaList();
        console.info('Alexa shopping list has been synced.', JSON.stringify(attributes.syncedList));
        // Store user attributes to database
        handlerInput.attributesManager.setPersistentAttributes(attributes);
        await handlerInput.attributesManager.savePersistentAttributes();
        console.info('User attributes have been saved.');
        // Create OurGroceries list sync event schedule
        await events.createSchedule(
          handlerInput.context.invokedFunctionArn, Alexa.getUserId(handlerInput.requestEnvelope));
        console.info('Event schedule has been created.');
      } else {
        // Delete user attributes to database
        await handlerInput.attributesManager.deletePersistentAttributes();
        console.info('User attributes have been deleted.');
        // Delete OurGroceries list sync event schedule
        await events.deleteSchedule();
        console.info('Event schedule has been deleted.');
      }
    } catch (error) {
      console.error('Failed to handle skill permission event:', JSON.stringify(error));
    }
  }
};

const SkillMessagingHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Messaging.MessageReceived';
  },
  async handle(handlerInput) {
    try {
      // Get latest user attributes from database
      const attributes = await handlerInput.attributesManager.getPersistentAttributes()
      // Initialize sync list client
      const client = new SyncListClient(
        handlerInput.serviceClientFactory.getListManagementServiceClient());
      // Update synced list attribute based on Alexa list changes if requested
      if (handlerInput.requestEnvelope.request.message.event === 'updateAlexaList') {
        attributes.syncedList = await client.updateAlexaList();
        console.info('Alexa shopping list has been synced.', JSON.stringify(attributes.syncedList));
      }
      // Store user attributes to database
      handlerInput.attributesManager.setPersistentAttributes(attributes);
      await handlerInput.attributesManager.savePersistentAttributes();
      console.info('User attributes have been saved.');
    } catch (error) {
      console.error('Failed to handle skill messaging event:', JSON.stringify(error));
    }
  }
}

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Request error:', JSON.stringify(error));
  }
};

const LogRequestInterceptor = {
  process(handlerInput) {
    if (typeof handlerInput.requestEnvelope !== 'undefined') {
      console.log('Request received:', JSON.stringify(handlerInput.requestEnvelope));
    }
  }
};

const persistenceAdapter = new DynamoDbPersistenceAdapter({
  tableName: config.AWS_TABLE_NAME,
  partitionKeyName: 'userId'
});

const scheduledEventHandler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event));
    // Send skill message if relevant event type
    if (event.type === 'skillMessaging') {
      const api = new SkillMessagingApi(
        config.ALEXA_API_URL, config.SKILL_CLIENT_ID, config.SKILL_CLIENT_SECRET, event.userId);
      await api.sendMessage(event.message);
      console.log('Skill message sent:', JSON.stringify(event.message));
    }
  } catch (error) {
    console.error(`Failed to handle scheduled event ${event.type}:`, JSON.stringify(error));
  }
};

const skillHandler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    HouseholdListEventHandler,
    SkillEventHandler,
    SkillMessagingHandler
  )
  .addErrorHandlers(ErrorHandler)
  .addRequestInterceptors(LogRequestInterceptor)
  .withApiClient(new Alexa.DefaultApiClient())
  .withPersistenceAdapter(persistenceAdapter)
  .withSkillId(config.SKILL_ID)
  .lambda();

exports.handler = (event, context, callback) =>
  (event.source === 'aws.events' ? scheduledEventHandler : skillHandler)(event, context, callback);
