import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "./index.css";

import { AuthProvider } from "./contexts/AuthContext";
import { RoleProvider } from "./contexts/RoleContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { NotificationPreferencesProvider } from "./contexts/NotificationPreferencesContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { Toaster } from "@/components/ui/sonner";
import { GlobalChatNotifications } from "./components/GlobalChatNotifications";
import Index from "./pages/Index";
import { AuthPage } from "./pages/AuthPage";
import { UserManagement } from "./pages/UserManagement";
import { GroupManagement } from "./pages/GroupManagement";
import { GroupDetail } from "./pages/GroupDetail";
import { AcceptInvitation } from "./pages/AcceptInvitation";
import { OrganizationSettings } from "./pages/OrganizationSettings";
import { ComingSoon } from "./pages/ComingSoon";
import { Dashboard } from "./pages/Dashboard";
import { LearningCenter } from "./pages/LearningCenter";
import { UsageBilling } from "./pages/UsageBilling";
import { CRM } from "./pages/CRM";
import NotFound from "./pages/NotFound";

import { ResetPassword } from "./pages/ResetPassword";
import { PasswordRecoveryHandler } from "./components/forget-password/PasswordRecoveryHandler";
import { RecoveryHashGuard } from "./components/forget-password/RecoveryHashGuard";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <RoleProvider>
            <OrganizationProvider>
              <NotificationPreferencesProvider>
                <WebSocketProvider>
                  <RecoveryHashGuard>
                    <HashRouter>
                      <PasswordRecoveryHandler />
                      <GlobalChatNotifications />
                      <Routes>
                        <Route
                          path="/"
                          element={
                            <ProtectedRoute>
                              <Index />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/folder/:folderId"
                          element={
                            <ProtectedRoute>
                              <Index />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="/auth" element={<AuthPage />} />
                        <Route
                          path="/auth/reset-password"
                          element={<ResetPassword />}
                        />
                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute>
                              <Dashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/crm"
                          element={
                            <ProtectedRoute>
                              <CRM />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/learning-center"
                          element={
                            <ProtectedRoute>
                              <LearningCenter />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/usage-billing"
                          element={
                            <ProtectedRoute>
                              <UsageBilling />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/organization"
                          element={
                            <ProtectedRoute>
                              <OrganizationSettings />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/user-management"
                          element={
                            <AdminRoute>
                              <UserManagement />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/groups"
                          element={
                            <AdminRoute>
                              <GroupManagement />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/groups/:groupId"
                          element={
                            <AdminRoute>
                              <GroupDetail />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/accept-invitation"
                          element={<AcceptInvitation />}
                        />
                        <Route
                          path="/coming-soon"
                          element={
                            <ProtectedRoute>
                              <ComingSoon />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="*"
                          element={
                            <ProtectedRoute>
                              <NotFound />
                            </ProtectedRoute>
                          }
                        />
                      </Routes>
                      <Toaster />
                    </HashRouter>
                  </RecoveryHashGuard>
                </WebSocketProvider>
              </NotificationPreferencesProvider>
            </OrganizationProvider>
          </RoleProvider>
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools
        initialIsOpen={false}
        position="bottom"
        buttonPosition="bottom-right"
      />
    </QueryClientProvider>
  </StrictMode>
);
