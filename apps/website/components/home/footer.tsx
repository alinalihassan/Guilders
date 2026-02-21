"use client";
import { Link as LucideLink } from "lucide-react";
import Link from "next/link";
import { Github } from "lucide-react";

export const FooterSection = () => {
  return (
    <footer className="border-t border-border/40 bg-background/50 backdrop-blur-md py-12 mt-20">
      <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="font-bold text-xl flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary via-emerald-400 to-accent flex items-center justify-center">
              <span className="text-background text-lg font-black leading-none mt-[-2px]">G</span>
            </div>
            Guilders
          </Link>
          <p className="text-sm text-muted-foreground">
            Open source personal finance. Own your wealth.
          </p>
        </div>

        <div className="flex gap-4">
          <Link href="https://github.com/alinalihassan/guilders-elysia" target="_blank" className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-secondary">
            <Github className="w-5 h-5" />
          </Link>
        </div>
      </div>
      <div className="container mx-auto px-4 md:px-6 mt-8 text-center text-xs text-muted-foreground/60">
        © {new Date().getFullYear()} Guilders. Open Source under MIT License.
      </div>
    </footer>
  );
};