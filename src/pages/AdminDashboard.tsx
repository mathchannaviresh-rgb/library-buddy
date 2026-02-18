import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  BookOpen, Users, BookMarked, Plus, Edit2, Trash2,
  RotateCcw, RefreshCw, Shield
} from "lucide-react";

interface Book {
  id: string;
  book_code: string;
  title: string;
  author: string;
  category: string;
  isbn: string | null;
  total_copies: number;
  available_copies: number;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  usn: string | null;
  department: string | null;
  phone: string | null;
  created_at: string;
}

interface Issue {
  id: string;
  user_id: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
  books: { book_code: string; title: string };
  profiles?: { name: string; usn: string | null } | null;
}

const CATEGORIES = ["Computer Science", "Software Engineering", "Mathematics", "Literature", "Physics", "Electronics", "General"];

const emptyBook = { title: "", author: "", category: "General", isbn: "", total_copies: "1" };

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [bookDialog, setBookDialog] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [bookForm, setBookForm] = useState(emptyBook);
  const [savingBook, setSavingBook] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/login");
  }, [loading, isAdmin]);

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    setLoadingData(true);
    const [booksRes, usersRes, issuesRes] = await Promise.all([
      supabase.from("books").select("*").order("book_code"),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase
        .from("book_issues")
        .select("*, books(book_code, title)")
        .order("issue_date", { ascending: false })
        .limit(100),
    ]);
    if (booksRes.data) setBooks(booksRes.data);
    if (usersRes.data) setUsers(usersRes.data);
    if (issuesRes.data) {
      // Enrich issues with profile data
      const profilesMap = new Map(usersRes.data?.map((p) => [p.id, p]) ?? []);
      const enriched = (issuesRes.data as unknown as Issue[]).map((issue) => ({
        ...issue,
        profiles: profilesMap.get(issue.user_id) ? {
          name: profilesMap.get(issue.user_id)!.name,
          usn: profilesMap.get(issue.user_id)!.usn,
        } : null,
      }));
      setIssues(enriched);
    }
    setLoadingData(false);
  };

  const openAddBook = () => {
    setEditBook(null);
    setBookForm(emptyBook);
    setBookDialog(true);
  };

  const openEditBook = (book: Book) => {
    setEditBook(book);
    setBookForm({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn: book.isbn ?? "",
      total_copies: String(book.total_copies),
    });
    setBookDialog(true);
  };

  const handleSaveBook = async () => {
    if (!bookForm.title || !bookForm.author) {
      toast({ title: "Required fields missing", variant: "destructive" });
      return;
    }
    setSavingBook(true);

    if (editBook) {
      const diff = parseInt(bookForm.total_copies) - editBook.total_copies;
      const { error } = await supabase.from("books").update({
        title: bookForm.title,
        author: bookForm.author,
        category: bookForm.category,
        isbn: bookForm.isbn || null,
        total_copies: parseInt(bookForm.total_copies),
        available_copies: Math.max(0, editBook.available_copies + diff),
      }).eq("id", editBook.id);

      if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
      else { toast({ title: "Book updated!" }); setBookDialog(false); fetchAll(); }
    } else {
      // Get next book code
      const { data: codeData } = await supabase.rpc("generate_book_code");
      const { error } = await supabase.from("books").insert({
        book_code: codeData as string,
        title: bookForm.title,
        author: bookForm.author,
        category: bookForm.category,
        isbn: bookForm.isbn || null,
        total_copies: parseInt(bookForm.total_copies),
        available_copies: parseInt(bookForm.total_copies),
      });

      if (error) toast({ title: "Add failed", description: error.message, variant: "destructive" });
      else { toast({ title: "Book added!", description: `Code: ${codeData}` }); setBookDialog(false); fetchAll(); }
    }
    setSavingBook(false);
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm("Delete this book? This cannot be undone.")) return;
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Book deleted" }); fetchAll(); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  const activeIssues = issues.filter((i) => i.status === "issued");
  const availableBooks = books.filter((b) => b.available_copies > 0).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="gradient-hero py-10">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-amber-glow" />
              <span className="text-xs font-bold text-amber-glow tracking-wide">ADMIN DASHBOARD</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-primary-foreground">Library Management</h1>
            <p className="text-sidebar-foreground/70 mt-1">Manage books, users, and transactions</p>
          </div>
          <Button onClick={fetchAll} variant="outline" size="sm" className="border-sidebar-border text-sidebar-foreground hover:bg-navy-light">
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 -mt-5 mb-6 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Books", value: books.length, icon: BookOpen, color: "bg-primary" },
            { label: "Available", value: availableBooks, icon: BookOpen, color: "bg-success" },
            { label: "Registered Users", value: users.length, icon: Users, color: "bg-navy" },
            { label: "Active Issues", value: activeIssues.length, icon: BookMarked, color: "bg-warning" },
          ].map((s) => (
            <div key={s.label} className="gradient-card border border-border rounded-xl p-4 shadow-card">
              <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
                <s.icon className="w-4 h-4 text-primary-foreground" />
              </div>
              <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 pb-10">
        <Tabs defaultValue="books">
          <TabsList className="mb-6">
            <TabsTrigger value="books">Books ({books.length})</TabsTrigger>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="issues">Issue History ({issues.length})</TabsTrigger>
          </TabsList>

          {/* Books Tab */}
          <TabsContent value="books">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Book Catalog</h2>
              <Button onClick={openAddBook} className="bg-primary text-primary-foreground hover:bg-navy-light">
                <Plus className="w-4 h-4 mr-1.5" /> Add Book
              </Button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="text-left px-4 py-3">Code</th>
                    <th className="text-left px-4 py-3">Title</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Author</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Category</th>
                    <th className="text-left px-4 py-3">Copies</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((book, i) => (
                    <tr key={book.id} className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-background"}`}>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-primary">{book.book_code}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{book.title}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{book.author}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">{book.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={book.available_copies > 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                          {book.available_copies}
                        </span>
                        <span className="text-muted-foreground">/{book.total_copies}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEditBook(book)} className="text-primary hover:text-navy-light transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteBook(book.id)} className="text-destructive hover:opacity-70 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Registered Students</h2>
            <div className="overflow-x-auto rounded-xl border border-border shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">USN</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Email</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Department</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-background"}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-primary font-bold">{u.usn ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{u.department ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Issue/Return History</h2>
            <div className="overflow-x-auto rounded-xl border border-border shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="text-left px-4 py-3">Student</th>
                    <th className="text-left px-4 py-3">Book</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Issued</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Due</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Returned</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue, i) => (
                    <tr key={issue.id} className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-background"}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{issue.profiles?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{issue.profiles?.usn}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{issue.books?.title}</p>
                        <p className="text-xs font-mono text-primary">{issue.books?.book_code}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(issue.issue_date)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatDate(issue.due_date)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{issue.return_date ? formatDate(issue.return_date) : "—"}</td>
                      <td className="px-4 py-3">
                        {issue.status === "issued" ? (
                          <span className="status-issued flex items-center gap-1"><BookMarked className="w-3 h-3" /> Issued</span>
                        ) : (
                          <span className="status-available flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Returned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Book Dialog */}
      <Dialog open={bookDialog} onOpenChange={setBookDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editBook ? "Edit Book" : "Add New Book"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editBook && (
              <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                Book code will be auto-generated (e.g. LIB009)
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={bookForm.title} onChange={(e) => setBookForm((p) => ({ ...p, title: e.target.value }))} placeholder="Book title" />
            </div>
            <div className="space-y-1.5">
              <Label>Author *</Label>
              <Input value={bookForm.author} onChange={(e) => setBookForm((p) => ({ ...p, author: e.target.value }))} placeholder="Author name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={bookForm.category} onValueChange={(v) => setBookForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Total Copies</Label>
                <Input type="number" min={1} value={bookForm.total_copies} onChange={(e) => setBookForm((p) => ({ ...p, total_copies: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ISBN (optional)</Label>
              <Input value={bookForm.isbn} onChange={(e) => setBookForm((p) => ({ ...p, isbn: e.target.value }))} placeholder="e.g. 978-..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveBook} disabled={savingBook} className="bg-primary text-primary-foreground">
              {savingBook ? "Saving..." : editBook ? "Update Book" : "Add Book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
