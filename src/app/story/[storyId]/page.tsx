'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download, Share2, Loader2, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Story data interfaces
interface StoryPage {
  text: string;
  imageUrl: string | null;
}

interface StoryData {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  pages: StoryPage[];
}

export default function StoryViewerPage() {
  const params = useParams();
  const storyId = params.storyId as string;
  
  // State hooks
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

  // Fetch story data
  useEffect(() => {
    async function fetchStory() {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/get-story?storyId=${storyId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch story: ${response.status}`);
        }
        
        const data: StoryData = await response.json();
        setStoryData(data);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred while fetching the story.');
        setStoryData(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchStory();
  }, [storyId]);

  // Navigate to the previous page
  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  // Navigate to the next page
  const goToNextPage = () => {
    if (storyData && currentPageIndex < storyData.pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  // Share story handler
  const handleShare = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch (err) {
      console.error('Failed to copy URL to clipboard:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-start mb-4">
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="text-center mb-6">
          <Skeleton className="h-10 w-3/4 mx-auto mb-2" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
        </div>
        <div className="flex justify-center gap-4 mb-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2">
                <Skeleton className="h-60 w-full rounded-lg" />
              </div>
              <div className="md:w-1/2">
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive" className="my-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Story</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="text-center mt-8">
          <Link href="/create">
            <Button>Create a New Story</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success state - Main story view
  if (storyData) {
    const currentPage = storyData.pages[currentPageIndex];
    
    return (
      <div className="container mx-auto py-8 px-4">
        {/* Back link */}
        <Link href="/create" className="text-sm text-muted-foreground hover:underline mb-4 inline-block">
          <ChevronLeft className="inline h-4 w-4 mr-1" /> Back to Create
        </Link>
        
        {/* Story Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">{storyData.title}</h1>
          <p className="text-muted-foreground">{storyData.subtitle}</p>
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-center gap-4 mb-6">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleShare}>
            {shareStatus === 'copied' ? (
              <>
                <Check className="h-4 w-4" /> Copied!
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" /> Share Story
              </>
            )}
          </Button>
        </div>
        
        {/* Pagination controls */}
        <div className="flex justify-between items-center mb-4">
          <Button 
            variant="outline" 
            onClick={goToPreviousPage} 
            disabled={currentPageIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Previous
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Page {currentPageIndex + 1} of {storyData.pages.length}
          </span>
          
          <Button 
            variant="outline" 
            onClick={goToNextPage} 
            disabled={currentPageIndex >= storyData.pages.length - 1}
          >
            Next <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        
        {/* Story content */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image area */}
              <div className="md:w-1/2">
                {currentPage.imageUrl ? (
                  <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={currentPage.imageUrl} 
                      alt={`Illustration for page ${currentPageIndex + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-muted rounded-lg text-muted-foreground">
                    Illustration Placeholder
                  </div>
                )}
              </div>
              
              {/* Text area */}
              <div className="md:w-1/2">
                <p className="text-lg leading-relaxed">{currentPage.text}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback (should not occur, as we handle all states above)
  return null;
}