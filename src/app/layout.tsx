import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { RequirementsProvider } from "@/contexts/RequirementsContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import AuthHashErrorHandler from "@/components/auth/AuthHashErrorHandler";
import OnboardingWrapper from "@/components/onboarding/OnboardingWrapper";

export const metadata: Metadata = {
  title: "Conjectural Assist",
  description: "AI-powered requirements management",
};

const themeScript = `
  (function() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <CopilotKit runtimeUrl="/api/copilotkit" 
                    agent="conjec-req-agent" 
                    showDevConsole={false}
                    properties={{
                      user_id_test: "123",
                    }}
                    >
          <AuthHashErrorHandler />
          <ThemeProvider>
            <AuthProvider>
              <ProjectProvider>
                <RequirementsProvider>
                  <SettingsProvider>
                    <OnboardingWrapper>
                      {children}
                    </OnboardingWrapper>
                  </SettingsProvider>
                </RequirementsProvider>
              </ProjectProvider>
            </AuthProvider>
          </ThemeProvider>
        </CopilotKit>
      </body>
    </html>
  );
}
