// Existing development previews remain limited to the owner's login ID.
// This gate only hides local UI; it never grants Firestore privileges.
export function canUseDevTools(account){return !!account?.uid && account.id==='junsakata0720';}
export function isDevModeEnabled(account,search){
  return canUseDevTools(account)&&new URLSearchParams(search).get('dev')==='1';
}
