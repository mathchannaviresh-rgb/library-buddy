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
import { BookMarked, RotateCcw, Calendar, CheckCircle, XCircle, Search } from "lucide-react";

interface BookIssue {
  id: string;
  book_id: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
  books: {
    book_code: string;
    title: string;
    author: string;
  };
}

const IssuePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookCode, setBookCode] = useState("");
  const [returnCode, setReturnCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [myIssues, setMyIssues] = useState<BookIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchMyIssues();
  }, [user]);

  const fetchMyIssues = async () => {
    if (!user) return;
    setLoadingIssues(true);
    const { data } = await supabase
      .from("book_issues")
      .select("*, books(book_code, title, author)")
      .eq("user_id", user.id)
      .order("issue_date", { ascending: false });
    if (data) setMyIssues(data as BookIssue[]);
    setLoadingIssues(false);
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // Find book by code
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, title, available_copies")
      .eq("book_code", bookCode.toUpperCase())
      .single();

    if (bookError || !book) {
      toast({ title: "Book not found", description: `No book with code ${bookCode.toUpperCase()}`, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (book.available_copies <= 0) {
      toast({ title: "Book unavailable", description: "This book is currently issued to someone else", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Check if user already has this book
    const { data: existing } = await supabase
      .from("book_issues")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", book.id)
      .eq("status", "issued")
      .single();

    if (existing) {
      toast({ title: "Already issued", description: "You already have this book issued", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("book_issues").insert({
      book_id: book.id,
      user_id: user.id,
    });

    if (error) {
      toast({ title: "Issue failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Book issued!", description: `"${book.title}" issued successfully. Return within 14 days.` });
      setBookCode("");
      fetchMyIssues();
    }
    setLoading(false);
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { data: book } = await supabase
      .from("books")
      .select("id, title")
      .eq("book_code", returnCode.toUpperCase())
      .single();

    if (!book) {
      toast({ title: "Book not found", description: `No book with code ${returnCode.toUpperCase()}`, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: issue } = await supabase
      .from("book_issues")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", book.id)
      .eq("status", "issued")
      .single();

    if (!issue) {
      toast({ title: "No active issue", description: "You haven't issued this book or it's already returned", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("book_issues")
      .update({ status: "returned", return_date: new Date().toISOString() })
      .eq("id", issue.id);

    if (error) {
      toast({ title: "Return failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Book returned!", description: `"${book.title}" returned successfully.` });
      setReturnCode("");
      fetchMyIssues();
    }
    setLoading(false);
  };

  const activeIssues = myIssues.filter((i) => i.status === "issued");
  const returnedIssues = myIssues.filter((i) => i.status === "returned");

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="gradient-hero py-10">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-3xl font-bold text-primary-foreground mb-1">Issue & Return Books</h1>
          <p className="text-sidebar-foreground/70">Manage your book borrowings</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* Issue Form */}
          <div className="gradient-card border border-border rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <BookMarked className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Issue a Book</h2>
                <p className="text-xs text-muted-foreground">Enter the book code to borrow</p>
              </div>
            </div>
            <form onSubmit={handleIssue} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bookCode">Book Code</Label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="bookCode"
                    value={bookCode}
                    onChange={(e) => setBookCode(e.target.value)}
                    placeholder="e.g. LIB001"
                    className="pl-10 font-mono uppercase"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Find book codes in the Books Catalog</p>
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-navy-light font-semibold" disabled={loading}>
                {loading ? "Processing..." : "Issue Book"}
              </Button>
            </form>
          </div>

          {/* Return Form */}
          <div className="gradient-card border border-border rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-success flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-success-foreground" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Return a Book</h2>
                <p className="text-xs text-muted-foreground">Enter the book code to return</p>
              </div>
            </div>
            <form onSubmit={handleReturn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="returnCode">Book Code</Label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="returnCode"
                    value={returnCode}
                    onChange={(e) => setReturnCode(e.target.value)}
                    placeholder="e.g. LIB001"
                    className="pl-10 font-mono uppercase"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-success text-success-foreground hover:opacity-90 font-semibold" disabled={loading}>
                {loading ? "Processing..." : "Return Book"}
              </Button>
            </form>
          </div>
        </div>

        {/* My Issues */}
        <div className="gradient-card border border-border rounded-xl p-6 shadow-card">
          <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            My Borrowing History
          </h2>

          <Tabs defaultValue="active">
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active ({activeIssues.length})</TabsTrigger>
              <TabsTrigger value="returned">Returned ({returnedIssues.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {loadingIssues ? (
                <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
              ) : activeIssues.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <BookMarked className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No active issues</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeIssues.map((issue) => (
                    <div key={issue.id} className={`flex items-start justify-between p-4 rounded-lg border ${isOverdue(issue.due_date) ? "border-destructive/30 bg-destructive/5" : "border-border bg-background"}`}>
                      <div>
                        <p className="font-semibold text-foreground">{issue.books.title}</p>
                        <p className="text-sm text-muted-foreground">{issue.books.author} · <span className="font-mono text-xs">{issue.books.book_code}</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Issued: {formatDate(issue.issue_date)}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        {isOverdue(issue.due_date) ? (
                          <span className="status-issued flex items-center gap-1"><XCircle className="w-3 h-3" /> Overdue</span>
                        ) : (
                          <span className="status-available flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</span>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Due: {formatDate(issue.due_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="returned">
              {returnedIssues.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <RotateCcw className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No returned books yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {returnedIssues.map((issue) => (
                    <div key={issue.id} className="flex items-start justify-between p-4 rounded-lg border border-border bg-background">
                      <div>
                        <p className="font-semibold text-foreground">{issue.books.title}</p>
                        <p className="text-sm text-muted-foreground">{issue.books.author} · <span className="font-mono text-xs">{issue.books.book_code}</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Issued: {formatDate(issue.issue_date)}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span className="status-available flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Returned</span>
                        {issue.return_date && <p className="text-xs text-muted-foreground mt-1">On: {formatDate(issue.return_date)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default IssuePage;
