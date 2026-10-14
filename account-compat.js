// `profile` is retained as a wire-schema field only; its value is now the UID.
// Normalize only data read from users/{uid}. No old shared profile is imported.
export function ownedRecord(value,uid){return value?{...value,profile:uid}:null;}
export function groupStorageKey(uid){return 'mogumogu:groups:'+uid;}
export function chatStorageKey(uid){return 'mogumogu:chat-current:'+uid;}
