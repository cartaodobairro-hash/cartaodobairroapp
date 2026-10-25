<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Banner media links use an authenticated function checking active records; keep storage SELECT admin-only to prevent private browsing.
- Seller attribution occurs at signup or authenticated OAuth login; proposal email and CPF must match before linking, without exposing leads publicly.
- Use the shared PasswordInput for password entry screens so show/hide behavior remains consistent without altering authentication logic.
- InfinitePay checkout orders identify a specific pending payment; verification and activation must match that payment and its amount before extending a subscription, so renewals cannot double-count or credit the wrong installment.
- Create pending customer records only for customer signups, independently of plan/payment; consume a short-lived service-only provisioning intent bound to an unguessable creation token for seller/staff/admin accounts because Auth may apply app_metadata after its INSERT trigger. Never trust user-editable roles. Seller client lists merge registered customers with unconverted proposals so both panels show unpaid signups.
- Registration checks canonical identity emails against Auth and profiles through a service-only function; profile constraints and the signup lifecycle trigger enforce uniqueness under concurrency, so UI checks cannot bypass the rule.
- Partner logos live in the private partner-logos bucket under the owning partner ID; storage access is owner-scoped so one partner cannot browse another's uploads.
- Customer-facing partner lists obtain signed logos through an authenticated function that checks approved partner records; this preserves owner-only storage browsing while showing approved brands.
- Benefit product images live in the private benefit-images bucket under the owning partner ID; direct storage reads are owner/admin-only, while public pages get short-lived signed links from a server function that checks active benefits and approved partners.
- InfinitePay webhook URLs carry an order-bound signature; reject unsigned callbacks before provider queries; old orders use authenticated return confirmation.
- Email/password signups sign in immediately without email confirmation; paid benefits remain gated by payment, separate from account access.
- Admin collaborators live in staff_members with per-module view/edit permissions; RLS adds staff_can(module, edit) policies alongside is_admin ones, so access is enforced in the database, not just the menu.
- Keep home-screen support manifest-only and derive favicon and mobile icons from the shared brand asset; no offline service worker is needed for app-icon support.
- Card usage INSERT checks associations through the authenticated boolean-only can_register_card_usage function, so card SELECT policies do not hide first-use cards or grant partners general card browsing.
- Partner usage cache keys distinguish recent attendances from reports because their projections and row limits differ; invalidate the shared partner-usage prefix after attendance changes.
- Attendance notifications are created atomically by the card_usage trigger; reviews use an ownership-checked RPC with one rating per attendance and database-managed partner aggregates, preventing spoofed reviews or missing invitations.
