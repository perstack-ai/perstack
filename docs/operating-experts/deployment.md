# Deployment

Perstack runs on any Node.js environment. Choose your deployment target based on security requirements, cost, and operational preferences.

## Docker

Build a container image for your Expert:

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY perstack.toml /app/perstack.toml
RUN npm install -g perstack
ENTRYPOINT ["perstack", "run", "--config", "/app/perstack.toml"]
```

Run with isolation controls:

```bash
docker build -t my-expert .
docker run --rm \
  -e ANTHROPIC_API_KEY \
  -v $(pwd)/workspace:/workspace \
  my-expert my-expert "query"
```

For production, add resource limits and network restrictions. See [Isolation by Design](./isolation-by-design.md).

## AWS ECS + Fargate

```yaml
taskDefinition:
  cpu: 1024
  memory: 2048
  containerDefinitions:
    - name: perstack-expert
      image: my-org/perstack-runner
      command: ["my-expert", "query"]
      environment:
        - name: ANTHROPIC_API_KEY
          valueFrom: "arn:aws:secretsmanager:region:account:secret:key"
      logConfiguration:
        logDriver: awslogs
        options:
          awslogs-group: /ecs/perstack
          awslogs-region: us-east-1
```

Parse stdout logs to capture execution events.

## Google Cloud Run

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: perstack-expert
spec:
  template:
    spec:
      containers:
        - image: my-org/perstack-runner
          command: ["perstack", "run", "my-expert"]
          env:
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: anthropic-key
                  key: latest
          resources:
            limits:
              cpu: "1"
              memory: 2Gi
```

## Cloudflare Workers

```typescript
import { run } from "@perstack/runtime"

export default {
  async fetch(request: Request, env: Env) {
    const { query, expertKey } = await request.json()
    const events: unknown[] = []
    await run(
      { expertKey, query, providerConfig: { apiKey: env.ANTHROPIC_API_KEY } },
      { eventListener: (event) => events.push(event) }
    )
    return Response.json(events)
  }
}
```

## Secrets management

Never hardcode API keys. Use platform-native secrets:

| Platform   | Method                                  |
| ---------- | --------------------------------------- |
| Docker     | Environment variables, Docker secrets   |
| AWS        | Secrets Manager, Parameter Store        |
| GCP        | Secret Manager                          |
| Cloudflare | Workers secrets (`wrangler secret put`) |

## Registry Experts

Deploy Experts from the registry without building custom images:

```bash
docker run --rm \
  -e ANTHROPIC_API_KEY \
  -v $(pwd)/workspace:/workspace \
  node:22-slim \
  npx perstack run @org/expert@1.0.0 "query"
```

Pin versions for reproducible deployments.

## What's next

- [Isolation by Design](./isolation-by-design.md) — security configuration
- [Observing](./observing.md) — monitoring and auditing
