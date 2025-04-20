# Setting Up Azure Key Vault Secrets for Deployment

This guide explains how to add the necessary secrets to your Azure Key Vault for the GitHub Actions workflow to use during deployment.

## Prerequisites

- An Azure Key Vault instance (the name should already be in your `KEY_VAULT_NAME` GitHub secret)
- Proper permissions to add secrets to the Key Vault
- The Azure CLI installed and authenticated

## Required Secrets

You need to add the following secrets to your Azure Key Vault:

1. `db-host`: Hostname for your PostgreSQL server
2. `db-name`: Name of your PostgreSQL database
3. `db-user`: Username for your PostgreSQL database
4. `db-password`: Password for your PostgreSQL database
5. `redis-host`: Hostname for your Redis server
6. `redis-port`: Port for your Redis server (typically 6379)
7. `redis-password`: Password for your Redis server

## Adding Secrets to Key Vault

```bash
# Replace <YOUR-KEY-VAULT-NAME> with your actual Key Vault name from terraform output
KEY_VAULT_NAME="<YOUR-KEY-VAULT-NAME>"

# Add PostgreSQL secrets
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-host" --value "your-postgres-server.postgres.database.azure.com"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-name" --value "linklydb"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-user" --value "your-postgres-username"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-password" --value "your-postgres-password"

# Add Redis secrets
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "redis-host" --value "your-redis-server.redis.cache.windows.net"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "redis-port" --value "6379"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "redis-password" --value "your-redis-access-key"
```

## Verifying Access Permissions

Ensure that the service principal used in your GitHub Actions has access to read secrets from the Key Vault:

```bash
# Get the client ID (app ID) of your service principal from AZURE_CREDENTIALS JSON
CLIENT_ID="your-service-principal-client-id"

# Grant get and list permissions for secrets to your service principal
az keyvault set-policy --name $KEY_VAULT_NAME --spn $CLIENT_ID --secret-permissions get list
```

## Testing Secret Access

You can test that your service principal can access the secrets with:

```bash
# Log in with your service principal
az login --service-principal -u $CLIENT_ID -p $CLIENT_SECRET --tenant $TENANT_ID

# Try to get a secret
az keyvault secret show --name "db-host" --vault-name $KEY_VAULT_NAME --query value -o tsv
```

Once you've added all secrets to the Key Vault and ensured the service principal has access, your GitHub Actions workflow will be able to retrieve these secrets during deployment.
