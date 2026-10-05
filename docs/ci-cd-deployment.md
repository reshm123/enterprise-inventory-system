# Backend CI/CD Deployment

The GitHub Actions workflow at `.github/workflows/deploy.yml` runs the backend Jest suite on pull requests and pushes to `main`. A successful push to `main` then deploys the application to EC2 over SSH.

## GitHub Actions secrets

Add these repository secrets under **Settings > Secrets and variables > Actions**:

| Secret | Value |
| --- | --- |
| `EC2_HOST` | EC2 public DNS name or IP address |
| `EC2_USER` | SSH user, commonly `ubuntu` or `ec2-user` |
| `EC2_SSH_KEY` | Private SSH key authorized for that EC2 user |
| `EC2_APP_DIR` | Absolute path to the cloned repository on EC2 |

## EC2 prerequisites

- Git, Node.js 22, npm, PM2, and `curl` are installed.
- The repository is cloned at `EC2_APP_DIR`, and that clone can pull `origin main` non-interactively. For a private repository, configure a GitHub deploy key on EC2.
- `backend/.env` is created on EC2 and contains at least `MONGODB_URI`, `JWT_SECRET`, and `JWT_EXPIRES_IN`. It is ignored by Git and is not replaced during deployment.
- The EC2 security group allows SSH from the GitHub Actions runners or an appropriate restricted network path, and public HTTP/HTTPS as needed. Do not expose port 5000 publicly; have Nginx proxy to `127.0.0.1:5000`.
- MongoDB Atlas permits connections from the EC2 instance's outbound IP.

The workflow deploys the entire repository with `git pull`, installs only backend production dependencies, starts or restarts the PM2 process named `enterprise-api`, saves the PM2 process list, and checks `http://127.0.0.1:5000/health` before reporting success.