import { UserProfile } from '../types';
import { DB } from './db';
import { supabase } from './supabase';

const KEYS = {
    CURRENT_USER: 'kirana_auth_user',
    TABLE_NAME: 'user_data'
};

let syncTimer: any = null;

export const AuthService = {
    // Check if user is logged in via Supabase Session
    initialize: async (): Promise<UserProfile | null> => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                const user = mapSupabaseUser(session.user);
                localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
                
                // Fetch latest data from cloud on init
                await AuthService.pullData(session.user.id);
                
                return user;
            } else {
                localStorage.removeItem(KEYS.CURRENT_USER);
                return null;
            }
        } catch (error) {
            console.error("Auth Init Error:", error);
            return null;
        }
    },

    getCurrentUser: (): UserProfile | null => {
        const data = localStorage.getItem(KEYS.CURRENT_USER);
        return data ? JSON.parse(data) : null;
    },

    signup: async (email: string, password: string, storeName: string, ownerName: string): Promise<boolean> => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    store_name: storeName,
                    owner_name: ownerName
                }
            }
        });

        if (error) throw error;
        if (!data.user) throw new Error("Signup failed");

        // Prepare initial app data
        const initialProfile = { name: storeName, ownerName, address: '', phone: '' };
        DB.saveProfile(initialProfile); // Update local state
        
        // Initial Sync to create the row in user_data
        const appData = DB.exportData();
        const { error: dbError } = await supabase.from(KEYS.TABLE_NAME).insert({
            user_id: data.user.id,
            content: JSON.parse(appData)
        });

        if (dbError) {
             console.warn("Could not create initial data row. Please ensure 'user_data' table exists.", dbError);
        }

        return true;
    },

    login: async (email: string, password: string): Promise<UserProfile> => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        if (!data.user) throw new Error("Login failed");

        const user = mapSupabaseUser(data.user);
        localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));

        // Load data from cloud
        await AuthService.pullData(data.user.id);

        return user;
    },

    logout: async () => {
        // Sync one last time before logout
        await AuthService.sync(true);
        
        await supabase.auth.signOut();
        localStorage.removeItem(KEYS.CURRENT_USER);
        DB.clearAllData();
    },

    // Pull data from Supabase into LocalStorage (DB)
    pullData: async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from(KEYS.TABLE_NAME)
                .select('content')
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            if (data?.content) {
                DB.importData(JSON.stringify(data.content));
            }
        } catch (error) {
            console.error("Failed to pull data from cloud:", error);
        }
    },

    // Sync Data to "Cloud" (Debounced)
    sync: async (immediate = false) => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) return;

        // Debounce logic to prevent too many DB writes
        if (syncTimer) clearTimeout(syncTimer);

        const performSync = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const appData = DB.exportData();
                
                const { error } = await supabase
                    .from(KEYS.TABLE_NAME)
                    .upsert({
                        user_id: user.id,
                        content: JSON.parse(appData),
                        updated_at: new Date().toISOString()
                    });
                
                if (error) console.error("Cloud Sync Error:", error);
                else console.log("Cloud Sync Success");
                
            } catch (err) {
                console.error("Sync Exception:", err);
            }
        };

        if (immediate) {
            await performSync();
        } else {
            syncTimer = setTimeout(performSync, 2000); // 2 second debounce
        }
    },

    deleteAccount: async () => {
        // Supabase client cannot delete user easily without Service Role, 
        // but we can clear data.
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from(KEYS.TABLE_NAME).delete().eq('user_id', user.id);
            await AuthService.logout();
        }
    }
};

const mapSupabaseUser = (sbUser: any): UserProfile => {
    return {
        email: sbUser.email || '',
        storeName: sbUser.user_metadata?.store_name || 'My Store',
        ownerName: sbUser.user_metadata?.owner_name || 'Owner',
        createdAt: sbUser.created_at
    };
}