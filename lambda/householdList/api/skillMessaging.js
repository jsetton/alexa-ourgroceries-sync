'use strict';

const request = require('request-promise-native');

/**
 * Defines Alexa Skill Messaging API class
 */
class SkillMessagingApi {
  constructor(apiUrl, clientId, clientSecret, userId) {
    this.apiUrl = apiUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.userId = userId;
  }

  /**
   * Get access token
   * @return {Promise}
   */
  getAccessToken() {
    const options = {
      method: 'POST',
      uri: 'https://api.amazon.com/auth/O2/token',
      json: true,
      form: {
        grant_type: 'client_credentials',
        scope: 'alexa:skill_messaging',
        client_id: this.clientId,
        client_secret: this.clientSecret
      }
    };
    return request(options)
      .then(({ access_token }) => this.accessToken = access_token);
  }

  /**
   * Send message
   * @param  {Object}  data
   * @return {Promise}
   */
  async sendMessage(data = {}) {
    const options = {
      method: 'POST',
      uri: `${this.apiUrl}/v1/skillmessages/users/${this.userId}`,
      auth: {
        bearer: this.accessToken || await this.getAccessToken()
      },
      json: {
        data: data,
        expiresAfterSeconds: 60
      }
    };
    return request(options);
  }
}

module.exports = SkillMessagingApi;
