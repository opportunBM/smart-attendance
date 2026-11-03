// Connexion à la base de données Supabase (utilisée par toutes les pages)
const supabaseUrl = 'https://utphktzhelqzdkbcbexb.supabase.co';
const supabaseKey = 'sb_publishable_fXEtG5jWI7KssD1iER8oqQ_JpYyMNRs';
const _supabase = (window.supabase || supabase).createClient(supabaseUrl, supabaseKey);
