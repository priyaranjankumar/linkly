resource "azurerm_key_vault" "kv" {
  name                       = "${var.prefix}-kv-${random_string.suffix.result}" # Globally unique
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard" # Standard tier is usually fine
  soft_delete_retention_days = 7
  purge_protection_enabled   = false # Can enable later if needed

  # Allow Azure CLI user/principal running Terraform to manage secrets initially
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id
    secret_permissions = [
      "Get", "List", "Set", "Delete", "Purge"
    ]
  }

  # Allow AKS Managed Identity to GET secrets later (for CSI Driver if used)
  # Note: We will access secrets via CI/CD pipeline initially for simplicity
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = azurerm_kubernetes_cluster.aks.identity[0].principal_id
    secret_permissions = [
      "Get", "List", "Set", "Delete", "Purge"
    ]
  }
}

# Get current user/service principal details
data "azurerm_client_config" "current" {}

# Store Database Connection Details in Key Vault
resource "azurerm_key_vault_secret" "db_host" {
  name         = "db-host"
  value        = azurerm_postgresql_flexible_server.psql.fqdn
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_postgresql_flexible_server.psql]
}

resource "azurerm_key_vault_secret" "db_name" {
  name         = "db-name"
  value        = azurerm_postgresql_flexible_server_database.appdb.name
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_postgresql_flexible_server_database.appdb]
}

resource "azurerm_key_vault_secret" "db_user" {
  name         = "db-user"
  value        = var.db_admin_username
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_postgresql_flexible_server.psql]
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  value        = var.db_admin_password # Store the password provided to Terraform
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_postgresql_flexible_server.psql]
}

# Store Redis Connection Details in Key Vault
resource "azurerm_key_vault_secret" "redis_host" {
  name         = "redis-host"
  value        = azurerm_redis_cache.redis.hostname
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_redis_cache.redis]
}

resource "azurerm_key_vault_secret" "redis_port" {
  name         = "redis-port"
  #value        = tostring(azurerm_redis_cache.redis.ssl_port) # Use SSL port
  value        = tostring(azurerm_redis_cache.redis.port) # Use SSL port
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_redis_cache.redis]
}

resource "azurerm_key_vault_secret" "redis_password" {
  name         = "redis-password"
  value        = azurerm_redis_cache.redis.primary_access_key
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_redis_cache.redis]
}