
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

interface SupabaseSetupGuideProps {
  onDismiss?: () => void;
}

export function SupabaseSetupGuide({ onDismiss }: SupabaseSetupGuideProps) {
  const openSupabaseDocs = () => {
    Linking.openURL('https://supabase.com/docs/guides/getting-started');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={48}
            color={colors.accent}
          />
          <Text style={styles.title}>Supabase Setup Required</Text>
          <Text style={styles.subtitle}>
            Your app is currently using local storage. To enable cloud storage and access from multiple devices, please set up Supabase.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Setup Steps:</Text>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Create a Supabase Project</Text>
              <Text style={styles.stepDescription}>
                Go to supabase.com and create a new project. This is free to get started.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Create the Database Table</Text>
              <Text style={styles.stepDescription}>
                In your Supabase project, go to the SQL Editor and run this SQL:
              </Text>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>
{`CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  address TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  mobile TEXT,
  vehicles JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed)
CREATE POLICY "Allow all operations" ON customers
  FOR ALL USING (true);`}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Get Your API Keys</Text>
              <Text style={styles.stepDescription}>
                In your Supabase project settings, find your Project URL and anon/public API key.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Add Environment Variables</Text>
              <Text style={styles.stepDescription}>
                Create a .env file in your project root with:
              </Text>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>
{`EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>5</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Restart Your App</Text>
              <Text style={styles.stepDescription}>
                After adding the environment variables, restart your development server for the changes to take effect.
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.docsButton} onPress={openSupabaseDocs}>
          <IconSymbol
            ios_icon_name="book.fill"
            android_material_icon_name="menu-book"
            size={20}
            color={colors.card}
          />
          <Text style={styles.docsButtonText}>View Supabase Documentation</Text>
        </TouchableOpacity>

        {onDismiss && (
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissButtonText}>Continue with Local Storage</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.card,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  codeBlock: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  codeText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.text,
    lineHeight: 18,
  },
  docsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 8,
  },
  docsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.card,
  },
  dismissButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
