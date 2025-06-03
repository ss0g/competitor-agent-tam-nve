'use client'

import Link from 'next/link'
import { HomeIcon, ChartBarIcon, DocumentTextIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useSession, signIn, signOut } from 'next-auth/react'
import Image from 'next/image'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Competitors', href: '/competitors', icon: UserGroupIcon },
  { name: 'Reports', href: '/reports', icon: DocumentTextIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
]

export function Navigation() {
  const { data: session } = useSession()

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                CompAI
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <item.icon className="mr-2 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <button className="rounded-full bg-blue-600 p-1 text-white hover:bg-blue-700">
                  <span className="sr-only">View notifications</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </button>
                <div className="flex items-center space-x-2">
                  {session.user?.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <button
                    onClick={() => signOut()}
                    className="text-sm font-medium text-gray-700 hover:text-blue-600"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 