# Setting Up GitHub Secrets for Deployment

To enable the GitHub Actions workflow for deployment to Azure Kubernetes Service (AKS), you need to configure the following secrets in your GitHub repository:

## Required Secrets

### 1. `AZURE_CREDENTIALS`

This secret contains the service principal credentials for Azure authentication.

```bash
# Run this command to create a service principal and get the JSON output
az ad sp create-for-rbac --name "linkly-github-actions-sp" --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/<resource-group-name> \
  --sdk-auth

# The output will look like this:
# {
#   "clientId": "xxxx-xxxx-xxxx-xxxx-xxxx",
#   "clientSecret": "xxxx-xxxx-xxxx-xxxx-xxxx",
#   "subscriptionId": "xxxx-xxxx-xxxx-xxxx-xxxx",
#   "tenantId": "xxxx-xxxx-xxxx-xxxx-xxxx",
#   ...
# }

# Copy the entire JSON output and paste it as the value for AZURE_CREDENTIALS secret
```

### 2. `ACR_NAME`

The name of your Azure Container Registry without the .azurecr.io suffix.

```bash
# Get from terraform output
terraform output acr_name
# Example value: urlshortdevacrabcdef
```

### 3. `AKS_CLUSTER_NAME`

The name of your Azure Kubernetes Service cluster.

```bash
# Get from terraform output
terraform output aks_cluster_name
# Example value: urlshortdev-aks
```

### 4. `RESOURCE_GROUP_NAME`

The name of your Azure resource group.

```bash
# Get from terraform output
terraform output resource_group_name
# Example value: rg-urlshortener-dev
```

### 5. `KEY_VAULT_NAME`

The name of your Azure Key Vault.

```bash
# Get from terraform output
terraform output key_vault_name
# Example value: urlshortdev-kv-abcdef
```

## Setting Up Secrets in GitHub

1. Go to your GitHub repository
2. Click on "Settings" tab
3. Click on "Secrets and variables" in the left sidebar
4. Select "Actions"
5. Click on "New repository secret"
6. Add each secret with its respective value
7. Click "Add secret" after entering each one

Once all these secrets are configured, your GitHub Actions workflow will be able to authenticate with Azure and deploy to your AKS cluster.
