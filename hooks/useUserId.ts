"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

const USER_ID_KEY = "tracking_user_id";

export function useUserId(): string {
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(USER_ID_KEY, id);
    }
    setUserId(id);
  }, []);

  return userId;
}
