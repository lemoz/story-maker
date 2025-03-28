import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ComingSoonFeature } from "@/components/coming-soon-feature";
import RandomStoryShowcase from "@/components/random-story-showcase";
import { 
  FileText, 
  Wand2, 
  Share, 
  Sparkles, 
  ImageIcon, 
  Pencil, 
  Baby, 
  FileDown, 
  Users 
} from "lucide-react";

export default function HomePage() {
  return (
    <main>
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Create Magical AI Storybooks Starring Your Child!
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Turn everyday moments or imaginative ideas into beautifully illustrated stories in minutes.
          </p>
          <Button asChild size="lg">
            <Link href="/create">Create Your Story Now</Link>
          </Button>
        </div>
      </section>

      <section className="py-16 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center text-center pt-6">
                <FileText size={48} className="mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">1. Add Details & Photos</h3>
                <p className="text-muted-foreground">
                  Tell us who's in the story and upload photos or describe your idea.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center text-center pt-6">
                <Wand2 size={48} className="mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">2. AI Crafts Your Tale</h3>
                <p className="text-muted-foreground">
                  Our AI writes a unique story and creates illustrations based on your input.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center text-center pt-6">
                <Share size={48} className="mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">3. Read, Edit & Share</h3>
                <p className="text-muted-foreground">
                  Review your story, easily edit text or images, then download or share!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            See the Magic
          </h2>
          <RandomStoryShowcase />
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose EpicStory?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col pt-6">
                <Sparkles size={32} className="h-8 w-8 mb-3 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Unique AI Stories</h3>
                <p className="text-muted-foreground">
                  Generate original tales based on your photos, themes, or ideas.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col pt-6">
                <ImageIcon size={32} className="h-8 w-8 mb-3 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Custom Illustrations</h3>
                <p className="text-muted-foreground">
                  AI creates unique pictures for your story, guided by your input.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col pt-6">
                <Pencil size={32} className="h-8 w-8 mb-3 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Editable Content</h3>
                <p className="text-muted-foreground">
                  Easily modify story text or regenerate images until it's perfect.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col pt-6">
                <Baby size={32} className="h-8 w-8 mb-3 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Age-Appropriate</h3>
                <p className="text-muted-foreground">
                  Stories tailored to your child's selected age range for suitable reading.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col pt-6">
                <FileDown size={32} className="h-8 w-8 mb-3 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Download as PDF</h3>
                <p className="text-muted-foreground mb-4">
                  Get a beautiful, print-ready PDF of your storybook.
                </p>
                <div className="mt-auto">
                  <ComingSoonFeature
                    title="PDF Export Coming Soon!"
                    description="We're working on letting you download beautiful, print-ready PDFs of your stories."
                    featureName="PDF Export"
                    buttonText="Get Notified"
                    variant="outline"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col pt-6">
                <Users size={32} className="h-8 w-8 mb-3 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Share with Loved Ones</h3>
                <p className="text-muted-foreground">
                  Easily share a web link to the story with family and friends.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50 dark:bg-slate-900 border-t">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-semibold mb-6">
            Ready to create some magic?
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/create">Get Started Now</Link>
            </Button>
            <ComingSoonFeature
              title="AI Animation Coming Soon!"
              description="We're developing a feature to bring your stories to life with animated illustrations."
              featureName="AI Animation"
              buttonText="Learn About AI Animation"
              variant="secondary"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
