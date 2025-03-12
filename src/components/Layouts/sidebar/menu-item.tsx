import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { useSidebarContext } from "./sidebar-context";

const menuItemBaseStyles = cva(
  "rounded-lg px-3.5 font-medium text-gray-600 transition-all duration-200 dark:text-gray-400",
  {
    variants: {
      isActive: {
        true: "bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-300 dark:hover:bg-primary-900/30",
        false:
          "hover:bg-gray-100 hover:text-primary-700 hover:dark:bg-gray-800 hover:dark:text-primary-300",
      },
    },
    defaultVariants: {
      isActive: false,
    },
  },
);

interface MenuItemProps {
  className?: string;
  children: React.ReactNode;
  isActive: boolean;
  onClick?: () => void;
}

export function MenuItem({
  children,
  className,
  as = "button",
  href,
  isActive,
  onClick,
  ...props
}: MenuItemProps) {
  const { toggleSidebar, isMobile } = useSidebarContext();

  const itemClasses = cn(
    menuItemBaseStyles({
      isActive: isActive,
      className: "flex w-full items-center gap-3 py-2",
    }),
    className,
  );

  if (as === "link") {
    return (
      <Link
        href={href || "#"}
        onClick={onClick}
        className={itemClasses}
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      aria-expanded={isActive}
      className={itemClasses}
      {...props}
    >
      {children}
    </button>
  );
}
