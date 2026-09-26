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

- Banner media links for customers are issued by an authenticated server function after checking active banner records; keep storage SELECT admin-only so arbitrary signed-in users cannot browse private files.
- Seller referral attribution occurs at account creation for email signup and at authenticated login for OAuth/existing accounts; proposal ownership must match the customer's email and CPF before linking, so unpaid referrals are visible immediately without exposing leads publicly.
- Use the shared PasswordInput for password entry screens so show/hide behavior remains consistent without altering authentication logic.
- InfinitePay checkout orders identify a specific pending payment; verification and activation must match that payment and its amount before extending a subscription, so renewals cannot double-count or credit the wrong installment.
- Create a pending customer record at registration, independently of plan/payment; seller client lists merge registered customers with unconverted proposals so both panels show unpaid signups.
- Partner logos live in the private partner-logos bucket under the owning partner ID; storage access is owner-scoped so one partner cannot browse another's uploads.
- Benefit product images live in the private benefit-images bucket under the owning partner ID; active benefits of approved partners may be viewed by visitors through signed links, avoiding public access to unrelated files.
