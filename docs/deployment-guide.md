# Post-Secrets Setup Steps

Now that you've configured all required GitHub secrets, follow these steps to deploy your application:

## 1. Ensure Your Code is Ready

Make sure your application code, Docker configuration, and Kubernetes manifests are complete and tested locally.

## 2. Push Your Code to GitHub

```bash
# Ensure you're on the main branch
git checkout main

# Add all changes
git add .

# Commit your changes
git commit -m "Ready for deployment to AKS"

# Push to GitHub
git push origin main
```

## 3. Monitor the Deployment

1. Go to your GitHub repository
2. Click on the "Actions" tab
3. You should see the "Build and Deploy to AKS" workflow running
4. Click on it to view detailed progress and logs

## 4. Verify the Deployment

After the workflow completes successfully:

```bash
# Connect to your AKS cluster
az aks get-credentials --resource-group <your-resource-group> --name <your-aks-cluster>

# Check pod status
kubectl get pods

# Check services
kubectl get services

# Access your application using the external IP of your frontend service
kubectl get service frontend-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

## Troubleshooting

If your deployment fails:

1. Check the GitHub Actions logs for detailed error messages
2. Verify that all secrets are correctly set up
3. Ensure your Kubernetes manifests are correctly configured
4. Check that your Docker images build successfully
