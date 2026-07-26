# Email alerts

## Purpose

After a successful import, the alert evaluator compares each imported metric with its active threshold and emails all Customer Admins for that organization when a value breaches the rule.

## Processing flow

1. The import transaction succeeds.
2. A trusted worker, Edge Function, or server job resolves the threshold for each imported metric.
3. It evaluates the configured comparison operator.
4. For each breach, it finds Customer Admin recipients from profiles and sends one clear email per alert event.
5. It records the result in `alert_deliveries`, including threshold, measured value, recipients, timestamp, and provider outcome.

## Recipient experience

1. A Customer Admin receives an email naming the affected metric, observed value, threshold, and record time.
2. The email links to the customer dashboard.
3. After signing in, RLS limits the linked dashboard to that admin’s organization.

## Reliability rules

- Email delivery occurs only after metric data commits.
- Deduplicate the same import/organization/metric breach to avoid duplicate sends on retries.
- Never send customer data to recipients outside the organization.
