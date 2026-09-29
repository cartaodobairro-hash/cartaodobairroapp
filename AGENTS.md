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
- Create a pending customer record at registration, independently of plan/payment; seller client lists merge registered customers with unconverted proposals so both panels show unpaid signups.
- Partner logos live in the private partner-logos bucket under the owning partner ID; storage access is owner-scoped so one partner cannot browse another's uploads.
- Customer-facing partner lists obtain signed logos through an authenticated function that checks approved partner records; this preserves owner-only storage browsing while showing approved brands.
- Benefit product images live in the private benefit-images bucket under the owning partner ID; direct storage reads are owner/admin-only, while public pages get short-lived signed links from a server function that checks active benefits and approved partners.
- InfinitePay webhook URLs carry an order-bound signature; reject unsigned callbacks before provider queries; old orders use authenticated return confirmation.
- Email/password signups sign in immediately without email confirmation; paid benefits remain gated by payment, separate from account access.
