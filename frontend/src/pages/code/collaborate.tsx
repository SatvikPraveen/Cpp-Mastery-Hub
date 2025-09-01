// File: frontend/src/pages/code/collaborate.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Users, Share, Copy, Settings, Video, Mic, MicOff, VideoOff, MessageCircle, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import CodeEditor from '../../components/Code/CodeEditor';
import ChatPanel from '../../components/Code/ChatPanel';
import UserCursor from '../../components/Code/UserCursor';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { collaborationService } from '../../services/api';
import { CollaborationSession, CollaborationUser, ChatMessage } from '../../types';

interface CodeCollaborateProps {}

const CodeCollaborate: React.FC<CodeCollaborateProps> = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { sessionId } = router.query;
  
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
  const [cursors, setCursors] = useState<Map<string, { position: number; user: CollaborationUser }>>(new Map());
  const [lastChange, setLastChange] = useState<{ user: string; timestamp: number } | null>(null);

  const editorRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Socket connection for real-time collaboration
  const socket = useSocket(sessionId as string, {
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
        type: 'system'
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
    onCursorMove: (userId: string, position: number) => {
      const cursorUser = users.find(u => u.id === userId);
      if (cursorUser) {
        setCursors(prev => new Map(prev.set(userId, { position, user: cursorUser })));
      }
    },
    onMessage: (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    }
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (sessionId) {
      loadSession();
    } else {
      createNewSession();
    }
  }, [sessionId, isAuthenticated]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const response = await collaborationService.getSession(sessionId as string);
      setSession(response.data);
      setCode(response.data.code);
      setUsers(response.data.users);
      setIsHost(response.data.hostId === user?.id);
      
      // Join the session
      socket?.emit('join-session', {
        sessionId,
        user: {
          id: user?.id,
          username: user?.username,
          avatar: user?.avatar
        }
      });
    } catch (error) {
      console.error('Error loading session:', error);
      router.push('/code');
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      setLoading(true);
      const response = await collaborationService.createSession({
        title: 'New Collaboration Session',
        code: `#include <iostream>
using namespace std;

int main() {
    cout << "Welcome to collaborative coding!" << endl;
    return 0;
}`,
        language: 'cpp',
        isPublic: false
      });
      
      setSession(response.data);
      setIsHost(true);
      router.replace(`/code/collaborate?sessionId=${response.data.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      router.push('/code');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    socket?.emit('code-change', {
      sessionId,
      code: newCode,
      userId: user?.id
    });
  };

  const handleCursorMove = (position: number) => {
    socket?.emit('cursor-move', {
      sessionId,
      userId: user?.id,
      position
    });
  };

  const handleSendMessage = (content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      user: {
        id: user?.id || '',
        username: user?.username || 'Anonymous',
        avatar: user?.avatar || ''
      },
      content,
      timestamp: Date.now(),
      type: 'user'
    };

    socket?.emit('send-message', {
      sessionId,
      message
    });
  };

  const handleShareSession = async () => {
    const shareUrl = `${window.location.origin}/code/collaborate?sessionId=${session?.id}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join my coding session',
          text: 'Let\'s code together!',
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Session link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing session:', error);
    }
  };

  const handleInviteUser = async () => {
    const email = prompt('Enter email address to invite:');
    if (!email) return;

    try {
      await collaborationService.inviteUser(session!.id, email);
      alert('Invitation sent!');
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Failed to send invitation');
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
      socket?.emit('video-stream', { sessionId, stream });
    } catch (error) {
      console.error('Error starting video:', error);
      alert('Failed to start video');
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
    socket?.emit('video-stop', { sessionId });
  };

  const toggleAudio = async () => {
    if (!isAudioEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setIsAudioEnabled(true);
        socket?.emit('audio-stream', { sessionId, stream });
      } catch (error) {
        console.error('Error starting audio:', error);
        alert('Failed to start audio');
      }
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => track.stop());
      }
      setIsAudioEnabled(false);
      socket?.emit('audio-stop', { sessionId });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              onClick={() => router.push('/code')}
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
                  onClick={isVideoEnabled ? stopVideo : startVideo}
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
                  onClick={toggleAudio}
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
                    onClick={handleInviteUser}
                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Invite user"
                  >
                    <UserPlus className="h-5 w-5" />
                  </button>
                )}
                
                {/* Share Session */}
                <button
                  onClick={handleShareSession}
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
                          {users.find(u => u.id === lastChange.user)?.username || 'Unknown'}
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
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700"
                            title={user.username}
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 flex items-center justify-center text-xs font-medium text-white"
                            style={{ backgroundColor: user.color || '#3B82F6' }}
                            title={user.username}
                          >
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white dark:border-gray-700"></div>
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
                    collaborative={true}
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
                        className="w-full h-full object-cover"
                      />
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
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Session Title
                  </label>
                  <input
                    type="text"
                    value={session.title}
                    onChange={(e) => setSession({ ...session, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={!isHost}
                  />
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
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