import { Link, Navigate, Route, Routes } from "react-router";

import { DesignSystemPage } from "@/features/design-system/pages/design-system-page";
import { AppLayout } from "@/layouts/app-layout";
import { AuthLayout } from "@/layouts/auth-layout";
import { RoutePlaceholderPage } from "@/pages/route-placeholder-page";

function NotFoundPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-16 text-foreground">
      <h1 className="text-3xl font-semibold tracking-tight">
        Page not found
      </h1>

      <p className="text-muted-foreground">
        The page you requested does not exist.
      </p>

      <Link
        to="/design-system"
        className="inline-flex rounded-md text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        Return to the design system
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Temporary entry point until authentication is implemented. */}
      <Route
        path="/"
        element={<Navigate to="/design-system" replace />}
      />

      <Route
        path="/design-system"
        element={<DesignSystemPage />}
      />

      {/* Public authentication routes share one layout. */}
      <Route element={<AuthLayout />}>
        <Route
          path="login"
          element={
            <RoutePlaceholderPage
              title="Sign in"
              description="Sign in to access your shared expenses and balances."
            />
          }
        />

        <Route
          path="register"
          element={
            <RoutePlaceholderPage
              title="Create your account"
              description="Create a Splitly account to start managing shared expenses."
            />
          }
        />

        <Route
          path="verify-email"
          element={
            <RoutePlaceholderPage
              title="Verify your email"
              description="Request and verify your email confirmation code."
            />
          }
        />

        <Route
          path="forgot-password"
          element={
            <RoutePlaceholderPage
              title="Reset your password"
              description="Request password-reset instructions for your account."
            />
          }
        />

        <Route
          path="reset-password"
          element={
            <RoutePlaceholderPage
              title="Choose a new password"
              description="Complete your password reset using your verification code."
            />
          }
        />
      </Route>

      {/* Dashboard shell; authentication protection comes later. */}
      <Route element={<AppLayout />}>
        <Route
          path="dashboard"
          element={
            <RoutePlaceholderPage
              title="Dashboard"
              description="Your groups, recent expenses, and balances will appear here."
            />
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}