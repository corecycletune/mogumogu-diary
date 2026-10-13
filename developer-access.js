// Developer previews are local-only UI; this is not a server-side permission grant.
export const DEVELOPER_ACCOUNT_ID='junsakata0720';
export function canUseDevTools(profile,accountId){
  return profile==='jun'&&accountId===DEVELOPER_ACCOUNT_ID;
}
export function isDevModeEnabled(profile,accountId,search){
  return canUseDevTools(profile,accountId)&&new URLSearchParams(search).get('dev')==='1';
}
