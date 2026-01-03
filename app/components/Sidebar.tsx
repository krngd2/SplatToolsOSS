'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Tool {
  name: string;
  href: string;
}

const tools: Tool[] = [
  { name: 'Editor', href: '/editor' },
];

interface User {
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}

export default function Sidebar() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();


  return (
    <aside className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen shrink-0 flex flex-col">
      <div className="p-6 flex-1">
        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Tools</h2>
        <nav>
          <ul className="space-y-2">
            {tools.map((tool) => (
              <li key={tool.name}>
                <Link
                  href={tool.href}
                  className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start")}
                >
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
