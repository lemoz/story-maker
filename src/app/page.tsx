"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ComingSoonFeature } from "@/components/coming-soon-feature";
import RandomStoryShowcase from "@/components/random-story-showcase";
import { LoginPopup } from "@/components/login-popup";
import {
  FileText,
  Wand2,
  Share,
  Sparkles,
  ImageIcon,
  Pencil,
  Baby,
  FileDown,
  Users,
} from "lucide-react";

export default function HomePage() {
  const { data: session } = useSession();
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  return (
    <main>
      <section
        className="relative py-32 md:py-40 bg-cover bg-center"
        style={{ backgroundImage: "url(/hero-background.png)" }}
      >
        {/* Semi-transparent overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20 md:to-transparent"></div>

        {/* Sign In Button */}
        <div className="absolute top-4 right-4 z-20">
          {session ? (
            <div className="flex items-center gap-4">
              <span className="text-white text-shadow-sm">
                {session.user?.email}
              </span>
              <Button
                onClick={() => (window.location.href = "/create")}
                className="font-medium px-6 py-2 text-base rounded-full bg-purple-600 hover:bg-purple-700 border-0 shadow-lg hover:shadow-xl transition-all"
              >
                Create Story
              </Button>
              <Button
                onClick={() => (window.location.href = "/list-stories")}
                className="font-medium px-6 py-2 text-base rounded-full bg-purple-600 hover:bg-purple-700 border-0 shadow-lg hover:shadow-xl transition-all"
              >
                My Stories
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowLoginPopup(true)}
              className="font-medium px-6 py-2 text-base rounded-full bg-purple-600 hover:bg-purple-700 border-0 shadow-lg hover:shadow-xl transition-all"
            >
              Sign In
            </Button>
          )}
        </div>

        {/* Content Container */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl relative bg-black/20 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none p-4 md:p-0 rounded-xl md:rounded-none">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-white text-shadow-md leading-tight">
              Your Child,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 drop-shadow-md">
                The Hero
              </span>
              !
            </h1>
            <p className="text-xl text-neutral-200 mb-8 text-shadow-sm leading-relaxed">
              Magical{" "}
              <span className="font-semibold text-yellow-300">
                AI-illustrated adventures
              </span>{" "}
              starring your child. Create custom storybooks in just 60 seconds!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              <Button
                asChild
                size="lg"
                className="font-medium px-8 py-6 text-base rounded-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 border-0 shadow-lg hover:shadow-xl transition-all"
              >
                <Link href="/create">Create Their Adventure</Link>
              </Button>
              <p className="text-neutral-300 text-sm mt-2 sm:mt-0">
                ✨ No sign-up required!
              </p>
            </div>
          </div>
        </div>
      </section>

      <LoginPopup
        isOpen={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
      />

      <section className="py-10 md:py-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 md:mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create personalized stories in just three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <Card className="relative border-0 shadow-md group-hover:shadow-lg transition-all">
                <CardContent className="flex flex-col items-center text-center p-6 md:p-8">
                  <div className="bg-primary/10 rounded-full p-3 md:p-4 mb-4 md:mb-6">
                    <FileText
                      size={36}
                      className="text-primary md:h-12 md:w-12"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    1. Add Details & Photos
                  </h3>
                  <p className="text-muted-foreground">
                    Tell us who's in the story and upload photos or describe
                    your idea. Customize age range and style.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <Card className="relative border-0 shadow-md group-hover:shadow-lg transition-all">
                <CardContent className="flex flex-col items-center text-center p-6 md:p-8">
                  <div className="bg-primary/10 rounded-full p-3 md:p-4 mb-4 md:mb-6">
                    <Wand2 size={36} className="text-primary md:h-12 md:w-12" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    2. AI Crafts Your Tale
                  </h3>
                  <p className="text-muted-foreground">
                    Our AI writes a unique story and creates beautiful
                    illustrations based on your input.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <Card className="relative border-0 shadow-md group-hover:shadow-lg transition-all">
                <CardContent className="flex flex-col items-center text-center p-6 md:p-8">
                  <div className="bg-primary/10 rounded-full p-3 md:p-4 mb-4 md:mb-6">
                    <Share size={36} className="text-primary md:h-12 md:w-12" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    3. Read, Edit & Share
                  </h3>
                  <p className="text-muted-foreground">
                    Review your story, easily edit text or regenerate images,
                    then download or share with loved ones!
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 md:mb-4">
              See the{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                Magic
              </span>{" "}
              in Action
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse through amazing stories created by our AI. Each one is
              unique and can be customized to feature your child.
            </p>
          </div>
          <div className="max-w-4xl mx-auto bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 md:p-8 rounded-2xl shadow-xl">
            <RandomStoryShowcase />
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 md:mb-4">
              Why Choose EpicStory?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform combines cutting-edge AI with a focus on creativity
              and personalization
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 md:gap-x-8 md:gap-y-12">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-200 dark:border-slate-800">
              <div className="bg-primary/10 h-12 w-12 flex items-center justify-center rounded-lg mb-4">
                <Sparkles size={28} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Unique AI Stories</h3>
              <p className="text-muted-foreground">
                Our AI crafts original, imaginative tales based on your photos,
                themes, or ideas — creating stories as unique as your child.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-200 dark:border-slate-800">
              <div className="bg-primary/10 h-12 w-12 flex items-center justify-center rounded-lg mb-4">
                <ImageIcon size={28} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Custom Illustrations
              </h3>
              <p className="text-muted-foreground">
                Beautiful, AI-generated illustrations bring your stories to
                life, perfectly matched to your child's appearance and the
                story's theme.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-200 dark:border-slate-800">
              <div className="bg-primary/10 h-12 w-12 flex items-center justify-center rounded-lg mb-4">
                <Pencil size={28} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Editable Content</h3>
              <p className="text-muted-foreground">
                Complete creative control allows you to edit text and regenerate
                images until every detail of your story is exactly how you want
                it.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-200 dark:border-slate-800">
              <div className="bg-primary/10 h-12 w-12 flex items-center justify-center rounded-lg mb-4">
                <Baby size={28} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Age-Appropriate</h3>
              <p className="text-muted-foreground">
                All stories are tailored to your child's age range, ensuring
                themes, vocabulary, and content are perfectly suited to their
                developmental stage.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-200 dark:border-slate-800">
              <div className="bg-primary/10 h-12 w-12 flex items-center justify-center rounded-lg mb-4">
                <FileDown size={28} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Download as PDF</h3>
              <p className="text-muted-foreground mb-4">
                Get a beautiful, print-ready PDF of your storybook to keep
                forever or share with family and friends.
              </p>
              <div className="mt-2">
                <ComingSoonFeature
                  title="PDF Export Coming Soon!"
                  description="We're working on letting you download beautiful, print-ready PDFs of your stories."
                  featureName="PDF Export"
                  buttonText="Get Notified"
                  variant="outline"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-200 dark:border-slate-800">
              <div className="bg-primary/10 h-12 w-12 flex items-center justify-center rounded-lg mb-4">
                <Users size={28} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Share with Loved Ones
              </h3>
              <p className="text-muted-foreground">
                Instantly share your child's stories with family and friends
                anywhere in the world with a simple web link.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-100/20 to-primary/5 dark:from-primary/10 dark:via-purple-900/10 dark:to-primary/10"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 md:p-12 border border-slate-200 dark:border-slate-800">
            <div className="inline-block mb-4 md:mb-6">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm">
                <Sparkles className="h-4 w-4 mr-2" /> Start creating magical
                moments
              </div>
            </div>
            <h3 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
              Ready to bring your child's imagination to life?
            </h3>
            <p className="text-lg text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto">
              Create personalized storybooks that will delight your little ones
              and become treasured keepsakes for years to come.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="font-medium px-8">
                <Link href="/create">Create Your First Story</Link>
              </Button>
              <ComingSoonFeature
                title="AI Animation Coming Soon!"
                description="We're developing a feature to bring your stories to life with animated illustrations and interactive elements."
                featureName="AI Animation"
                buttonText="Learn About AI Animation"
                variant="secondary"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
