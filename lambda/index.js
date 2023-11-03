import Alexa from 'ask-sdk-core';
import { DynamoDbPersistenceAdapter } from 'ask-sdk-dynamodb-persistence-adapter';
import { sendSkillMessage } from './api/skillMessaging.js';
import SyncListClient from './client.js';
import { createEventSchedule, deleteEventSchedule } from './events.js';

const HouseholdListEventHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'AlexaHouseholdListEvent.ItemsCreated' ||
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'AlexaHouseholdListEvent.ItemsUpdated' ||
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'AlexaHouseholdListEvent.ItemsDeleted'
    );
  },
  async handle(handlerInput) {
    try {
      // Get latest user attributes from database
      const attributes = await handlerInput.attributesManager.getPersistentAttributes();
      // Define request object
      const request = {
        ...handlerInput.requestEnvelope.request.body,
        // timestamp: handlerInput.requestEnvelope.request.timestamp,
        type: Alexa.getRequestType(handlerInput.requestEnvelope).split('.').pop()
      };
      // Initialize sync list client
      const client = new SyncListClient(
        handlerInput.serviceClientFactory.getListManagementServiceClient(),
        attributes.syncedList
      );
      // Update synced list attribute based on OurGroceries list changes
      attributes.syncedList = await client.updateOurGroceriesList(request);
      console.info('OurGroceries shopping list has been synced.', JSON.stringify(attributes.syncedList));
      // Store latest user attributes to database
      handlerInput.attributesManager.setPersistentAttributes(attributes);
      await handlerInput.attributesManager.savePersistentAttributes();
      console.info('User attributes have been saved.');
    } catch (error) {
      console.error('Failed to handle household list items event:', error.message);
    }
  }
};

const SkillEventHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'AlexaSkillEvent.SkillDisabled' ||
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'AlexaSkillEvent.SkillPermissionAccepted' ||
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'AlexaSkillEvent.SkillPermissionChanged'
    );
  },
  async handle(handlerInput) {
    try {
      // Determine accepted permissions
      const permissions = (handlerInput.requestEnvelope.request.body.acceptedPermissions || []).map((permission) =>
        permission.scope.split(':').pop()
      );
      // Update alexa shopping list if read/write permissions accepted, otherwise clean up database
      if (permissions.includes('read') && permissions.includes('write')) {
        // Initialize sync list client
        const client = new SyncListClient(handlerInput.serviceClientFactory.getListManagementServiceClient());
        // Define attributes object with synced list based on Alexa list changes
        const attributes = {
          clientId: process.env.OUR_GROCERIES_USERNAME,
          syncedList: await client.updateAlexaList()
        };
        console.info('Alexa shopping list has been synced.', JSON.stringify(attributes.syncedList));
        // Store user attributes to database
        handlerInput.attributesManager.setPersistentAttributes(attributes);
        await handlerInput.attributesManager.savePersistentAttributes();
        console.info('User attributes have been saved.');
        // Create OurGroceries list sync event schedule
        await createEventSchedule(
          handlerInput.context.invokedFunctionArn,
          Alexa.getUserId(handlerInput.requestEnvelope)
        );
        console.info('Event schedule has been created.');
      } else {
        // Delete user attributes to database
        await handlerInput.attributesManager.deletePersistentAttributes();
        console.info('User attributes have been deleted.');
        // Delete OurGroceries list sync event schedule
        await deleteEventSchedule();
        console.info('Event schedule has been deleted.');
      }
    } catch (error) {
      console.error('Failed to handle skill permission event:', error.message);
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
      const attributes = await handlerInput.attributesManager.getPersistentAttributes();
      // Initialize sync list client
      const client = new SyncListClient(handlerInput.serviceClientFactory.getListManagementServiceClient());
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
      console.error('Failed to handle skill messaging event:', error.message);
    }
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Request error:', error);
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
  tableName: process.env.TABLE_NAME,
  partitionKeyName: 'userId'
});

const scheduledEventHandler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event));
    // Send skill message if relevant event type
    if (event.type === 'skillMessaging') {
      await sendSkillMessage(event.userId, event.message);
      console.log('Skill message sent:', JSON.stringify(event.message));
    }
  } catch (error) {
    console.error(`Failed to handle scheduled event ${event.type}:`, error.message);
  }
};

const skillHandler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(HouseholdListEventHandler, SkillEventHandler, SkillMessagingHandler)
  .addErrorHandlers(ErrorHandler)
  .addRequestInterceptors(LogRequestInterceptor)
  .withApiClient(new Alexa.DefaultApiClient())
  .withPersistenceAdapter(persistenceAdapter)
  .withSkillId(process.env.SKILL_ID)
  .lambda();

export const handler = (event, context, callback) =>
  (event.source === 'aws.events' ? scheduledEventHandler : skillHandler)(event, context, callback);
