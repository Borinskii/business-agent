// Set dummy env vars so modules with top-level env checks can be imported
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.SALESFORGE_API_KEY = 'test-salesforge-key'
process.env.SALESFORGE_WORKSPACE_ID = 'wks_test123'
