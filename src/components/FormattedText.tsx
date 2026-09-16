import React from 'react';
import { ExternalLink, Video } from 'lucide-react';

interface FormattedTextProps {
  text: string;
  isMe?: boolean;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({
  text,
  isMe = false,
  className = '',
}) => {
  if (!text) return null;

  // Comprehensive Regex to match URLs
  const URL_REGEX = /(https?:\/\/[^\s<]+|(?:www\.|meet\.google\.com\/|zoom\.us\/|drive\.google\.com\/|docs\.google\.com\/|forms\.gle\/|youtube\.com\/|youtu\.be\/|t\.me\/|wa\.me\/|[a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|io|app|me|live|link|co|bd|tv|dev)\b)(?:\/[^\s<]*)?)/gi;

  const parts = text.split(URL_REGEX);

  return (
    <div
      className={`whitespace-pre-wrap leading-relaxed break-words ${className}`}
      style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}
    >
      {parts.map((part, index) => {
        if (!part) return null;

        if (part.match(URL_REGEX)) {
          let cleanUrl = part;
          let leadingPunct = '';
          let trailingPunct = '';

          // Trim leading markdown/punctuation symbols (*, _, ~, `, (, [, <, ", ')
          const leadingMatch = cleanUrl.match(/^([*_~`(\[<"']+)/);
          if (leadingMatch) {
            leadingPunct = leadingMatch[0];
            cleanUrl = cleanUrl.slice(leadingPunct.length);
          }

          // Trim trailing markdown/punctuation symbols (*, _, ~, `, ), ], >, ", ', ., ,, ;, !, ?, :)
          const trailingMatch = cleanUrl.match(/([*_~`)\]>"'.,;!?:]+)$/);
          if (trailingMatch) {
            trailingPunct = trailingMatch[0];
            cleanUrl = cleanUrl.slice(0, -trailingPunct.length);
          }

          if (!cleanUrl) {
            return <span key={index}>{part}</span>;
          }

          let href = cleanUrl;
          if (!href.startsWith('http://') && !href.startsWith('https://')) {
            href = 'https://' + href;
          }

          const isMeeting =
            cleanUrl.toLowerCase().includes('meet.google.com') ||
            cleanUrl.toLowerCase().includes('zoom.us') ||
            cleanUrl.toLowerCase().includes('join=meet') ||
            cleanUrl.toLowerCase().includes('join=') ||
            cleanUrl.toLowerCase().includes('meet_');

          return (
            <React.Fragment key={index}>
              {leadingPunct}
              {isMeeting ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 my-0.5 text-xs font-black shadow-sm transition cursor-pointer transform hover:scale-[1.02] active:scale-95 border ${
                    isMe
                      ? 'bg-emerald-800/90 text-emerald-100 border-emerald-400/50 hover:bg-emerald-700/90'
                      : 'bg-teal-500/25 text-teal-200 border-teal-400/60 hover:bg-teal-500/40'
                  }`}
                  title="লিংকে ক্লিক করে ক্লাসে যুক্ত হন"
                >
                  <Video className="h-4 w-4 text-emerald-400 animate-pulse shrink-0" />
                  <span className="underline underline-offset-2 break-all">{cleanUrl}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" />
                </a>
              ) : (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className={`inline-flex items-center gap-1 font-bold underline underline-offset-2 break-all cursor-pointer transition ${
                    isMe
                      ? 'text-yellow-200 hover:text-white'
                      : 'text-sky-300 hover:text-sky-100 font-extrabold'
                  }`}
                  title="লিংকটি খুলতে ক্লিক করুন"
                >
                  <span>{cleanUrl}</span>
                  <ExternalLink className="h-3 w-3 inline shrink-0 opacity-90" />
                </a>
              )}
              {trailingPunct}
            </React.Fragment>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </div>
  );
};
