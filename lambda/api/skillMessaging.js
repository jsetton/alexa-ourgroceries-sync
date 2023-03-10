import got from 'got';

/**
 * Returns skill messaging access token
 * @return {Promise}
 */
const getAccessToken = () => {
  const options = {
    method: 'POST',
    url: `${process.env.LWA_API_URL}/auth/O2/token`,
    json: {
      grant_type: 'client_credentials',
      scope: 'alexa:skill_messaging',
      client_id: process.env.SKILL_CLIENT_ID,
      client_secret: process.env.SKILL_CLIENT_SECRET
    }
  };
  return got(options)
    .json()
    .then((response) => response.access_token);
};

/**
 * Sends skill message
 * @param  {String} userId
 * @param  {Object} data
 * @return {Promise}
 */
export const sendSkillMessage = async (userId, data) => {
  const options = {
    method: 'POST',
    url: `${process.env.ALEXA_API_URL}/v1/skillmessages/users/${userId}`,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`
    },
    json: {
      data,
      expiresAfterSeconds: 60
    }
  };
  return got(options);
};
