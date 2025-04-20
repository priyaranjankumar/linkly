# Removing Large Files from Git History

If you encounter errors pushing to GitHub due to large files, follow these steps to resolve the issue:

```bash
# First, remove the specific large file from Git tracking but keep it on your filesystem
git rm --cached infra/.terraform/providers/registry.terraform.io/hashicorp/azurerm/3.117.1/linux_amd64/terraform-provider-azurerm_v3.117.1_x5

# Commit this change
git commit -m "Remove large Terraform provider file from Git tracking"

# Push your changes
git push origin main
```

## If the above doesn't work, use a more comprehensive approach:

```bash
# Use Git's filter-branch to remove the directory from all commits
git filter-branch --force --index-filter \
  "git rm -r --cached --ignore-unmatch infra/.terraform/" \
  --prune-empty --tag-name-filter cat -- --all

# Force push to the repository (use with caution)
git push origin main --force
```

## Alternative: Start Fresh

If you're still facing issues, you could create a new repository without the problematic files:

```bash
# Create a new branch without any history
git checkout --orphan temp_branch

# Add all files to the new branch (except those in .gitignore)
git add .

# Commit
git commit -m "Initial commit with clean history"

# Delete the main branch
git branch -D main

# Rename the current branch to main
git branch -m main

# Force push to GitHub with the new clean history
git push -f origin main
```

Remember to check your `.gitignore` file to ensure it properly excludes the Terraform directories before pushing.
