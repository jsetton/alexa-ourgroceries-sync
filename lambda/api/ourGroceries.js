'use strict';

const request = require('request-promise-native').defaults({
  jar: true
});

/**
 * Defines team id pattern
 * @type {RegExp}
 */
const TEAM_ID_PATTERN = /g_teamId = "(\w*)"/;

/**
 * Defines OurGroceries client class
 */
class OurGroceriesClient {
  /**
   * Constructor
   * @param {String} apiUrl
   * @param {String} username
   * @param {String} password
   */
  constructor(apiUrl, username, password) {
    this.apiUrl = apiUrl;
    this.username = username;
    this.password = password;
  }

  /**
   * Authenticate
   * @return {Promise}
   */
  authenticate() {
    const options = {
      method: 'POST',
      uri: `${this.apiUrl}/sign-in`,
      simple: false,
      form: {
        emailAddress: this.username,
        password: this.password,
        action: 'sign-in'
      }
    };
    return request(options)
      .then(() => this.getTeamId())
      .then((teamId) => this.teamId = teamId);
  }

  /**
   * Get Team Id
   * @return {Promise}
   */
  getTeamId() {
    const options = {
      method: 'GET',
      uri: `${this.apiUrl}/your-lists/`
    };
    return request(options)
      .then((response) => response.match(TEAM_ID_PATTERN)[1]);
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
    // Define request options
    const options = {
      method: 'POST',
      uri: `${this.apiUrl}/your-lists/`,
      json: Object.assign(parameters, {
        teamId: this.teamId || await this.authenticate()
      })
    };
    return request(options);
  }
}

module.exports = OurGroceriesClient;
