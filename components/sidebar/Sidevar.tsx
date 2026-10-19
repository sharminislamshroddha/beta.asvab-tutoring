'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const menuItems = [
  {
    title: 'Content Management',
    children: [
      {
        label: 'Pages',
        href: '/admin/pages',
        children: [ // ✅ Added children under Pages
          { label: 'Insert About Us', href: '/admin/pages/insert-about-us' },
          { label: 'Insert How It Works', href: '/admin/pages/insert-how-it-works' },
          { label: 'Insert Pricing', href: '/admin/pages/insert-pricing' },

        ],
      },
      { label: 'Insert Blogs', href: '/admin/blogs' },
      // { label: 'Courses', href: '/admin/courses' },
      // { label: 'Teachers', href: '/admin/teachers' },
      { label: 'Insert FAQ', href: '/admin/add-faq' },

      { label: 'Insert Tutoring Package', href: '/admin/tutoring-package' },
       { label:'Insert Tutoring Package Sessions', href: '/admin/tutoring-package-sessions' },
      { label: 'Insert Tutor', href: '/admin/insert-tutor' },
      { label: 'Insert Course', href: '/admin/insert-course' },

      
    ],
  },
  {
    title: 'Pricing Management',
    children: [
      { label: '1-on-1 tutoring', href: '/admin/content-list' },
      { label: 'Group-tutoring', href: '/admin/add-content' },
      { label: 'Web Subscription', href: '/admin/subscription' },
    ],
  },
  {
    title: 'Free Practice Test',
    children: [
      { label: 'Courses', href: '/admin/student-list' },
      // { label: 'Tutor List', href: '/admin/tutor-list' },
    ],
  },
  {
    title: 'Enquiry Management',
    children: [
      { label: 'View Tutor Request', href: '/admin/tutor-request' },
      { label: 'Email Drafts', href: '/admin/email-draft' },
    ],
  },
  {
    title: 'Settings',
    children: [
      { label: 'Site Setting', href: '/admin/site-setting' },
      { label: 'Change Admin Password', href: '/admin/change-password' },
      // { label: 'Questions', href: '/admin/questions' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <aside className="bg-dark text-white vh-100 mt-4" style={{ width: '250px', overflowY: 'auto' }}>
      <div className="p-3 border-bottom">
        <strong>Admin Panel</strong>
      </div>
      <ul className="nav flex-column">
        {menuItems.map(({ title, children }) => (
          <li className="nav-item" key={title}>
            <button
              className="btn text-start w-100 text-white px-3 py-2 d-flex justify-content-between align-items-center"
              onClick={() => toggleMenu(title)}
            >
              <span className="d-flex align-items-center gap-2">
                <i className="bi bi-list"></i>
                <span>{title}</span>
              </span>
              <i className={`bi ${openMenus[title] ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
            </button>

            {openMenus[title] && (
              <ul className="nav flex-column ms-3">
                {children.map(({ label, href, children: subChildren }) => (
                  <li className="nav-item" key={href}>
                    <Link
                      href={href}
                      className={`nav-link py-1 ${pathname === href ? 'text-warning fw-bold' : 'text-white'}`}
                    >
                      {label}
                    </Link>

                    {/* ✅ Render sub-menus if available */}
                    {subChildren && (
                      <ul className="nav flex-column ms-3">
                        {subChildren.map(({ label, href }) => (
                          <li className="nav-item" key={href}>
                            <Link
                              href={href}
                              className={`nav-link py-1 ${pathname === href ? 'text-warning fw-bold' : 'text-white'}`}
                            >
                              {label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
