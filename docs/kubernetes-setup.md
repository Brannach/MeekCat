# Kubernetes Setup & Deployment Guide — MeekCat

> This guide is tailored to the MeekCat project running on **Windows with WSL2 and Docker Desktop**.
> It covers setting up a local Kubernetes cluster with minikube and deploying the app to it.

---

## Prerequisites

Before starting, make sure the following are installed on your Windows machine:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — with WSL2 backend enabled
- [minikube](https://minikube.sigs.k8s.io/docs/start/) — local Kubernetes cluster
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/) — Kubernetes CLI

---

## Part 1 — Setting Up the Cluster

### 1.1 Start minikube

```powershell
minikube start
```

Minikube creates a Debian Linux VM inside WSL2 and installs all Kubernetes components inside it.
The first run takes a few minutes; subsequent starts are fast.

### 1.2 Check the cluster is healthy

```powershell
minikube status
```

Expected output:

```
minikube
type: Control Plane
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured
```

All four lines must say `Running` or `Configured`. If anything is stopped, run `minikube start` again.

### 1.3 Verify kubectl can talk to the cluster

```powershell
kubectl get nodes
```

Expected output:

```
NAME       STATUS   ROLES           AGE   VERSION
minikube   Ready    control-plane   Xm    v1.35.x
```

`STATUS: Ready` means the cluster is up and accepting workloads.

---

## Part 2 — Understanding the Cluster

Your minikube cluster has a single node that acts as both control plane and worker.
The full stack is: **Windows → WSL2 → Debian VM (the node) → Docker → your containers (pods)**.

### Key components running inside the cluster

| Component | Namespace | What it does |
|---|---|---|
| `kube-apiserver` | kube-system | Front door — all `kubectl` commands talk to this |
| `etcd` | kube-system | The cluster's database — stores all state |
| `kube-controller-manager` | kube-system | Reconciliation engine — ensures desired state matches reality |
| `kube-scheduler` | kube-system | Decides which node a new pod runs on |
| `kube-proxy` | kube-system | Manages networking rules between pods and services |
| `coredns` | kube-system | DNS — lets pods find each other by name |
| `storage-provisioner` | kube-system | Automatically provisions storage volumes |
| `kubernetes-dashboard` | kubernetes-dashboard | Web UI for the cluster (optional add-on) |

### Namespaces

Namespaces are logical partitions of the cluster:

