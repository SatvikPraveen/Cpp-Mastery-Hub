import { motion } from 'framer-motion';
import {
  MessageCircle,
  Mic,
  MicOff,
  Settings,
  Share,
  UserPlus,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import ChatPanel from '../../components/Code/ChatPanel';
import CodeEditor from '../../components/Code/CodeEditor';
import type { CodeEditorHandle, CursorPosition } from '../../components/Code/CodeEditor';
import UserCursor from '../../components/Code/UserCursor';
import Layout from '../../components/Layout/Layout';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { apiService, collaborationService } from '../../services/api';
import type { ChatMessage, CollaborationSession, CollaborationUser } from '../../types';
import { getErrorMessage } from '../../utils/errors';

const CodeCollaborate: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const sessionId = typeof router.query.sessionId === 'string' ? router.query.sessionId : undefined;
  
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [code, setCode] = useState('');
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [cursors, setCursors] = useState<
    Map<string, { position: CursorPosition; user: CollaborationUser }>
  >(new Map());
  const [notice, setNotice] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<{ user: string; timestamp: number } | null>(null);

  const editorRef = useRef<CodeEditorHandle>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Socket connection for real-time collaboration
  const socket = useSocket(sessionId, {
    onConnect: () => {
      console.log('Connected to collaboration session');
    },
    onUserJoined: (newUser: CollaborationUser) => {
      setUsers(prev => [...prev, newUser]);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        user: { id: 'system', username: 'System', avatar: '' },
        content: `${newUser.username} joined the session`,
        timestamp: Date.now(),
        type: 'system',
      }]);
    },
    onUserLeft: (userId: string) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(userId);
        return newCursors;
      });
    },
    onCodeChange: (newCode: string, userId: string) => {
      if (userId !== user?.id) {
        setCode(newCode);
        setLastChange({ user: userId, timestamp: Date.now() });
      }
    },
    onCursorMove: (userId: string, position: CursorPosition) => {
      const cursorUser = users.find(u => u.id === userId);
      if (cursorUser) {
        setCursors(prev => new Map(prev.set(userId, { position, user: cursorUser })));
      }
    },
    onMessage: (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    }
  });

  const loadSession = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        const response = await apiService.get<CollaborationSession>(
          `/collaboration/sessions/${id}`
        );
        setSession(response.data);
        setCode(response.data.code);
        setUsers(response.data.users);
        setIsHost(response.data.hostId === user?.id);
      } catch (error) {
        console.error('Error loading session:', getErrorMessage(error));
        await router.push('/code');
      } finally {
        setLoading(false);
      }
    },
    [router, user?.id]
  );

  const createNewSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.post<CollaborationSession>('/collaboration/sessions', {
        title: 'New Collaboration Session',
        code: `#include <iostream>
using namespace std;

int main() {
    cout << "Welcome to collaborative coding!" << endl;
    return 0;
}`,
        language: 'cpp',
        isPublic: false,
      });

      setSession(response.data);
      setIsHost(true);
      await router.replace(`/code/collaborate?sessionId=${response.data.id}`);
    } catch (error) {
      console.error('Error creating session:', getErrorMessage(error));
      await router.push('/code');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!router.isReady) return;
    if (!isAuthenticated) {
      void router.push('/auth/login');
      return;
    }

    if (sessionId) {
      void loadSession(sessionId);
    } else {
      void createNewSession();
    }
  }, [router, router.isReady, sessionId, isAuthenticated, loadSession, createNewSession]);

  // Announce ourselves once the socket for this session exists.
  useEffect(() => {
    if (!socket || !user) return;
    socket.emit('join-session', {
      user: { id: user.id, username: user.username, avatar: user.avatar ?? '' },
    });
  }, [socket, user]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    socket?.emit('code-change', {
      code: newCode,
      userId: user?.id,
    });
  };

  const handleCursorMove = (position: CursorPosition) => {
    socket?.emit('cursor-move', {
      userId: user?.id,
      position,
    });
  };

  const handleSendMessage = (content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      user: {
        id: user?.id ?? '',
        username: user?.username ?? 'Anonymous',
        avatar: user?.avatar ?? '',
      },
      content,
      timestamp: Date.now(),
      type: 'user',
    };

    setMessages((prev) => [...prev, message]);
    socket?.emit('send-message', { message: { ...message } });
  };

  const handleShareSession = async () => {
    if (!session) return;
    const shareUrl = `${window.location.origin}/code/collaborate?sessionId=${session.id}`;
    
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'Join my coding session',
          text: 'Let\'s code together!',
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setNotice('Session link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing session:', error);
    }
  };

  const handleInviteUser = async () => {
    // eslint-disable-next-line no-alert -- minimal invite flow without a dedicated modal
    const email = window.prompt('Enter email address to invite:');
    if (!email || !session) return;

    try {
      await collaborationService.inviteUser(session.id, email);
      setNotice('Invitation sent!');
    } catch (error) {
      setNotice(`Failed to send invitation: ${getErrorMessage(error)}`);
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: isAudioEnabled
      });
      
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsVideoEnabled(true);
      socket?.emit('video-start', { userId: user?.id });
    } catch (error) {
      setNotice(`Failed to start video: ${getErrorMessage(error)}`);
    }
  };

  const stopVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsVideoEnabled(false);
    socket?.emit('video-stop', { userId: user?.id });
  };

  const toggleAudio = async () => {
    if (!isAudioEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setIsAudioEnabled(true);
        socket?.emit('audio-start', { userId: user?.id });
      } catch (error) {
        setNotice(`Failed to start audio: ${getErrorMessage(error)}`);
      }
    } else {
      localStreamRef.current?.getAudioTracks().forEach((track) => track.stop());
      setIsAudioEnabled(false);
      socket?.emit('audio-stop', { userId: user?.id });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Session Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The collaboration session you are looking for does not exist.
            </p>
            <button
              onClick={() => void router.push('/code')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Code Playground
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {session.title}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {users.length} participant{users.length !== 1 ? 's' : ''} online
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Video Controls */}
                <button
                  onClick={() => (isVideoEnabled ? stopVideo() : void startVideo())}
                  className={`p-2 rounded-lg transition-colors ${
                    isVideoEnabled 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                  title={isVideoEnabled ? 'Stop video' : 'Start video'}
                >
                  {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </button>
                
                <button
                  onClick={() => void toggleAudio()}
                  className={`p-2 rounded-lg transition-colors ${
                    isAudioEnabled 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                  title={isAudioEnabled ? 'Mute' : 'Unmute'}
                >
                  {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>
                
                {/* Chat Toggle */}
                <button
                  onClick={() => setShowChat(!showChat)}
                  className={`p-2 rounded-lg transition-colors ${
                    showChat 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                  title="Toggle chat"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
                
                {/* Invite User */}
                {isHost && (
                  <button
                    onClick={() => void handleInviteUser()}
                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Invite user"
                  >
                    <UserPlus className="h-5 w-5" />
                  </button>
                )}
                
                {/* Share Session */}
                <button
                  onClick={() => void handleShareSession()}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Share className="h-5 w-5 mr-2" />
                  Share
                </button>
                
                {/* Settings */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {notice && (
            <div
              role="status"
              className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
            >
              <span>{notice}</span>
              <button onClick={() => setNotice(null)} className="ml-4 text-xs underline">
                Dismiss
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Main Editor Area */}
            <div className={`${showChat ? 'xl:col-span-3' : 'xl:col-span-4'}`}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                {/* Editor Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Collaborative Editor
                    </h3>
                    
                    {lastChange && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span>Last edited by </span>
                        <span className="font-medium">
                          {users.find((u) => u.id === lastChange.user)?.username ?? 'Unknown'}
                        </span>
                        <span> {Math.round((Date.now() - lastChange.timestamp) / 1000)}s ago</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Active Users */}
                  <div className="flex items-center space-x-2">
                    {users.slice(0, 5).map((user, index) => (
                      <div
                        key={user.id}
                        className="relative"
                        style={{ zIndex: 10 - index }}
                      >
                        {user.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote avatar URLs
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700"
                            title={user.username}
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 flex items-center justify-center text-xs font-medium text-white"
                            style={{ backgroundColor: user.color ?? '#3B82F6' }}
                            title={user.username}
                          >
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white dark:border-gray-700" />
                      </div>
                    ))}
                    
                    {users.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                        +{users.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                {/* Code Editor with Cursors */}
                <div className="relative">
                  <CodeEditor
                    ref={editorRef}
                    value={code}
                    onChange={handleCodeChange}
                    onCursorMove={handleCursorMove}
                    language="cpp"
                    height="600px"
                    collaborative
                  />
                  
                  {/* User Cursors */}
                  {Array.from(cursors.entries()).map(([userId, cursor]) => (
                    <UserCursor
                      key={userId}
                      user={cursor.user}
                      position={cursor.position}
                      editorRef={editorRef}
                    />
                  ))}
                </div>
              </div>

              {/* Video Participants */}
              {isVideoEnabled && (
                <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                    Video Participants
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Local Video */}
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      >
                        <track kind="captions" />
                      </video>
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                        You
                      </div>
                    </div>
                    
                    {/* Remote Videos would be rendered here */}
                    {users
                      .filter(u => u.id !== user?.id && u.hasVideo)
                      .map(participant => (
                        <div key={participant.id} className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-gray-400">Video Loading...</div>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                            {participant.username}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chat Panel */}
            {showChat && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="xl:col-span-1"
              >
                <ChatPanel
                  messages={messages}
                  users={users}
                  currentUser={user}
                  onSendMessage={handleSendMessage}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Session Settings
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  aria-label="Close settings"
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label
                    htmlFor="session-title"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Session Title
                  </label>
                  <input
                    id="session-title"
                    type="text"
                    value={session.title}
                    onChange={(e) => setSession({ ...session, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={!isHost}
                  />
                </div>
                
                <div>
                  <label htmlFor="session-public" className="flex items-center">
                    <input
                      id="session-public"
                      type="checkbox"
                      checked={session.isPublic}
                      onChange={(e) => setSession({ ...session, isPublic: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      disabled={!isHost}
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Make session public
                    </span>
                  </label>
                </div>
                
                {isHost && (
                  <div>
                    <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                      End Session
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CodeCollaborate;