"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, BookOpen, Plus } from "lucide-react";
import useSWR from "swr";
import { Suspense } from "react";

interface Story {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  coverImage: string | null;
}

// Fetcher function for SWR
const fetcher = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch stories");
    return res.json();
  } catch (error) {
    console.error("Error fetching stories:", error);
    throw error;
  }
};

function ListStoriesContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const {
    data: stories,
    error,
    isLoading,
  } = useSWR<Story[]>("/api/list-stories", fetcher, {
    revalidateOnFocus: false, // Don't revalidate on window focus
    revalidateOnReconnect: true, // Revalidate when browser regains connection
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load stories. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Stories</h1>
        <Button
          onClick={() => router.push("/create")}
          className="gap-2 bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" /> Create New Story
        </Button>
      </div>

      {!stories?.length ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">No Stories Yet</h2>
            <p className="text-muted-foreground mb-4">
              Create your first magical story and it will appear here!
            </p>
            <Button onClick={() => router.push("/create")}>
              Create Your First Story
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <Card
              key={story.id}
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/story/${story.id}`)}
            >
              <div className="aspect-[4/3] relative bg-muted">
                {story.coverImage ? (
                  <img
                    src={story.coverImage}
                    alt={story.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h2 className="text-xl font-semibold mb-2 line-clamp-1">
                  {story.title}
                </h2>
                <p className="text-muted-foreground text-sm line-clamp-2">
                  {story.subtitle}
                </p>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <p className="text-xs text-muted-foreground">
                  Created {new Date(story.createdAt).toLocaleDateString()}
                </p>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListStoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      }
    >
      <ListStoriesContent />
    </Suspense>
  );
}
