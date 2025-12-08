#!/usr/bin/env node

/**
 * Create Super Admin Account Script
 *
 * This script creates a super admin account with:
 * - Email: superadmin@mail.com
 * - Password: password
 * - Role: admin
 * - Status: Active and Email Confirmed
 *
 * Usage:
 *   node scripts/create-super-admin.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Super admin credentials
const SUPER_ADMIN_EMAIL = 'superadmin@mail.com';
const SUPER_ADMIN_PASSWORD = 'password';

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing environment variables');
  console.error('');
  console.error('Please ensure the following are set in your .env file:');
  console.error('  - VITE_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Get your service role key from:');
  console.error('  Supabase Dashboard → Project Settings → API → service_role key');
  process.exit(1);
}

if (SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('❌ Error: Please update SUPABASE_SERVICE_ROLE_KEY in .env file');
  console.error('');
  console.error('Steps to get your service role key:');
  console.error('  1. Go to https://supabase.com/dashboard');
  console.error('  2. Select your project');
  console.error('  3. Go to Project Settings → API');
  console.error('  4. Copy the "service_role" key (NOT the anon/public key)');
  console.error('  5. Update SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSuperAdmin() {
  console.log('🚀 Starting super admin creation...');
  console.log('');

  try {
    // Step 1: Check if user already exists
    console.log('📋 Checking if user already exists...');
    const { data: existingUsers, error: checkError } = await supabase.auth.admin.listUsers();

    if (checkError) {
      throw new Error(`Failed to check existing users: ${checkError.message}`);
    }

    const existingUser = existingUsers.users.find(u => u.email === SUPER_ADMIN_EMAIL);

    let userId;

    if (existingUser) {
      console.log(`✅ User already exists with ID: ${existingUser.id}`);
      userId = existingUser.id;

      // Update user to ensure email is confirmed
      console.log('📧 Ensuring email is confirmed...');
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { email_confirmed_at: new Date().toISOString() }
      );

      if (updateError) {
        console.warn(`⚠️  Warning: Could not confirm email: ${updateError.message}`);
      } else {
        console.log('✅ Email confirmed');
      }
    } else {
      // Step 2: Create new user
      console.log('👤 Creating new user account...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: 'Super Admin'
        }
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      console.log(`✅ User created with ID: ${userId}`);
    }

    // Step 3: Check if admin role already assigned
    console.log('🔐 Checking admin role assignment...');
    const { data: existingRole, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleCheckError && roleCheckError.code !== 'PGRST116') {
      throw new Error(`Failed to check role: ${roleCheckError.message}`);
    }

    if (existingRole) {
      console.log('✅ Admin role already assigned');
    } else {
      // Step 4: Assign admin role
      console.log('🎯 Assigning admin role...');
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (roleError) {
        throw new Error(`Failed to assign admin role: ${roleError.message}`);
      }

      console.log('✅ Admin role assigned successfully');
    }

    // Step 5: Verify the setup
    console.log('');
    console.log('🔍 Verifying super admin setup...');

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) {
      throw new Error(`Failed to verify user: ${userError.message}`);
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError) {
      throw new Error(`Failed to verify role: ${roleError.message}`);
    }

    // Success!
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('✨ Super Admin Account Created Successfully! ✨');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('📧 Email:', SUPER_ADMIN_EMAIL);
    console.log('🔑 Password:', SUPER_ADMIN_PASSWORD);
    console.log('👤 User ID:', userId);
    console.log('🎭 Role:', roleData.role);
    console.log('✅ Email Confirmed:', userData.user.email_confirmed_at ? 'Yes' : 'No');
    console.log('📅 Created At:', userData.user.created_at);
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('🎉 You can now login with these credentials!');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Error creating super admin:');
    console.error(error.message);
    console.error('');
    process.exit(1);
  }
}

// Run the script
createSuperAdmin();
