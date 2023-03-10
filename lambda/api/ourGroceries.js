import got from 'got';
import { CookieJar } from 'tough-cookie';

/**
 * Defines team id pattern
 * @type {RegExp}
 */
const TEAM_ID_PATTERN = /g_teamId = "(\w*)"/;

/**
 * Defines OurGroceries client class
 */
export default class OurGroceriesClient {
  /**
   * Constructor
   */
  constructor() {
    this.client = got.extend({
      prefixUrl: process.env.OUR_GROCERIES_API_URL,
      cookieJar: new CookieJar()
    });
  }

  /**
   * Get all Lists data
   * @return {Promise}
   */
  getLists() {
    const parameters = {
      command: 'getOverview'
    };
    return this.handleRequest(parameters);
  }

  /**
   * Get specific list data
   * @param  {String}  listId
   * @return {Promise}
   */
  getList(listId) {
    const parameters = {
      command: 'getList',
      listId: listId
    };
    return this.handleRequest(parameters);
  }

  /**
   * Add list
   * @param  {String}  name
   * @param  {String}  listType
   * @return {Promise}
   */
  addList(name, listType = 'SHOPPING') {
    const parameters = {
      command: 'createList',
      listType: listType,
      name: name
    };
    return this.handleRequest(parameters);
  }

  /**
   * Delete list
   * @param  {String}  listId
   * @return {Promise}
   */
  deleteList(listId) {
    const parameters = {
      command: 'deleteList',
      listId: listId
    };
    return this.handleRequest(parameters);
  }

  /**
   * Rename list
   * @param  {String}  listId
   * @param  {String}  name
   * @return {Promise}
   */
  renameList(listId, name) {
    const parameters = {
      command: 'renameList',
      listId: listId,
      name: name
    };
    return this.handleRequest(parameters);
  }

  /**
   * Add item to list
   * @param  {String}  listId
   * @param  {String}  value
   * @return {Promise}
   */
  addItem(listId, value) {
    const parameters = {
      command: 'insertItem',
      listId: listId,
      value: value
    };
    return this.handleRequest(parameters);
  }

  /**
   * Delete item from list
   * @param  {String}  listId
   * @param  {String}  itemId
   * @return {Promise}
   */
  deleteItem(listId, itemId) {
    const parameters = {
      command: 'deleteItem',
      listId: listId,
      itemId: itemId
    };
    return this.handleRequest(parameters);
  }

  /**
   * Rename item from list
   * @param  {String}  listId
   * @param  {String}  itemId
   * @param  {String}  value
   * @param  {String}  categoryId
   * @return {Promise}
   */
  renameItem(listId, itemId, value, categoryId = null) {
    const parameters = {
      command: 'changeItemValue',
      listId: listId,
      itemId: itemId,
      newValue: value,
      categoryId: categoryId
    };
    return this.handleRequest(parameters);
  }

  /**
   * Set item crossed off from list
   * @param  {String}  listId
   * @param  {String}  itemId
   * @param  {Boolean} crossOff
   * @return {Promise}
   */
  setItemCrossedOff(listId, itemId, crossedOff = true) {
    const parameters = {
      command: 'setItemCrossedOff',
      listId: listId,
      itemId: itemId,
      crossedOff: crossedOff
    };
    return this.handleRequest(parameters);
  }

  /**
   * Handle request
   * @param  {Object}  parameters
   * @return {Promise}
   */
  async handleRequest(parameters = {}) {
    const options = {
      method: 'POST',
      url: 'your-lists/',
      json: {
        ...parameters,
        teamId: this.teamId || (await this.signIn())
      }
    };
    return this.client(options).json();
  }

  /**
   * Sign in
   * @return {Promise}
   */
  signIn() {
    const options = {
      method: 'POST',
      url: 'sign-in',
      methodRewriting: true,
      form: {
        emailAddress: process.env.OUR_GROCERIES_USERNAME,
        password: process.env.OUR_GROCERIES_PASSWORD,
        action: 'sign-in'
      }
    };
    return this.client(options)
      .text()
      .then((response) => (this.teamId = response.match(TEAM_ID_PATTERN)[1]));
  }
}
