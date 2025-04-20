variable "resource_group_name" {
  description = "Name of the Azure Resource Group"
  type        = string
  default     = "rg-urlshortener-dev"
}
variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "northeurope"
}


variable "prefix" {
  description = "A unique prefix for resource names"
  type        = string
  default     = "urlshortdev" # Keep it short and unique
}

variable "db_admin_username" {
  description = "Admin username for PostgreSQL"
  type        = string
  default     = "pgadminuser"
}

variable "db_admin_password" {
  description = "Admin password for PostgreSQL (MUST be complex)"
  type        = string
  sensitive   = true # Mark as sensitive, won't be shown in output
  # Provide this value via environment variable (TF_VAR_db_admin_password) or a .tfvars file
}