"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface StoryPreview {
  id: string;
  title: string;
  subtitle: string;
  previewPage: {
    text: string;
    imageUrl: string | null;
  };
  totalPages: number;
}

export default function RandomStoryShowcase() {
  const [story, setStory] = useState<StoryPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRandomStory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Add the previous story ID to avoid getting the same story
      const previousId = story?.id || '';
      const cacheBuster = Date.now();
      const response = await fetch(`/api/get-random-story?previousId=${previousId}&_=${cacheBuster}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setStory(null);
          setLoading(false);
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch a random story');
      }
      
      const data = await response.json();
      
      // Check for empty story
      if (!data || !data.id) {
        setStory(null);
        return;
      }
      
      // If we got the same story, try once more
      if (story && story.id === data.id && story.previewPage.text === data.previewPage.text) {
        // Try again with a different cache buster
        setTimeout(fetchRandomStory, 300);
        return;
      }
      
      setStory(data);
    } catch (err: any) {
      console.error('Error fetching random story:', err);
      setError(err.message || 'An error occurred while fetching a story');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomStory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto bg-background rounded-lg shadow-md flex items-center justify-center p-6 border mb-6 md:mb-12">
        <div className="flex flex-col items-center justify-center py-12 w-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading a magical story...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="max-w-2xl mx-auto bg-background rounded-lg shadow-md p-6 border mb-6 md:mb-12">
        <div className="flex flex-col w-full h-full">
          <div className="flex flex-wrap justify-between items-center border-b pb-3 mb-4">
            <h3 className="text-xl font-medium">Chapter 1: The Magical Adventure</h3>
            <span className="text-sm text-muted-foreground">Page 1</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            <div className="bg-muted rounded-md flex items-center justify-center p-4 min-h-[150px]">
              <p className="text-muted-foreground text-sm">Story Illustration Placeholder</p>
            </div>
            <div className="flex items-center">
              <p className="text-sm leading-relaxed">
                Once upon a time, in a magical forest not too far away, there lived a brave child named [Child's Name]. 
                Every day, they would venture into the enchanted woods to meet their animal friends and discover new wonders...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-background rounded-lg shadow-md p-6 border mb-6 md:mb-12">
      <div className="flex flex-col w-full h-full">
        <div className="flex flex-wrap justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-xl font-medium">{story.title}</h3>
          <span className="text-sm text-muted-foreground">Page 1 of {story.totalPages}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          <div className="rounded-md flex items-center justify-center bg-muted overflow-hidden">
            {story.previewPage.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={story.previewPage.imageUrl} 
                alt={`Illustration for ${story.title}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <p className="text-muted-foreground text-sm">No illustration available</p>
            )}
          </div>
          <div className="flex flex-col justify-between">
            <p className="text-sm leading-relaxed">
              {story.previewPage.text.substring(0, 260)}
              {story.previewPage.text.length > 260 ? "..." : ""}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-between items-center">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs flex items-center gap-1 order-1 sm:order-none" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fetchRandomStory();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M8 16H3v5" />
                </svg>
                Show Another
              </Button>
              <Button asChild size="sm">
                <Link href={`/story/${story.id}`}>Read Full Story</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}