import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { HelpCircle } from "lucide-react";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

import { Providers } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexusPipe - GEO Audit Tool",
  description: "Measure your brand's AI Mindshare with NexusPipe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <Providers>
            {/* Header */}
            <header className="border-b">
              <div className="container mx-auto flex h-14 items-center justify-between px-4">
                <Link href="/" className="font-semibold text-lg">
                  NexusPipe
                </Link>
                <nav className="flex items-center gap-4">
                  <Link href="/help">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <HelpCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Help</span>
                    </Button>
                  </Link>
                  <SignedIn>
                    <Link
                      href="/dashboard"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Dashboard
                    </Link>
                    <UserButton afterSignOutUrl="/" />
                  </SignedIn>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <Button variant="outline" size="sm">
                        Sign In
                      </Button>
                    </SignInButton>
                  </SignedOut>
                </nav>
              </div>
            </header>
            {children}
            <Toaster />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
