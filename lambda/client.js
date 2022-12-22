import OurGroceriesClient from './api/ourGroceries.js';

/**
 * Defines item value pattern
 * @type {RegExp}
 */
const ITEM_VALUE_PATTERN = /^([\w\s]+)(?: \((\d+)\))?$/;

/**
 * Defines sync list client class
 */
export default class SyncListClient {
  /**
   * Constructor
   * @param {Object} householdListManager
   * @param {Object} syncedList
   */
  constructor(householdListManager, syncedList = {}) {
    this.ourGroceriesClient = new OurGroceriesClient();
    this.householdListManager = householdListManager;
    this.syncedList = syncedList;
  }

  /**
   * Get ALexa shopping list
   * @return {Promise}
   */
  async getAlexaShoppingList() {
    // Get all lists
    const { lists } = await this.householdListManager.getListsMetadata();
    // Find shopping list
    const match = lists.find(list => list.name === process.env.ALEXA_SHOPPING_LIST);

    if (typeof match !== 'undefined') {
      // Get shopping list active and completed items
      const [active, completed] = await Promise.all([
        this.householdListManager.getList(match.listId, 'active'),
        this.householdListManager.getList(match.listId, 'completed')
      ]);
      // Return shopping list merging active & completed items
      return { ...active, items: [].concat(active.items, completed.items) };
    }
  }

  /**
   * Get OurGroceries shopping list
   * @return {Promise}
   */
  async getOurGroceriesShoppingList() {
    // Get shopping lists
    const { shoppingLists } = await this.ourGroceriesClient.getLists();
    // Find shopping list
    const match = shoppingLists.find(list => list.name === process.env.OUR_GROCERIES_SHOPPING_LIST);

    if (typeof match !== 'undefined') {
      // Get shopping list details
      const { list } = await this.ourGroceriesClient.getList(match.id);
      // Return shopping list values
      return list;
    }
  }

  /**
   * Update Alexa list
   * @return {Promise}
   */
  async updateAlexaList() {
    const [alexaList, ourGroceriesList] = await Promise.all([
      this.getAlexaShoppingList(), this.getOurGroceriesShoppingList()]);
    const promises = [];

    // Determine alexa item to be added/updated using ourGroceries list as reference
    ourGroceriesList.items.forEach((ourGroceriesItem) => {
      // Find alexa matching item
      const alexaItem = alexaList.items.find(alexaItem =>
        alexaItem.value.toLowerCase() === ourGroceriesItem.value.toLowerCase());
      // Determine alexa status based of ourGroceries crossed off property
      const ourGroceriesStatus = !ourGroceriesItem.crossedOff ? 'active' : 'completed';

      // Define get item properties function
      const getItemProperties = (alexaItem) => ({
        alexaId: alexaItem.id,
        ourGroceriesId: ourGroceriesItem.id,
        categoryId: ourGroceriesItem.categoryId,
        status: alexaItem.status,
        updatedTime: new Date(alexaItem.updatedTime).toISOString(),
        value: ITEM_VALUE_PATTERN.exec(alexaItem.value.toLowerCase())[1],
        quantity: ITEM_VALUE_PATTERN.exec(alexaItem.value)[2] || 1,
        version: alexaItem.version
      });

      if (typeof alexaItem !== 'undefined') {
        // Set alexa item to be updated if crossed off status not synced, otherwise leave untouched
        promises.push(ourGroceriesStatus === alexaItem.status ? getItemProperties(alexaItem) :
          this.householdListManager.updateListItem(alexaList.listId, alexaItem.id, {
            value: alexaItem.value, status: ourGroceriesStatus, version: alexaItem.version}
          ).then((item) => getItemProperties(item))
        );
      } else {
        // Set alexa item to be created
        promises.push(
          this.householdListManager.createListItem(alexaList.listId, {
            value: ourGroceriesItem.value, status: ourGroceriesStatus}
          ).then((item) => getItemProperties(item))
        );
      }
    });
    // Determine alexa item to be deleted if not present in ourGroceries list
    alexaList.items
      .filter(alexaItem =>
        ourGroceriesList.items.every(ourGroceriesItem =>
          ourGroceriesItem.value.toLowerCase() !== alexaItem.value.toLowerCase()))
      .forEach(alexaItem =>
        promises.push(
          this.householdListManager.deleteListItem(alexaList.listId, alexaItem.id)));

    // Get synced items promise result
    const syncedItems = await Promise.all(promises);
    // Return synced list
    return this.syncedList = {
      alexaId: alexaList.listId,
      ourGroceriesId: ourGroceriesList.id,
      name: ourGroceriesList.name,
      items: syncedItems.filter(Boolean)
    };
  }

