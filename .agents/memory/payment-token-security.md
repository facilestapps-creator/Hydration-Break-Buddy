---
name: Payment Token Security Pattern
description: How to safely validate and consume a one-time payment token at team creation.
---

## Rule
Never just `SELECT WHERE status='approved'`. Always do an **atomic UPDATE**:

```sql
UPDATE payments
SET consumed = true, updated_at = now()
WHERE payment_token = ?
  AND status = 'approved'
  AND user_id = ?        -- bind to the paying user
  AND consumed = false   -- one-time use
RETURNING id
```

If `returning` returns 0 rows → reject with 402.

**Why:** A read-then-write check has a TOCTOU race and allows:
- Reusing one approved payment to create multiple teams
- One user's payment being claimed by a different userId

**How to apply:** Any route that "unlocks" a resource based on a payment token.
