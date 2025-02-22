import { InstallURLOptions } from "@slack/bolt";

export default async function handler(req, res) {
  const installOptions = {
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    stateSecret: process.env.SLACK_STATE_SECRET,
    scopes: [
      "channels:history",
      "channels:read",
      "chat:write",
      "links:read",
      "team:read",
    ],
  };

  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${
    installOptions.clientId
  }&scope=${installOptions.scopes.join(",")}&state=${
    installOptions.stateSecret
  }`;

  res.redirect(authUrl);
}
