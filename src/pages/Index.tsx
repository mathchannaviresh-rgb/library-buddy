import Navbar from "@/components/Navbar";
import { Search, BookOpen, Users, ArrowRight, BookMarked, Clock } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const stats = [
  { icon: BookOpen, label: "Books Available", value: "500+" },
  { icon: Users, label: "Registered Students", value: "1,200+" },
  { icon: BookMarked, label: "Books Issued", value: "350+" },
  { icon: Clock, label: "Daily Visits", value: "200+" },
];

const Index = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/books?search=${encodeURIComponent(search)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="gradient-hero min-h-[520px] flex items-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-8 right-16 text-[200px] font-display text-primary-foreground leading-none select-none">
            📚
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-2xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-glow/20 border border-amber-glow/30 mb-6">
              <BookOpen className="w-3.5 h-3.5 text-amber-glow" />
              <span className="text-xs font-semibold text-amber-glow tracking-wide">UNIVERSITY LIBRARY</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-4">
              Your Gateway to
              <span className="text-amber-glow block">Knowledge</span>
            </h1>
            <p className="text-sidebar-foreground/80 text-lg mb-8 max-w-lg">
              Discover thousands of books, manage your issues, and track your reading journey — all in one place.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, author, or book code..."
                  className="pl-10 bg-card border-border/50 text-foreground placeholder:text-muted-foreground h-11"
                />
              </div>
              <Button type="submit" className="h-11 px-5 bg-amber-glow text-navy-deep hover:bg-amber-light font-semibold shadow-amber">
                Search
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold text-foreground mb-3">Everything You Need</h2>
          <p className="text-muted-foreground">A complete library management experience</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: BookOpen,
              title: "Browse Books",
              desc: "Explore our entire collection with powerful search and filtering by category, author, or book code.",
              link: "/books",
              cta: "Browse Catalog",
            },
            {
              icon: BookMarked,
              title: "Issue & Return",
              desc: "Easily issue available books and return them when done. Track your borrowing history.",
              link: "/issue",
              cta: "Manage Issues",
            },
            {
              icon: Users,
              title: "Register Now",
              desc: "Join our library with your USN and photo ID. Quick, easy registration for students.",
              link: "/register",
              cta: "Get Started",
            },
          ].map((card) => (
            <div key={card.title} className="gradient-card border border-border rounded-xl p-6 shadow-card hover:shadow-elevated transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <card.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">{card.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{card.desc}</p>
              <a href={card.link} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all">
                {card.cta} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="gradient-hero py-8 mt-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-amber-glow" />
            <span className="font-display font-bold text-primary-foreground">Library Hub</span>
          </div>
          <p className="text-sidebar-foreground/60 text-sm">© 2024 University Library Management System</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
