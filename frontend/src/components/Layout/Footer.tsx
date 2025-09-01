// File: frontend/src/components/Layout/Footer.tsx
export const Footer: React.FC = () => {
  return (
    <footer className="bg-background border-t border-border py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Code className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-lg">C++ Mastery Hub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Master C++ programming with interactive lessons, real-time code analysis, 
              and a supportive community.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Learning</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/learn/basics" className="hover:text-foreground">C++ Basics</Link></li>
              <li><Link href="/learn/oop" className="hover:text-foreground">Object-Oriented Programming</Link></li>
              <li><Link href="/learn/advanced" className="hover:text-foreground">Advanced Topics</Link></li>
              <li><Link href="/learn/algorithms" className="hover:text-foreground">Algorithms & Data Structures</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Community</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/community/forums" className="hover:text-foreground">Forums</Link></li>
              <li><Link href="/community/challenges" className="hover:text-foreground">Code Challenges</Link></li>
              <li><Link href="/community/showcase" className="hover:text-foreground">Project Showcase</Link></li>
              <li><Link href="/community/mentorship" className="hover:text-foreground">Mentorship</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/help" className="hover:text-foreground">Help Center</Link></li>
              <li><Link href="/docs" className="hover:text-foreground">Documentation</Link></li>
              <li><Link href="/contact" className="hover:text-foreground">Contact Us</Link></li>
              <li><Link href="/feedback" className="hover:text-foreground">Feedback</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © 2025 C++ Mastery Hub. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/cookies" className="text-sm text-muted-foreground hover:text-foreground">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};