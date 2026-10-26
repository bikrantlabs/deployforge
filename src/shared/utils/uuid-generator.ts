import { v7 as uuidv7 } from "uuid";
export function generateUUID() {
  const id = uuidv7();
  return id;
}
