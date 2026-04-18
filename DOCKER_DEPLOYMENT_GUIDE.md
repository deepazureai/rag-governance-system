# Docker Deployment Guide

## Overview

This guide covers all deployment scenarios for the RAG Evaluation Metrics Dashboard application using Docker.

---

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 20GB disk space minimum

---

## Environment Setup

### 1. Create .env file from template

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

### 2. Update environment variables

**Root .env:**
```
NODE_ENV=development
MONGO_USERNAME=admin
MONGO_PASSWORD=secure_password_here
POSTGRES_USER=rag_user
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=rag_evaluation
LOG_LEVEL=info
```

**backend/.env:**
```
NODE_ENV=development
BACKEND_PORT=5000
DATABASE_URL=mongodb://admin:password@mongodb:27017/rag-evaluation
CORS_ORIGIN=http://localhost:3000
```

---

## Deployment Scenarios

### Scenario 1: Local Development (Full Stack)

**All services on single machine:**

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Nginx: http://localhost
- MongoDB: localhost:27017
- PostgreSQL: localhost:5432

**Service Status:**
```bash
docker-compose ps
```

---

### Scenario 2: Separate Backend & Frontend Servers

**Server A: Backend**

```bash
# On Server A (192.168.1.10)

# Create backend-only docker-compose
cat > docker-compose.backend.yml << 'EOF'
version: '3.8'
services:
  mongodb:
    image: mongo:7-alpine
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo_data:/data/db

  postgres:
    image: postgres:16-alpine
    restart: always
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: rag_user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: rag_evaluation
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      DATABASE_URL: mongodb://admin:password@mongodb:27017/rag-evaluation
      POSTGRES_URL: postgresql://rag_user:password@postgres:5432/rag_evaluation
      CORS_ORIGIN: http://192.168.1.20:3000
      LOCAL_DATA_FOLDER: /app/local-data
    depends_on:
      - mongodb
      - postgres
    volumes:
      - ./local-data:/app/local-data

volumes:
  mongo_data:
  postgres_data:
EOF

# Start backend
docker-compose -f docker-compose.backend.yml up -d
```

**Server B: Frontend**

```bash
# On Server B (192.168.1.20)

# Update .env
cat > .env << 'EOF'
NEXT_PUBLIC_API_URL=http://192.168.1.10:5000
EOF

# Create frontend-only docker-compose
cat > docker-compose.frontend.yml << 'EOF'
version: '3.8'
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://192.168.1.10:5000
      NODE_ENV: production
EOF

# Start frontend
docker-compose -f docker-compose.frontend.yml up -d
```

**Access:**
- Frontend: http://192.168.1.20:3000
- Backend: http://192.168.1.10:5000

---

### Scenario 3: Cloud Deployment (AWS EC2)

**Prerequisites:**
- AWS EC2 instances (t3.large or larger)
- Security groups allowing ports 80, 443, 5000
- Domain name with DNS configured

**Deployment:**

```bash
# SSH into instance
ssh -i key.pem ec2-user@instance-ip

# Install Docker
sudo amazon-linux-extras install docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Clone repository
git clone <your-repo>
cd rag-evaluation

# Set up environment
cp .env.example .env
# Edit .env with production values

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Verify
docker-compose ps
```

**Configure SSL:**

```bash
# Place SSL certificates in ssl/ folder
mkdir -p ssl
cp /path/to/cert.pem ssl/
cp /path/to/key.pem ssl/

# Update domain in nginx.prod.conf
```

**Monitor Logs:**

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

---

### Scenario 4: Kubernetes Deployment

**Create deployment manifests:**

```yaml
# deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rag-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rag-backend
  template:
    metadata:
      labels:
        app: rag-backend
    spec:
      containers:
      - name: backend
        image: your-registry/rag-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: rag-secrets
              key: database-url
        - name: POSTGRES_URL
          valueFrom:
            secretKeyRef:
              name: rag-secrets
              key: postgres-url
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 40
          periodSeconds: 30
```

**Deploy to Kubernetes:**

```bash
kubectl apply -f deployment.yml
kubectl apply -f service.yml
kubectl apply -f configmap.yml
```

