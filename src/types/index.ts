// Core entities
export interface Book {
  id: string;
  book_code: string;
  title: string;
  author: string;
  category: string;
  isbn: string | null;
  description: string | null;
  total_copies: number;
  available_copies: number;
  cover_url: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  usn: string | null;
  department: string | null;
  phone: string | null;
  role: "student" | "staff" | "librarian";
  is_student: boolean;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BorrowRecord {
  id: string;
  user_id: string;
  book_id: string;
  issue_date: string;
  issue_time: string;
  due_date: string;
  return_date: string | null;
  return_time: string | null;
  status: "issued" | "returned" | "overdue";
  fine_amount: number;
  fine_paid: boolean;
  book?: Book;
  profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "book_issued" | "book_returned" | "due_reminder" | "overdue" | "reservation_available" | "fine_alert";
  title: string;
  message: string;
  book_id?: string;
  borrow_record_id?: string;
  read: boolean;
  sent_via: ("in_app" | "email" | "sms" | "sound")[];
  created_at: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  book_id: string;
  reserved_at: string;
  notification_sent: boolean;
  book?: Book;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  description: string;
  book_count: number;
}

export interface LateFee {
  id: string;
  borrow_record_id: string;
  user_id: string;
  amount: number;
  paid: boolean;
  paid_date: string | null;
  created_at: string;
}

export interface SearchResult {
  type: "text" | "voice" | "image";
  query: string;
  results: Book[];
  timestamp: string;
}
