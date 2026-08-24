```mermaid
flowchart TD
  A[New page] --> B[Edit]
  B --> C[Review]
  C --> D{Approved?}
  D -->|Yes| E[Publish]
  D -->|No| B
```
