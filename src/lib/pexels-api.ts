import axios from 'axios';

interface PexelsVideo {
  id: number;
  user: {
    name: string;
  };
  video_files: {
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
}

interface PexelsImage {
  id: number;
  photographer: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
  };
}

interface PexelsVideoSearchResponse {
  videos: PexelsVideo[];
  total_results: number;
  page: number;
  per_page: number;
}

interface PexelsImageSearchResponse {
  photos: PexelsImage[];
  total_results: number;
  page: number;
  per_page: number;
}

/**
 * Search for videos on Pexels and return the best video URL
 */
export async function searchPexelsVideo(query: string): Promise<string | null> {
  if (!process.env.PEXELS_API_KEY) {
    console.warn('PEXELS_API_KEY not found, using mock video URL');
    // Return a mock video URL for development
    return `https://example.com/mock-video-${Math.random().toString(36).substr(2, 6)}.mp4`;
  }

  try {
    const response = await axios.get<PexelsVideoSearchResponse>(
      'https://api.pexels.com/videos/search',
      {
        params: {
          query: query.trim(),
          per_page: 10,
          orientation: 'portrait', // Better for TikTok/Instagram format
          size: 'medium'
        },
        headers: {
          'Authorization': process.env.PEXELS_API_KEY
        },
        timeout: 10000
      }
    );

    const videos = response.data.videos;
    if (!videos || videos.length === 0) {
      console.log(`No videos found for query: "${query}"`);
      return null;
    }

    // Find the best quality video file (prefer HD, but accept lower quality)
    const video = videos[0];
    const videoFile = video.video_files.find(file => 
      file.quality === 'hd' && file.file_type === 'video/mp4'
    ) || video.video_files.find(file => 
      file.file_type === 'video/mp4'
    );

    if (!videoFile) {
      console.log(`No suitable video file found for query: "${query}"`);
      return null;
    }

    console.log(`✅ Found video for "${query}": ${videoFile.quality} (${videoFile.width}x${videoFile.height})`);
    return videoFile.link;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        console.error('Pexels API rate limit exceeded');
      } else if (error.response?.status === 401) {
        console.error('Invalid Pexels API key');
      } else {
        console.error(`Pexels API error (${error.response?.status}):`, error.message);
      }
    } else {
      console.error('Error searching Pexels videos:', error.message);
    }
    return null;
  }
}

/**
 * Search for images on Pexels and return the best image URL
 */
export async function searchPexelsImages(query: string): Promise<string | null> {
  if (!process.env.PEXELS_API_KEY) {
    console.warn('PEXELS_API_KEY not found, using mock image URL');
    // Return a mock image URL for development
    return `https://example.com/mock-image-${Math.random().toString(36).substr(2, 6)}.jpg`;
  }

  try {
    const response = await axios.get<PexelsImageSearchResponse>(
      'https://api.pexels.com/v1/search',
      {
        params: {
          query: query.trim(),
          per_page: 10,
          orientation: 'landscape'
        },
        headers: {
          'Authorization': process.env.PEXELS_API_KEY
        },
        timeout: 10000
      }
    );

    const photos = response.data.photos;
    if (!photos || photos.length === 0) {
      console.log(`No images found for query: "${query}"`);
      return null;
    }

    // Return the large size image URL
    const photo = photos[0];
    console.log(`✅ Found image for "${query}" by ${photo.photographer}`);
    return photo.src.large;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        console.error('Pexels API rate limit exceeded');
      } else if (error.response?.status === 401) {
        console.error('Invalid Pexels API key');
      } else {
        console.error(`Pexels API error (${error.response?.status}):`, error.message);
      }
    } else {
      console.error('Error searching Pexels images:', error.message);
    }
    return null;
  }
}

/**
 * Get random trending videos from Pexels
 */
export async function getTrendingVideos(count: number = 10): Promise<string[]> {
  if (!process.env.PEXELS_API_KEY) {
    console.warn('PEXELS_API_KEY not found, using mock video URLs');
    // Return mock video URLs for development
    return Array.from({ length: count }, (_, i) => 
      `https://example.com/mock-trending-${i + 1}.mp4`
    );
  }

  try {
    const response = await axios.get<PexelsVideoSearchResponse>(
      'https://api.pexels.com/videos/popular',
      {
        params: {
          per_page: count,
          orientation: 'portrait'
        },
        headers: {
          'Authorization': process.env.PEXELS_API_KEY
        },
        timeout: 10000
      }
    );

    const videos = response.data.videos;
    const videoUrls: string[] = [];

    for (const video of videos) {
      const videoFile = video.video_files.find(file => 
        file.quality === 'hd' && file.file_type === 'video/mp4'
      ) || video.video_files.find(file => 
        file.file_type === 'video/mp4'
      );

      if (videoFile) {
        videoUrls.push(videoFile.link);
      }
    }

    console.log(`✅ Retrieved ${videoUrls.length} trending videos`);
    return videoUrls;

  } catch (error) {
    console.error('Error fetching trending videos:', error.message);
    return [];
  }
}