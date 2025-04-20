resource "azurerm_postgresql_flexible_server" "psql" {
  name                = "urlshortdev-psql-northeu"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
  version             = "13" # Choose a supported version
  delegated_subnet_id = null # Basic tier doesn't support VNet integration
  private_dns_zone_id = null # Not needed without VNet integration

  administrator_login    = var.db_admin_username
  administrator_password = var.db_admin_password

  zone = "1" # Choose an availability zone

  # --- LOWEST COST TIER ---
  sku_name   = "B_Standard_B1ms" # Basic Tier, 1 vCore, 2 GiB RAM
  storage_mb = 32768             # Minimum 32 GiB for Basic

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false # Disable for cost saving

  # Allow access from any Azure service and your local IP (for initial setup/testing)
  # WARNING: In production, restrict this significantly!
}

# Allow connections from within Azure (needed for AKS unless using Private Link/VNet)
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
  name             = "AllowAllWindowsAzureIps"
  server_id        = azurerm_postgresql_flexible_server.psql.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# --- IMPORTANT: Add your local IP for testing ---
# Find your public IP (e.g., search "what is my IP" in Google)
# Uncomment and replace X.X.X.X with your IP
# resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_local_dev" {
#   name             = "AllowMyDevIP"
#   server_id        = azurerm_postgresql_flexible_server.psql.id
#   start_ip_address = "X.X.X.X" # Replace with your public IP address
#   end_ip_address   = "X.X.X.X" # Replace with your public IP address
# }

# Create the actual database within the server
resource "azurerm_postgresql_flexible_server_database" "appdb" {
  name      = "url_shortener_db"
  server_id = azurerm_postgresql_flexible_server.psql.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}