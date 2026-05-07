import axios from 'axios';

const EPIC_CLIENT_ID = process.env.EPIC_CLIENT_ID;
const EPIC_CLIENT_SECRET = process.env.EPIC_CLIENT_SECRET;
const REDIRECT_URI = process.env.EPIC_REDIRECT_URI || 'http://localhost:3000/auth/callback/epic';

export class EpicOAuth {
  static getAuthorizationUrl() {
    const params = new URLSearchParams({
      client_id: EPIC_CLIENT_ID!,
      response_type: 'code',
      scope: 'basic_profile friends_list presence achievement:read:public achievement:read:private',
      redirect_uri: REDIRECT_URI,
    });
    return `https://www.epicgames.com/id/authorize?${params.toString()}`;
  }

  static async getAccessToken(code: string) {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: EPIC_CLIENT_ID!,
      client_secret: EPIC_CLIENT_SECRET!,
      redirect_uri: REDIRECT_URI,
    });

    const res = await axios.post('https://api.epicgames.dev/epic/oauth/v1/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${EPIC_CLIENT_ID}:${EPIC_CLIENT_SECRET}`).toString('base64')}`
      }
    });

    return res.data; // { access_token, account_id, ... }
  }

  static async getUserInfo(accessToken: string) {
    const res = await axios.get('https://api.epicgames.dev/epic/oauth/v1/userInfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return res.data;
  }
}
