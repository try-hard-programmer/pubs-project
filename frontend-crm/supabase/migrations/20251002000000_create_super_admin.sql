-- Create super admin user account
-- This migration creates a super admin account for testing purposes
-- Email: superadmin@mail.com
-- Password: password

DO $$
DECLARE
    v_user_id UUID;
    v_encrypted_password TEXT;
BEGIN
    -- Generate bcrypt hash for password 'password'
    -- Using Supabase's auth.crypt function
    v_encrypted_password := crypt('password', gen_salt('bf'));

    -- Check if user already exists
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'superadmin@mail.com';

    -- If user doesn't exist, create it
    IF v_user_id IS NULL THEN
        -- Insert user into auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'superadmin@mail.com',
            v_encrypted_password,
            NOW(), -- email_confirmed_at (auto-confirmed)
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{}'::jsonb,
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        ) RETURNING id INTO v_user_id;

        RAISE NOTICE 'Created super admin user with ID: %', v_user_id;

        -- Insert admin role for the user
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        RAISE NOTICE 'Assigned admin role to user ID: %', v_user_id;

        -- Create identity record
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            format('{"sub":"%s","email":"superadmin@mail.com"}', v_user_id)::jsonb,
            'email',
            v_user_id::text,
            NOW(),
            NOW(),
            NOW()
        );

        RAISE NOTICE 'Super admin account created successfully!';
        RAISE NOTICE 'Email: superadmin@mail.com';
        RAISE NOTICE 'Password: password';
        RAISE NOTICE 'Status: Active and Email Confirmed';
    ELSE
        RAISE NOTICE 'User with email superadmin@mail.com already exists with ID: %', v_user_id;

        -- Ensure the user has admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        RAISE NOTICE 'Ensured admin role is assigned';
    END IF;
END $$;
