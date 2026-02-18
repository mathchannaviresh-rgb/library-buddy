import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Search, BookOpen, Filter, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Book {
  id: string;
  book_code: string;
  title: string;
  author: string;
  category: string;
  isbn: string | null;
  total_copies: number;
  available_copies: number;
  description: string | null;
}

const Books = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

  const fetchBooks = async () => {
    setLoading(true);
    let query = supabase.from("books").select("*").order("book_code");

    if (search.trim()) {
      query = query.or(
        `title.ilike.%${search}%,author.ilike.%${search}%,book_code.ilike.%${search}%`
      );
    }
    if (category !== "all") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (!error && data) setBooks(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBooks();
  }, [search, category]);

  const categories = ["Computer Science", "Software Engineering", "Mathematics", "Literature", "Physics", "Electronics", "General"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="gradient-hero py-12">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary-foreground mb-2">
            Book Catalog
          </h1>
          <p className="text-sidebar-foreground/70">Browse and search our complete collection</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, author, or book code..."
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon" onClick={fetchBooks}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          {loading ? "Loading..." : `${books.length} book${books.length !== 1 ? "s" : ""} found`}
        </p>

        {/* Table */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">No books found</p>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="text-left px-4 py-3 font-semibold">Book Code</th>
                  <th className="text-left px-4 py-3 font-semibold">Title</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Author</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Copies</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book, i) => (
                  <tr
                    key={book.id}
                    className={`border-t border-border hover:bg-muted/40 transition-colors ${
                      i % 2 === 0 ? "bg-card" : "bg-background"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-bold text-primary">{book.book_code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{book.title}</p>
                      <p className="text-xs text-muted-foreground md:hidden">{book.author}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{book.author}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
                        {book.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                      {book.available_copies}/{book.total_copies}
                    </td>
                    <td className="px-4 py-3">
                      {book.available_copies > 0 ? (
                        <span className="status-available">
                          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                          Available
                        </span>
                      ) : (
                        <span className="status-issued">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" />
                          Issued
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Books;
