#!/usr/bin/env bash
# Run once in Google Cloud Shell as a project administrator. No deployment here.
set -euo pipefail
PROJECT=mogumogu-diary
REPOSITORY=corecycletune/mogumogu-diary
REPOSITORY_ID=1413670272
OWNER_ID=208546009
ACCOUNT=firestore-rules-deploy
POOL=mogumogu-github
PROVIDER=firestore-rules
ROLE=firestoreRulesDeploy
SA="$ACCOUNT@$PROJECT.iam.gserviceaccount.com"
NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')

# Require the existing database; never provision/replace a database.
gcloud firestore databases describe --project="$PROJECT" --database='(default)' >/dev/null
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com firebaserules.googleapis.com --project="$PROJECT"

# Keep the currently published rules locally before enabling CI.
BACKUP=$(mktemp -d "$HOME/mogumogu-rules-backup.XXXXXX")
TOKEN=$(gcloud auth print-access-token)
curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" \
  "https://firebaserules.googleapis.com/v1/projects/$PROJECT/releases/cloud.firestore" > "$BACKUP/release.json"
RULESET=$(jq -er '.rulesetName' "$BACKUP/release.json")
curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" \
  "https://firebaserules.googleapis.com/v1/$RULESET" > "$BACKUP/ruleset.json"
unset TOKEN
jq -er '.source.files[] | select(.name | endswith(".rules")) | .content' "$BACKUP/ruleset.json" > "$BACKUP/firestore.rules"

if ! gcloud iam service-accounts describe "$SA" --project="$PROJECT" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$ACCOUNT" --project="$PROJECT" --display-name='Firestore rules CI only'
fi

# Deliberately no document access, Hosting, Auth, indexes, database creation,
# IAM editing, API enabling or ruleset deletion permissions for CI.
PERMISSIONS='firebase.projects.get,resourcemanager.projects.get,serviceusage.services.get,serviceusage.services.use,datastore.databases.get,firebaserules.rulesets.create,firebaserules.rulesets.get,firebaserules.rulesets.list,firebaserules.rulesets.test,firebaserules.releases.get,firebaserules.releases.list,firebaserules.releases.create,firebaserules.releases.update'
if gcloud iam roles describe "$ROLE" --project="$PROJECT" >/dev/null 2>&1; then
  gcloud iam roles update "$ROLE" --project="$PROJECT" --permissions="$PERMISSIONS" --stage=GA
else
  gcloud iam roles create "$ROLE" --project="$PROJECT" --title='Firestore rules deploy only' --permissions="$PERMISSIONS" --stage=GA
fi
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role="projects/$PROJECT/roles/$ROLE" --condition=None

if ! gcloud iam workload-identity-pools describe "$POOL" --project="$PROJECT" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL" --project="$PROJECT" --location=global --display-name='MoguMogu GitHub CI'
fi
CONDITION="assertion.repository_id == '$REPOSITORY_ID' && assertion.repository_owner_id == '$OWNER_ID' && assertion.repository == '$REPOSITORY' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == '$REPOSITORY/.github/workflows/firestore-rules.yml@refs/heads/main' && (assertion.event_name == 'push' || assertion.event_name == 'workflow_dispatch')"
MAPPING='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id'
if gcloud iam workload-identity-pools providers describe "$PROVIDER" --project="$PROJECT" --location=global --workload-identity-pool="$POOL" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers update-oidc "$PROVIDER" --project="$PROJECT" --location=global --workload-identity-pool="$POOL" --issuer-uri='https://token.actions.githubusercontent.com' --attribute-mapping="$MAPPING" --attribute-condition="$CONDITION"
else
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --project="$PROJECT" --location=global --workload-identity-pool="$POOL" --issuer-uri='https://token.actions.githubusercontent.com' --attribute-mapping="$MAPPING" --attribute-condition="$CONDITION"
fi
gcloud iam service-accounts add-iam-policy-binding "$SA" --project="$PROJECT" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository_id/$REPOSITORY_ID"

printf '\nBackup saved to: %s\n' "$BACKUP"
printf 'GitHub Actions variables (not Secrets):\nFIREBASE_WIF_PROVIDER=projects/%s/locations/global/workloadIdentityPools/%s/providers/%s\nFIREBASE_DEPLOY_SERVICE_ACCOUNT=%s\n' "$NUMBER" "$POOL" "$PROVIDER" "$SA"
printf '\nInspect the live backup against repository firestore.rules before the first deployment.\n'
