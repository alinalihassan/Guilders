# Data Model Roadmap

Improvements inspired by Maybe's data model, plus additional backend/DB features for Guilders.

## Selected Improvements (from Maybe comparison)

### High Priority

- [x] **Historical Balance Snapshots**
      A `balance` table storing daily balance snapshots per account (date, balance, currency). Enables net worth over time charts, trend analysis, and performance tracking. Currently we only store a single `value` on the account.

- [x] **Categories as a First-Class Entity**
      A `category` table with `parent_id` (hierarchy/subcategories), `color`, `icon`, and `classification` (income/expense), scoped per user. Replace the current `varchar("category")` string on transactions with a proper foreign key. Enables spending-by-category reports, custom icons, and nested categories like "Food > Restaurants".

- [ ] **Merchants**
      A `merchant` table with `name`, `logo_url`, `website_url`, and `color`, scoped per user. Link transactions to merchants via `merchant_id`. Enables automatic grouping ("How much at Amazon?"), logo display, and powers auto-categorization.

- [x] **Locked Attributes**
      Add `locked_attributes jsonb` to `account` and `transaction` tables. Tracks which fields are provider-managed vs user-edited, preventing sync from overwriting manual edits. Essential for a good synced-account experience.

- [x] **Historical Exchange Rates**
      Extend the `rate` table (or create `exchange_rate`) to include a `date` dimension: `from_currency`, `to_currency`, `rate`, `date`. Required for accurate multi-currency net worth history. The current single-rate-per-currency model is only correct for "right now".

- [ ] **Transaction Enrichment**
      Enrich transactions in synced bank accounts by adding transactions in a queue once they hit the database.

### Medium Priority

- [ ] **Tags (Polymorphic Tagging)**
      A `tag` table (name, color, user-scoped) and `tagging` join table (taggable_type, taggable_id). Gives users flexible labeling orthogonal to categories — "vacation", "tax-deductible", "reimbursable", etc.

- [ ] **Transfers Between Accounts**
      A `transfer` table linking an `inflow_transaction_id` to an `outflow_transaction_id`. Without this, moving money between accounts distorts spending/income reports. Include a `rejected_transfer` table so users can dismiss false-positive suggestions.

- [ ] **Onboarding Flow & User Preferences Expansion**
      Extend `user_setting` beyond just currency: `locale`, `timezone`, `date_format`, `default_period` (last 30 days, this month, etc.), `theme`, `onboarded_at`. Most of these are trivial columns but important for a polished experience.

- [ ] **User deletion queue**
      Delete users from providers and delete their files from file storage after deletion

### Low Priority

- [ ] **Budgets**
      A `budget` table (date range, expected income, budgeted spending) and `budget_category` table (budgeted amount per category per period). Core personal finance feature but depends on categories being implemented first.

- [ ] **Securities, Prices, and Holdings**
  - `security` — ticker, name, exchange info, logo
  - `security_price` — daily price history per security
  - `holding` — daily snapshots of qty + price per account per security
  - Refactor trades out of the flat account fields into proper `trade` records

  Enables real portfolio performance, cost basis, gains/losses, and allocation breakdowns.

- [ ] **Transaction Rules / Automation**
  - `rule` — name, resource type, active flag, effective date
  - `rule_condition` — nested conditions with operator/value
  - `rule_action` — action type and value

  Auto-categorize, auto-tag, or auto-assign merchants to transactions based on user-defined rules.

- [ ] **Notifications**
      A `notification` table for in-app and push notifications. Fields: `user_id`, `type`, `title`, `body`, `data jsonb`, `read_at`, `created_at`. Supports alerts for large transactions, budget exceeded, sync failures, upcoming bills, etc.
