resource_group_name = "quizhub-rg"
location            = "francecentral"
cluster_name        = "quizhub-aks"
kubernetes_version  = "1.33.5"
node_count          = 2
min_node_count      = 2
max_node_count      = 4
vm_size             = "Standard_B2s"
acr_name            = "quizhubacr2024pr40"

tags = {
  Environment = "Production"
  Project     = "QuizHub"
  ManagedBy   = "Terraform"
  Owner       = "pr40"
}
