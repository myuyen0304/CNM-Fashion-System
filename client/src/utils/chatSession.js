const GUEST_CHAT_SESSION_KEY = "guestChatSessionToken";

export const getGuestChatSessionToken = () =>
  localStorage.getItem(GUEST_CHAT_SESSION_KEY) || "";

export const setGuestChatSessionToken = (token) => {
  if (!token) return;
  localStorage.setItem(GUEST_CHAT_SESSION_KEY, token);
};

export const clearGuestChatSessionToken = () => {
  localStorage.removeItem(GUEST_CHAT_SESSION_KEY);
};

export const buildChatRequestConfig = () => {
  const guestToken = getGuestChatSessionToken();
  if (!guestToken) {
    return {};
  }

  return {
    headers: {
      "x-chat-session": guestToken,
    },
  };
};

export const syncGuestChatSession = (payload) => {
  const guestToken = payload?.guestSessionToken;

  if (guestToken) {
    setGuestChatSessionToken(guestToken);
  } else if (payload && payload.isGuestSession === false) {
    clearGuestChatSessionToken();
  }

  return guestToken;
};

export const extractChatMessages = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.messages)) {
    return payload.messages;
  }

  if (payload?._id) {
    return [payload];
  }

  return [];
};
