/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global console, document, Office */

import { AccountManager } from "./authConfig";
import { makeGraphRequest } from "./msgraph-helper";
// import { writeFileNamesToOfficeDocument } from "./document";

const accountManager = new AccountManager();
const sideloadMsg = document.getElementById("sideload-msg");
const appBody = document.getElementById("app-body");
const getUserDataButton = document.getElementById("getUserData");
const getEmailThreadButton = document.getElementById("getEmailThread");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const emailThreads = document.getElementById("email-threads");
var itemConversationId: string;

Office.onReady((info) => {
  switch (info.host) {
    case Office.HostType.Excel:
    case Office.HostType.PowerPoint:
    case Office.HostType.Word:
      if (sideloadMsg) {
        sideloadMsg.style.display = "none";
      }
      if (appBody) {
        appBody.style.display = "flex";
      }
      if (getUserDataButton) {
        getUserDataButton.onclick = getUserData;
      }
      if (getEmailThreadButton) {
        getEmailThreadButton.onclick = getEmailThread;
      }
      accountManager.initialize();
      break;
    case Office.HostType.Outlook: {
      if (sideloadMsg) {
        sideloadMsg.style.display = "none";
      }
      if (appBody) {
        appBody.style.display = "flex";
      }
      if (getUserDataButton) {
        getUserDataButton.onclick = getUserData;
      }
      if (getEmailThreadButton) {
        getEmailThreadButton.onclick = getEmailThread;
      }
      accountManager.initialize();

      const item = Office.context.mailbox.item;
      if (item) {
        itemConversationId = item.conversationId;
      }
      break;
    }
  }
});

/**
 * Gets the user data such as name and email and displays it
 * in the task pane.
 */
async function getUserData() {
  try {
    const userDataElement = document.getElementById("userData");
    const userAccount = await accountManager.ssoGetUserIdentity(["user.read"]);
    const idTokenClaims = userAccount.idTokenClaims as { name?: string; preferred_username?: string };

    console.log(userAccount);

    if (userDataElement) {
      userDataElement.style.visibility = "visible";
    }
    if (userName) {
      userName.innerText = idTokenClaims.name ?? "";
    }
    if (userEmail) {
      userEmail.innerText = idTokenClaims.preferred_username ?? "";
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Gets the first 10 item names (files or folders) from the user's OneDrive.
 * Inserts the item names into the document.
 */
// async function getUserFiles() {
//   try {
//     const names = await getFileNames();

//     writeFileNamesToOfficeDocument(names);
//   } catch (error) {
//     console.error(error);
//   }
// }

// async function getFileNames(count = 10) {
//   const accessToken = await accountManager.ssoGetToken(["Files.Read"]);
//   const response: { value: { name: string }[] } = await makeGraphRequest(
//     accessToken,
//     "/me/drive/root/children",
//     `?$select=name&$top=${count}`
//   );

//   const names = response.value.map((item: { name: string }) => item.name);
//   return names;
// }

async function getEmailThread() {
  try {
    const accessToken = await accountManager.ssoGetToken(["Mail.Read"]);
    const response: { value: any[] } = await makeGraphRequest(
      accessToken,
      "/me/messages",
      `?$top=10&$filter=conversationId eq '${itemConversationId}'&$select=subject,from,receivedDateTime,body`,
      { Prefer: 'outlook.body-content-type="text"' }
    );

    console.log("Email thread messages:", response.value);
    if (emailThreads) {
      emailThreads.innerHTML = "<h3>Emails in this thread:</h3>";
      response.value.forEach((message) => {
        const messageDiv = document.createElement("div");
        const bodyPreview = message.body.content?.split("\n")[0] || message.body.content?.substring(0, 50) || "";
        messageDiv.innerHTML = `<strong>Subject:</strong> ${message.subject} <br/>
              <strong>From:</strong> ${message.from.emailAddress.name} (${message.from.emailAddress.address}) <br/>
              <strong>Received:</strong> ${new Date(message.receivedDateTime).toLocaleString()} <br/>
              <strong>Body Preview:</strong> ${bodyPreview}... <br/><hr/>`;
        emailThreads.appendChild(messageDiv);
      });
    }
  } catch (error) {
    console.error(error);
  }
}
