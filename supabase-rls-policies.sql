-- ============================================
-- ICHRAK API - Row Level Security (RLS) Policies
-- ============================================
-- This script enables RLS and creates security policies for all tables
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- ============================================
-- STEP 1: Enable RLS on All Tables
-- ============================================

ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Create Helper Function
-- ============================================

-- Helper function to get current user's role from JWT
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    'anonymous'
  )::text;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- DOMAINS TABLE POLICIES
-- ============================================

-- Anyone can view all domains (public catalog)
CREATE POLICY "Anyone can view domains"
ON domains FOR SELECT
USING (true);

-- Only Super Admin can create domains
CREATE POLICY "Super Admin can create domains"
ON domains FOR INSERT
WITH CHECK (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Only Super Admin can update domains
CREATE POLICY "Super Admin can update domains"
ON domains FOR UPDATE
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Only Super Admin can delete domains
CREATE POLICY "Super Admin can delete domains"
ON domains FOR DELETE
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- ============================================
-- CATEGORIES TABLE POLICIES
-- ============================================

-- Anyone can view categories
CREATE POLICY "Anyone can view categories"
ON categories FOR SELECT
USING (true);

-- Only Super Admin can create categories
CREATE POLICY "Super Admin can create categories"
ON categories FOR INSERT
WITH CHECK (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Only Super Admin can update categories
CREATE POLICY "Super Admin can update categories"
ON categories FOR UPDATE
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Only Super Admin can delete categories
CREATE POLICY "Super Admin can delete categories"
ON categories FOR DELETE
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- ============================================
-- SERVICES TABLE POLICIES
-- ============================================

-- Anyone can view active services
CREATE POLICY "Anyone can view services"
ON services FOR SELECT
USING (true);

-- Only Super Admin can create services
CREATE POLICY "Super Admin can create services"
ON services FOR INSERT
WITH CHECK (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Only Super Admin can update services
CREATE POLICY "Super Admin can update services"
ON services FOR UPDATE
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Only Super Admin can delete services
CREATE POLICY "Super Admin can delete services"
ON services FOR DELETE
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Super Admin can view all users
CREATE POLICY "Super Admin can view all users"
ON users FOR SELECT
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (
  auth.uid() = id
);

-- Only Super Admin can create users (registration)
CREATE POLICY "Super Admin can create users"
ON users FOR INSERT
WITH CHECK (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Users can update their own profile (except role and domainId)
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
);

-- Only Super Admin can delete users
CREATE POLICY "Super Admin can delete users"
ON users FOR DELETE
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- ============================================
-- PRODUCT_CATEGORIES TABLE POLICIES
-- ============================================

-- Anyone can view product categories
CREATE POLICY "Anyone can view product categories"
ON product_categories FOR SELECT
USING (true);

-- Only Super Admin can create product categories
CREATE POLICY "Super Admin can create product categories"
ON product_categories FOR INSERT
WITH CHECK (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Only Super Admin can update product categories
CREATE POLICY "Super Admin can update product categories"
ON product_categories FOR UPDATE
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Only Super Admin can delete product categories
CREATE POLICY "Super Admin can delete product categories"
ON product_categories FOR DELETE
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- ============================================
-- GLOBAL_PRODUCTS TABLE POLICIES
-- ============================================

-- Anyone can view active global products
CREATE POLICY "Anyone can view global products"
ON global_products FOR SELECT
USING (true);

-- Only Super Admin can create global products
CREATE POLICY "Super Admin can create global products"
ON global_products FOR INSERT
WITH CHECK (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Only Super Admin can update global products
CREATE POLICY "Super Admin can update global products"
ON global_products FOR UPDATE
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Only Super Admin can delete global products
CREATE POLICY "Super Admin can delete global products"
ON global_products FOR DELETE
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- ============================================
-- ADMIN_PRODUCTS TABLE POLICIES
-- ============================================

-- Anyone can view available admin products
CREATE POLICY "Anyone can view admin products"
ON admin_products FOR SELECT
USING (true);

-- Admin can create products (automatically scoped to their domain via application logic)
CREATE POLICY "Admin can create products"
ON admin_products FOR INSERT
WITH CHECK (
  auth.user_role() = 'ADMIN' AND
  "adminId" = auth.uid()
);

-- Admin can update their own products
CREATE POLICY "Admin can update own products"
ON admin_products FOR UPDATE
USING (
  auth.user_role() = 'ADMIN' AND
  "adminId" = auth.uid()
);

-- Admin can delete their own products
CREATE POLICY "Admin can delete own products"
ON admin_products FOR DELETE
USING (
  auth.user_role() = 'ADMIN' AND
  "adminId" = auth.uid()
);

-- Super Admin can manage all products
CREATE POLICY "Super Admin can manage all admin products"
ON admin_products FOR ALL
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- ============================================
-- PROMO_CODES TABLE POLICIES
-- ============================================

-- Anyone can view active promo codes
CREATE POLICY "Anyone can view active promo codes"
ON promo_codes FOR SELECT
USING (
  "isActive" = true
);

-- Admin can view their own promo codes (even inactive)
CREATE POLICY "Admin can view own promo codes"
ON promo_codes FOR SELECT
USING (
  auth.user_role() = 'ADMIN' AND
  "adminId" = auth.uid()
);

-- Super Admin can view all promo codes
CREATE POLICY "Super Admin can view all promo codes"
ON promo_codes FOR SELECT
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Admin can create promo codes
CREATE POLICY "Admin can create promo codes"
ON promo_codes FOR INSERT
WITH CHECK (
  auth.user_role() = 'ADMIN' AND
  "adminId" = auth.uid()
);

-- Admin can update their own promo codes
CREATE POLICY "Admin can update own promo codes"
ON promo_codes FOR UPDATE
USING (
  auth.user_role() = 'ADMIN' AND
  "adminId" = auth.uid()
);

-- Admin can delete their own promo codes
CREATE POLICY "Admin can delete own promo codes"
ON promo_codes FOR DELETE
USING (
  auth.user_role() = 'ADMIN' AND
  "adminId" = auth.uid()
);

-- Super Admin can manage all promo codes
CREATE POLICY "Super Admin can manage all promo codes"
ON promo_codes FOR ALL
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- ============================================
-- USER_PROMO_CODES TABLE POLICIES
-- ============================================

-- Users can view their own promo codes
CREATE POLICY "Users can view own promo codes"
ON user_promo_codes FOR SELECT
USING (
  "userId" = auth.uid()
);

-- Admin can view promo codes they created
CREATE POLICY "Admin can view assigned promo codes"
ON user_promo_codes FOR SELECT
USING (
  auth.user_role() = 'ADMIN' AND
  EXISTS (
    SELECT 1 FROM promo_codes
    WHERE promo_codes.id = user_promo_codes."promoCodeId"
    AND promo_codes."adminId" = auth.uid()
  )
);

-- Super Admin can view all user promo codes
CREATE POLICY "Super Admin can view all user promo codes"
ON user_promo_codes FOR SELECT
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Authenticated users can assign promo codes to themselves
CREATE POLICY "Users can assign promo codes to themselves"
ON user_promo_codes FOR INSERT
WITH CHECK (
  "userId" = auth.uid()
);

-- Admin can assign their promo codes to users
CREATE POLICY "Admin can assign own promo codes"
ON user_promo_codes FOR INSERT
WITH CHECK (
  auth.user_role() = 'ADMIN' AND
  EXISTS (
    SELECT 1 FROM promo_codes
    WHERE promo_codes.id = user_promo_codes."promoCodeId"
    AND promo_codes."adminId" = auth.uid()
  )
);

-- ============================================
-- PROMO_CODE_USAGES TABLE POLICIES
-- ============================================

-- Users can view their own usage history
CREATE POLICY "Users can view own usage history"
ON promo_code_usages FOR SELECT
USING (
  "userId" = auth.uid()
);

-- Admin can view usage of their promo codes
CREATE POLICY "Admin can view own promo code usage"
ON promo_code_usages FOR SELECT
USING (
  auth.user_role() = 'ADMIN' AND
  EXISTS (
    SELECT 1 FROM promo_codes
    WHERE promo_codes.id = promo_code_usages."promoCodeId"
    AND promo_codes."adminId" = auth.uid()
  )
);

-- Super Admin can view all usage
CREATE POLICY "Super Admin can view all usage"
ON promo_code_usages FOR SELECT
USING (
  auth.user_role() = 'SUPER_ADMIN'
);

-- Users can create usage records when using promo codes
CREATE POLICY "Users can create usage records"
ON promo_code_usages FOR INSERT
WITH CHECK (
  "userId" = auth.uid()
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify RLS is enabled:
/*
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'domains', 'categories', 'services', 'users',
  'product_categories', 'global_products', 'admin_products',
  'promo_codes', 'user_promo_codes', 'promo_code_usages'
);

-- Should show rowsecurity = true for all tables
*/

-- View all policies:
/*
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
*/
