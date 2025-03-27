import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    // Check if BLOB_READ_WRITE_TOKEN is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('Missing BLOB_READ_WRITE_TOKEN environment variable.');
      return NextResponse.json(
        { error: 'Server configuration error: Missing blob storage token' },
        { status: 500 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    
    // Extract the file
    const file = formData.get('file');
    
    // Validate the file
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided or invalid file' },
        { status: 400 }
      );
    }
    
    // Validate file type (must be an image)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }
    
    // Optional: Check file size (e.g., limit to 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the 5MB limit' },
        { status: 400 }
      );
    }
    
    // Generate a unique filename
    // Extract the file extension from the original filename
    const originalName = file.name;
    const fileExtension = originalName.substring(originalName.lastIndexOf('.')) || '';
    const filename = `characters/${randomUUID()}${fileExtension}`;
    
    // Get the file content as buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public', // Make the file publicly accessible
      contentType: file.type, // Use the file's content type
    });
    
    // Return success with the URL
    return NextResponse.json({ url: blob.url });
    
  } catch (error) {
    console.error('Error uploading character photo:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}