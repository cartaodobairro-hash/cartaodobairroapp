INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role FROM auth.users WHERE email = 'duartecleiton392@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;