  /**
   * Update OurGroceries list
   * @param  {Object}  request
   * @return {Promise}
   */
  async updateOurGroceriesList(request) {
    const syncedItems = this.syncedList.items;
    const promises = [];

    // Handle request if from alexa shopping list
    if (this.syncedList.alexaId === request.listId) {
      // Get alexa items data based on request item ids if not delete request, otherwise use id only
      const alexaItems = await Promise.all(
        request.listItemIds.map(itemId => request.type === 'ItemsDeleted' ? {id: itemId} :
          this.householdListManager.getListItem(request.listId, itemId)));

      alexaItems.forEach((alexaItem) => {
        if (request.type === 'ItemsCreated') {
          // Determine synced item with alexa item value
          const syncedItem = syncedItems.find(item =>
            item.value.toLowerCase() === alexaItem.value.toLowerCase());

          if (syncedItem) {
            // Update existing item only if updated time on synced item is less than alexa item
            if (new Date(syncedItem.updatedTime).getTime() < new Date(alexaItem.updatedTime).getTime()) {
              const quantity = syncedItem.status === 'active' ? syncedItem.quantity + 1 : 1;
              const value = `${syncedItem.value}${quantity > 1 ? ` (${quantity})` : ''}`;

              promises.push(
                // Set ourGroceries item to be renamed to new value
                this.ourGroceriesClient.renameItem(
                  this.syncedList.ourGroceriesId, syncedItem.ourGroceriesId,
                  value, syncedItem.categoryId),
                // Set alexa newly created item to be deleted
                this.householdListManager.deleteListItem(
                  this.syncedList.alexaId, alexaItem.id),
                // Set alexa synced item to be updated
                this.householdListManager.updateListItem(
                  this.syncedList.alexaId, syncedItem.alexaId, {
                    value: value, status: alexaItem.status, version: syncedItem.version}
                ).then((item) => {
                  // Update synced item
                  syncedItem.status = item.status;
                  syncedItem.updatedTime = new Date(item.updatedTime).toISOString();
                  syncedItem.quantity = quantity;
                  syncedItem.version = item.version;
                })
              );

              // Set ourGroceries item crossed status to be updated if different
              if (syncedItem.status !== alexaItem.status) {
                promises.push(
                  this.ourGroceriesClient.setItemCrossedOff(
                    this.syncedList.ourGroceriesId, syncedItem.ourGroceriesId,
                    alexaItem.status === 'completed'));
              }
            }
          } else {
            promises.push(
              // Set ourGroceries item to be added
              this.ourGroceriesClient.addItem(
                this.syncedList.ourGroceriesId, alexaItem.value.toLowerCase()
              ).then(({list, itemId}) => {
                const ourGroceriesItem = list.items.find(item => item.id === itemId);
                // Add new synced item
                syncedItems.push({
                  alexaId: alexaItem.id,
                  ourGroceriesId: ourGroceriesItem.id,
                  categoryId: ourGroceriesItem.categoryId,
                  status: alexaItem.status,
                  updatedTime: new Date(alexaItem.updatedTime).toISOString(),
                  value: ITEM_VALUE_PATTERN.exec(alexaItem.value.toLowerCase())[1],
                  quantity: ITEM_VALUE_PATTERN.exec(alexaItem.value)[2] || 1,
                  version: alexaItem.version
                });
              })
            );
          }
        } else if (request.type === 'ItemsUpdated') {
          // Determine synced item with alexa item id
          const syncedItem = syncedItems.find(item => item.alexaId === alexaItem.id);

          if (syncedItem) {
            // Update existing item only if updated time on synced item is lower than alexa item
            if (new Date(syncedItem.updatedTime).getTime() < new Date(alexaItem.updatedTime).getTime()) {
              const [value, quantity=1] = ITEM_VALUE_PATTERN.exec(alexaItem.value.toLowerCase());

              // Set ourGroceries item to be renamed if alexa value or quantity different than synced item
              if (syncedItem.value !== value || syncedItem.quantity !== quantity) {
                promises.push(
                  this.ourGroceriesClient.renameItem(
                    this.syncedList.ourGroceriesId, syncedItem.ourGroceriesId,
                    alexaItem.value.toLowerCase(), syncedItem.categoryId));
              }

              // Set ourGroceries item crossed status to be updated if different
              if (syncedItem.status !== alexaItem.status) {
                promises.push(
                  this.ourGroceriesClient.setItemCrossedOff(
                    this.syncedList.ourGroceriesId, syncedItem.ourGroceriesId,
                    alexaItem.status === 'completed'));
              }

              // Update synced item
              syncedItem.status = alexaItem.status;
              syncedItem.updatedTime = new Date(alexaItem.updatedTime).toISOString();
              syncedItem.value = ITEM_VALUE_PATTERN.exec(alexaItem.value.toLowerCase())[1];
              syncedItem.quantity = ITEM_VALUE_PATTERN.exec(alexaItem.value)[2] || 1;
              syncedItem.version = alexaItem.version;
            }
          } else {
            // Set alexa updated item to be deleted
            promises.push(
              this.householdListManager.deleteListItem(
                this.syncedList.alexaId, alexaItem.id));
          }
        } else if (request.type === 'ItemsDeleted') {
          // Determine synced item index with alexa item id
          const index = syncedItems.findIndex(item => item.alexaId === alexaItem.id);

          // Set ourGroceries item to be deleted if found
          if (index > -1) {
            promises.push(
              this.ourGroceriesClient.deleteItem(
                this.syncedList.ourGroceriesId, syncedItems[index].ourGroceriesId));
            // Remove deleted synced item
            syncedItems.splice(index, 1);
          }
        }
      });
    }

    // Apply all changes
    await Promise.all(promises);
    // Return synced list
    return this.syncedList;
  }
}
