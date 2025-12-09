import { StoreProfile, UserProfile } from '../types';
import { DB } from './db';

const KEYS = {
    CURRENT_USER: 'kirana_auth_user',
    // In a real app, this data lives on a server. 
    // Here we simulate "Cloud" storage by prefixing keys with email.
    CLOUD_DB_PREFIX: 'kirana_cloud_' 
};

export const AuthService = {
    // Check if user is logged in
    getCurrentUser: (): UserProfile | null => {
        const data = localStorage.getItem(KEYS.CURRENT_USER);
        return data ? JSON.parse(data) : null;
    },

    // Simulate Signup
    signup: async (email: string, password: string, storeName: string, ownerName: string): Promise<boolean> => {
        // In a real app, this calls an API.
        // Here, we check if this "cloud" account already exists in local simulation
        const cloudKey = `${KEYS.CLOUD_DB_PREFIX}${email}`;
        if (localStorage.getItem(cloudKey)) {
            throw new Error("User already exists. Please login.");
        }

        const newUser: UserProfile = {
            email,
            storeName,
            ownerName,
            createdAt: new Date().toISOString()
        };

        // Initialize "Cloud" storage for this user
        const initialData = {
            profile: { name: storeName, ownerName, address: '', phone: '' },
            customers: [],
            transactions: []
        };
        
        localStorage.setItem(cloudKey, JSON.stringify(initialData));
        return true;
    },

    // Simulate Login
    login: async (email: string, password: string): Promise<UserProfile> => {
        // In real app: Verify password with server.
        const cloudKey = `${KEYS.CLOUD_DB_PREFIX}${email}`;
        const cloudDataString = localStorage.getItem(cloudKey);
        
        if (!cloudDataString) {
            throw new Error("User not found. Please sign up.");
        }

        // Simulate network delay
        await new Promise(r => setTimeout(r, 800));

        const cloudData = JSON.parse(cloudDataString);
        
        const user: UserProfile = {
            email,
            storeName: cloudData.profile.name,
            ownerName: cloudData.profile.ownerName,
            createdAt: new Date().toISOString() // Mock
        };

        // Set Session
        localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
        
        // Load "Cloud" data into Active DB (Hydrate the app)
        DB.importData(cloudDataString);
        
        return user;
    },

    logout: () => {
        // Before logout, sync current state back to "Cloud"
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) {
            const data = DB.exportData(); // Get current state
            localStorage.setItem(`${KEYS.CLOUD_DB_PREFIX}${currentUser.email}`, data);
        }
        
        localStorage.removeItem(KEYS.CURRENT_USER);
        DB.clearAllData(); // Clear active memory so next user sees fresh slate
    },

    // Sync Data to "Cloud" (Call this on every save/update)
    sync: () => {
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) {
            const data = DB.exportData();
            localStorage.setItem(`${KEYS.CLOUD_DB_PREFIX}${currentUser.email}`, data);
        }
    },

    deleteAccount: () => {
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) {
            localStorage.removeItem(`${KEYS.CLOUD_DB_PREFIX}${currentUser.email}`);
            localStorage.removeItem(KEYS.CURRENT_USER);
            DB.clearAllData();
        }
    }
};