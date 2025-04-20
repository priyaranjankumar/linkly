output "resource_group_name" {
  value = azurerm_resource_group.rg.name
}

output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.aks.name
}

output "acr_name" {
  value = azurerm_container_registry.acr.name
}

output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
}

output "key_vault_name" {
  value = azurerm_key_vault.kv.name
}

output "postgres_server_name" {
  value = azurerm_postgresql_flexible_server.psql.name
}

output "postgres_server_fqdn" {
  value = azurerm_postgresql_flexible_server.psql.fqdn
}

output "postgres_database_name" {
  value = azurerm_postgresql_flexible_server_database.appdb.name
}

output "redis_name" {
  value = azurerm_redis_cache.redis.name
}

output "redis_hostname" {
  value = azurerm_redis_cache.redis.hostname
}