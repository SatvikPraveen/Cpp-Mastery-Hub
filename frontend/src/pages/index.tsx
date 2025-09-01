// File: frontend/src/pages/index.tsx
// Extension: .tsx

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Code,
  BookOpen,
  Users,
  Zap,
  Star,
  ChevronRight,
  Play,
  Award,
  Gauge,
  Eye,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  const features = [
    {
      icon: Code,
      title: 'Interactive Code Editor',
      description: 'Professional Monaco editor with C++ syntax highlighting, IntelliSense, and real-time compilation.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      icon: Eye,
      title: 'Memory Visualization',
      description: '3D visualization of stack, heap, and variable states to understand memory management.',
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      icon: Gauge,
      title: 'Static Analysis',
      description: 'Real-time code analysis with suggestions for performance, style, and best practices.',
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      icon: BookOpen,
      title: 'Progressive Learning',
      description: 'Structured curriculum from C++11 to C++23 with hands-on exercises and projects.',
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Connect with other learners, share code, and get help from C++ experts.',
      color: 'text-pink-500',
      bgColor: 'bg-pink-100 dark:bg-pink-900/20',
    },
    {
      icon: Award,
      title: 'Achievement System',
      description: 'Earn badges, track progress, and compete with others in coding challenges.',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    },
  ];

  const stats = [
    { label: 'Active Learners', value: '10K+' },
    { label: 'Code Snippets', value: '50K+' },
    { label: 'Learning Hours', value: '100K+' },
    { label: 'Success Rate', value: '95%' },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Software Engineer at Google',
      avatar: '/images/avatars/sarah.jpg',
      content: 'The memory visualization feature helped me finally understand C++ pointers and references. Game changer!',
    },
    {
      name: 'Marcus Rodriguez',
      role: 'CS Student at MIT',
      avatar: '/images/avatars/marcus.jpg',
      content: 'Best C++ learning platform I\'ve used. The real-time feedback and community support are incredible.',
    },
    {
      name: 'Emma Thompson',
      role: 'Senior Developer at Microsoft',
      avatar: '/images/avatars/emma.jpg',
      content: 'Even as an experienced developer, I learned new C++20 features through their interactive examples.',
    },
  ];

  return (
    <>
      <Head>
        <title>C++ Mastery Hub - Interactive C++ Learning Platform</title>
        <meta 
          name="description" 
          content="Master C++ programming with interactive code execution, memory visualization, and real-time analysis. Join thousands of developers learning modern C++." 
        />
        <meta name="keywords" content="C++, programming, learning, interactive, memory visualization, code analysis, modern C++" />
        <meta property="og:title" content="C++ Mastery Hub - Interactive C++ Learning Platform" />
        <meta 
          property="og:description" 
          content="Master C++ programming with interactive code execution, memory visualization, and real-time analysis." 
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://cpp-mastery-hub.com" />
        <meta property="og:image" content="https://cpp-mastery-hub.com/images/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="C++ Mastery Hub - Interactive C++ Learning Platform" />
        <meta 
          name="twitter:description" 
          content="Master C++ programming with interactive code execution, memory visualization, and real-time analysis." 
        />
        <meta name="twitter:image" content="https://cpp-mastery-hub.com/images/twitter-image.jpg" />
        <link rel="canonical" href="https://cpp-mastery-hub.com" />
      </Head>

      <div className="min-h-screen bg-white dark:bg-gray-900">
        {/* Navigation */}
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    C++ Mastery Hub
                  </span>
                </Link>
              </div>
              
              <div className="flex items-center space-x-4">
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/register"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                  Master{' '}
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Modern C++
                  </span>{' '}
                  with Interactive Learning
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                  Experience C++ like never before with real-time code execution, 
                  memory visualization, and AI-powered analysis. Join thousands of 
                  developers mastering C++11 through C++23.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href={isAuthenticated ? "/dashboard" : "/auth/register"}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Learning Free
                  </Link>
                  <Link
                    href="/code"
                    className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-8 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                  >
                    <Code className="w-5 h-5 mr-2" />
                    Try Code Editor
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <div className="bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
                  <div className="bg-gray-800 px-4 py-2 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="ml-4 text-gray-400 text-sm">main.cpp</span>
                  </div>
                  <div className="p-4 font-mono text-sm">
                    <div className="text-blue-400">#include &lt;iostream&gt;</div>
                    <div className="text-blue-400">#include &lt;vector&gt;</div>
                    <div className="text-blue-400">#include &lt;memory&gt;</div>
                    <br />
                    <div className="text-purple-400">int</div>{' '}
                    <div className="text-yellow-400 inline">main</div>
                    <div className="text-white inline">() {</div>
                    <br />
                    <div className="ml-4 text-gray-300">
                      <div className="text-purple-400 inline">auto</div>{' '}
                      <div className="text-white inline">ptr = std::make_unique&lt;</div>
                      <div className="text-blue-400 inline">int</div>
                      <div className="text-white inline">&gt;(42);</div>
                    </div>
                    <div className="ml-4 text-white">
                      std::<div className="text-yellow-400 inline">cout</div> &lt;&lt;{' '}
                      <div className="text-green-400 inline">"Value: "</div> &lt;&lt; *ptr;
                    </div>
                    <div className="ml-4 text-purple-400">return</div>{' '}
                    <div className="text-orange-400 inline">0</div>
                    <div className="text-white inline">;</div>
                    <br />
                    <div className="text-white">}</div>
                  </div>
                </div>
                
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  ✓ Compiled
                </div>
                <div className="absolute -bottom-4 -left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  🚀 Real-time
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-white dark:bg-gray-800 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-gray-50 dark:bg-gray-900 py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Choose C++ Mastery Hub?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                The most advanced platform for learning modern C++ programming
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
                  >
                    <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-6`}>
                      <Icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="bg-white dark:bg-gray-800 py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Loved by Developers Worldwide
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                See what our community has to say about their learning experience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8"
                >
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {testimonial.name}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-sm">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Ready to Master C++?
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Join thousands of developers who are already advancing their C++ skills 
                with our interactive platform. Start your journey today!
              </p>
              <Link
                href={isAuthenticated ? "/dashboard" : "/auth/register"}
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200 inline-flex items-center"
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold">C++ Mastery Hub</span>
                </div>
                <p className="text-gray-400">
                  The most advanced platform for learning modern C++ programming.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Learning</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/learn" className="hover:text-white transition-colors">Courses</Link></li>
                  <li><Link href="/learn/exercises" className="hover:text-white transition-colors">Exercises</Link></li>
                  <li><Link href="/learn/projects" className="hover:text-white transition-colors">Projects</Link></li>
                  <li><Link href="/learn/certification" className="hover:text-white transition-colors">Certification</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Community</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/community" className="hover:text-white transition-colors">Forums</Link></li>
                  <li><Link href="/community/discord" className="hover:text-white transition-colors">Discord</Link></li>
                  <li><Link href="/community/events" className="hover:text-white transition-colors">Events</Link></li>
                  <li><Link href="/community/blog" className="hover:text-white transition-colors">Blog</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Support</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                  <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                  <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 C++ Mastery Hub. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default HomePage;