- **`default`** — where your app lives
- **`kube-system`** — Kubernetes internal components (don't touch)
- **`kube-node-lease`** — node heartbeat signals (ignore)
- **`kube-public`** — cluster-wide public info (ignore)
- **`kubernetes-dashboard`** — dashboard UI (if enabled)

### Network IP ranges

| Range | What it is |
|---|---|
| `192.168.49.2` | The node (the WSL2/Debian VM) |
| `10.96.0.0/12` | Service network — stable ClusterIPs live here |
| `10.244.0.0/24` | Pod network — every pod gets an IP from here |

---

## Part 3 — Deploying MeekCat

### Why you can't just `docker build` normally

Minikube runs its own internal Docker daemon inside the WSL2 VM, separate from Docker Desktop.
If you build an image with Docker Desktop, minikube can't see it — it would look for it in a
registry (like Docker Hub) and fail.

The solution: temporarily point your Docker CLI at **minikube's internal daemon**, build there,
and Kubernetes can use the image directly with no registry needed.

---

### 3.1 Point your Docker CLI at minikube's daemon

Run this in PowerShell **every time you open a new terminal session**:

```powershell
& minikube -p minikube docker-env --shell powershell | Invoke-Expression
```

This sets environment variables in your current session only. You can verify it worked:

```powershell
docker info | Select-String "Name"
# Should show: Name: minikube
```

### 3.2 Build the image inside minikube

From the project root:

```powershell
cd E:\Projects\MeekCat
docker build -t meekcat:latest .
```

This runs the multi-stage Dockerfile:
1. **Stage 1** — builds the React client with Vite
2. **Stage 2** — compiles `better-sqlite3` from source (takes ~1 min)
3. **Stage 3** — produces the final slim runtime image (Node.js server on port 3000)

### 3.3 Verify the image is inside minikube

```powershell
minikube image ls
```

Look for `docker.io/library/meekcat:latest` in the list. If it's there, the build landed correctly.

### 3.4 Create the Deployment

```powershell
kubectl create deployment meekcat --image=meekcat:latest
```

A Deployment manages the lifecycle of your app. It creates a ReplicaSet, which in turn creates
a Pod (the actual running container).

### 3.5 Set the image pull policy to Never

By default, Kubernetes tries to pull images from the internet. Since ours is local, we need to
tell it not to:

```powershell
kubectl patch deployment meekcat -p '{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"meekcat\",\"imagePullPolicy\":\"Never\"}]}}}}'
```

### 3.6 Verify the pod is running

```powershell
kubectl get pods
```

Wait until `STATUS` shows `Running` (may take 10–20 seconds):

```
NAME                       READY   STATUS    RESTARTS   AGE
meekcat-xxxxxxxxxx-xxxxx   1/1     Running   0          30s
```

If status is `ErrImageNeverPull` you missed step 3.5.
If status is `CrashLoopBackOff`, check the logs: `kubectl logs <pod-name>`

### 3.7 Expose the app as a Service

```powershell
kubectl expose deployment meekcat --type=NodePort --port=3000
```

This creates a Service that routes traffic to your pod. `NodePort` opens a port on the node
itself so you can reach the app from your browser.

### 3.8 Open the app in the browser

```powershell
minikube service meekcat
```

Minikube resolves the NodePort and opens the correct URL automatically.

---

## Part 4 — Day-to-Day Commands

### Check cluster status

```powershell
minikube status          # Is the cluster running?
kubectl get nodes        # Is the node ready?
kubectl get pods         # Are your pods running?
kubectl get services     # What services are exposed?
```

### Start and stop the cluster

```powershell
minikube start           # Start (remembers all previous deployments)
minikube stop            # Pause the cluster (VMs stop, nothing is lost)
minikube delete          # Destroy the cluster completely (clean slate)
```

### View app logs

```powershell
kubectl logs <pod-name>           # Latest logs
kubectl logs -f <pod-name>        # Follow logs in real time
```

Get the pod name with `kubectl get pods`.

### Restart the app (e.g. after a config change)

```powershell
kubectl rollout restart deployment meekcat
```

### Rebuild and redeploy after code changes

```powershell
# 1. Point Docker at minikube (if new terminal)
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

# 2. Rebuild the image
docker build -t meekcat:latest E:\Projects\MeekCat

# 3. Trigger a rollout (Kubernetes will pick up the new image)
kubectl rollout restart deployment meekcat

# 4. Watch the rollout
kubectl rollout status deployment meekcat
```

### Open the Kubernetes dashboard

```powershell
minikube dashboard
```

---

## Part 5 — How the Deployment Objects Relate

When you run `kubectl create deployment`, Kubernetes creates a chain of three objects:

```
Deployment: meekcat
    └── ReplicaSet: meekcat-58f7c595dd       (versioned snapshot of your pod spec)
            └── Pod: meekcat-58f7c595dd-9pfvk  (the actual running container)
```

- **Deployment** — what you manage. Handles rolling updates and rollbacks.
- **ReplicaSet** — maintains the desired replica count. Created automatically by the Deployment.
- **Pod** — the unit of execution. One or more containers sharing a network and storage.

If a pod crashes, the ReplicaSet creates a new one automatically.
If you update the image, the Deployment creates a new ReplicaSet and gradually shifts traffic to it.

---

## Troubleshooting

| Problem | Command to diagnose |
|---|---|
| Pod stuck in `Pending` | `kubectl describe pod <pod-name>` |
| Pod in `CrashLoopBackOff` | `kubectl logs <pod-name>` |
| Image not found | `minikube image ls` — check the image name matches exactly |
| Can't reach the app | `kubectl get services` — check the NodePort is assigned |
| Cluster not responding | `minikube status` then `minikube start` |
