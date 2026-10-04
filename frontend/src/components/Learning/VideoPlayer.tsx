import React from 'react';

interface VideoPlayerProps {
  url: string;
  title?: string;
  /** Fired when a native video finishes playing (not available for embedded YouTube). */
  onComplete?: () => void;
  className?: string;
}

const YOUTUBE_ID = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/;

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  title = 'Lesson video',
  onComplete,
  className = '',
}) => {
  const youtubeId = YOUTUBE_ID.exec(url)?.[1];

  return (
    <div
      className={`relative w-full aspect-video rounded-lg overflow-hidden bg-black ${className}`}
    >
      {youtubeId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          title={title}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video
          src={url}
          title={title}
          controls
          onEnded={onComplete}
          className="absolute inset-0 w-full h-full"
        >
          <track kind="captions" />
        </video>
      )}
    </div>
  );
};

export default VideoPlayer;