---

### Scenario 5: Docker Swarm Deployment

**Initialize Swarm:**

```bash
docker swarm init
```

**Deploy stack:**

```bash
docker stack deploy -c docker-compose.yml rag-evaluation
```

**Check status:**

```bash
docker service ls
docker service logs rag-evaluation_backend
```

---

## Local Folder Batch Processing Setup

### Directory Structure

```
project-root/
├── local-data/
│   ├── app-1/
│   │   └── metrics.txt
│   └── app-2/
│       └── metrics.txt
└── docker-compose.yml
```

### File Format

Raw metrics file format (semicolon-delimited records):

```
user_prompt="What is AI?", context="Computer Science", response="AI is artificial intelligence", user_id="u123", score=0.95, timestamp="2024-04-18";
user_prompt="Explain ML", context="Computer Science", response="Machine Learning is a subset", user_id="u124", score=0.87, timestamp="2024-04-18";
```

### Mounting Local Data

The docker-compose.yml automatically mounts:

```
./local-data:/app/local-data
```

Create the folder:

```bash
mkdir -p local-data
chmod 755 local-data
```

Add data files:

```bash
cp your-metrics.txt local-data/app-name/
```

---

## Maintenance Commands

### View Service Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb

# Follow logs
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100
```

### Database Backup

```bash
# MongoDB backup
docker-compose exec mongodb mongodump --archive=/backup/mongodb.dump \
  -u admin -p password --authenticationDatabase admin

# PostgreSQL backup
docker-compose exec postgres pg_dump -U rag_user rag_evaluation > backup.sql
```

### Database Restore

```bash
# MongoDB restore
docker-compose exec mongodb mongorestore --archive=/backup/mongodb.dump \
  -u admin -p password --authenticationDatabase admin

# PostgreSQL restore
docker-compose exec postgres psql -U rag_user rag_evaluation < backup.sql
```

### Rebuild Images

```bash
docker-compose build --no-cache backend frontend
```

### Scale Services

```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3
```

---

## Security Best Practices

1. **Environment Variables:**
   - Never commit .env files
   - Use unique passwords for production
   - Store secrets in proper secret management (AWS Secrets Manager, HashiCorp Vault)

2. **Image Security:**
   - Use specific image versions (not `latest`)
   - Scan images for vulnerabilities: `docker scan image-name`
   - Use private registries for production

3. **Network Security:**
   - Restrict ports using security groups
   - Use HTTPS with valid SSL certificates
   - Enable CORS only for trusted origins

4. **Data Security:**
   - Enable MongoDB authentication
   - Use PostgreSQL role-based access
   - Encrypt data at rest
   - Regular backups to secure storage

5. **Container Security:**
   - Run containers as non-root user
   - Use read-only file systems where possible
   - Limit resource usage (CPU, memory)
   - Enable security options

---

## Troubleshooting

### Service won't start

```bash
# Check logs
docker-compose logs backend

# Check resource usage
docker stats

# Restart services
docker-compose restart
```

### Database connection errors

```bash
# Test database connectivity
docker-compose exec backend curl http://mongodb:27017

# Check database health
docker-compose ps
```

### Memory issues

```bash
# Check resource limits
docker inspect container-id | grep -A 20 "HostConfig"

# Update docker-compose with resource limits
```

### Networking issues

```bash
# Check network
docker network ls
docker network inspect project_rag-network

# Restart network
docker network prune
docker-compose down
docker-compose up -d
```

---

## Performance Tuning

### Database Optimization

```yaml
mongodb:
  environment:
    MONGO_INITDB_DATABASE: rag-evaluation
  command: mongod --wiredTigerCacheSizeGB=2
```

### Backend Optimization

```bash
NODE_OPTIONS=--max-old-space-size=4096
```

### Frontend Optimization

```bash
NEXT_TELEMETRY_DISABLED=1
```

---

## Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database backups configured
- [ ] Logging centralized
- [ ] Monitoring enabled
- [ ] Health checks passing
- [ ] Performance tested
- [ ] Security audit completed
- [ ] Disaster recovery plan
- [ ] Team training completed

---

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review this guide
3. Contact DevOps team
