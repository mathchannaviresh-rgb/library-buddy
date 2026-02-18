import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Upload, UserPlus, BookOpen, X } from "lucide-react";

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Information Science",
  "Electrical Engineering",
  "Biotechnology",
  "Business Administration",
  "Arts & Humanities",
  "Other",
];

const Register = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    usn: "",
    department: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Photo must be under 5MB", variant: "destructive" });
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: "Password too short", description: "Must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (!form.usn.trim()) {
      toast({ title: "USN is required", variant: "destructive" });
      return;
    }
    if (!photoFile) {
      toast({ title: "Photo ID is required", description: "Please upload your student ID", variant: "destructive" });
      return;
    }
    if (!form.department) {
      toast({ title: "Department is required", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            name: form.name,
            phone: form.phone,
            usn: form.usn.toUpperCase(),
            department: form.department,
            role: "student",
          },
        },
      });

      if (error) throw error;

      // Upload photo ID if user was created
      if (data.user) {
        const fileExt = photoFile.name.split(".").pop();
        const filePath = `${data.user.id}/photo-id.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("photo-ids")
          .upload(filePath, photoFile, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("photo-ids").getPublicUrl(filePath);
          // Update profile with photo URL
          await supabase
            .from("profiles")
            .update({ photo_url: urlData.publicUrl })
            .eq("id", data.user.id);
        }
      }

      toast({
        title: "Registration successful!",
        description: "Please check your email to verify your account.",
      });
      navigate("/login");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      toast({ title: "Registration failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">Student Registration</h1>
            <p className="text-muted-foreground mt-1">Create your library account</p>
          </div>

          <form onSubmit={handleSubmit} className="gradient-card border border-border rounded-2xl p-6 sm:p-8 shadow-card space-y-5">
            {/* Name + Email */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" value={form.name} onChange={handleChange("name")} placeholder="John Doe" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" type="email" value={form.email} onChange={handleChange("email")} placeholder="john@university.edu" required />
              </div>
            </div>

            {/* USN + Phone */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="usn">USN (University Serial Number) *</Label>
                <Input
                  id="usn"
                  value={form.usn}
                  onChange={handleChange("usn")}
                  placeholder="e.g. 1XX21CS001"
                  required
                  className="font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground">Your unique university ID number</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={handleChange("phone")} placeholder="+91 98765 43210" />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label>Department / Class *</Label>
              <Select value={form.department} onValueChange={(v) => setForm((p) => ({ ...p, department: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Photo ID Upload */}
            <div className="space-y-1.5">
              <Label>Photo ID (Student ID Card) *</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                {photoPreview ? (
                  <div className="relative inline-block">
                    <img src={photoPreview} alt="ID Preview" className="max-h-32 mx-auto rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="photo-upload" className="cursor-pointer block">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Click to upload your Student ID</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG or PDF up to 5MB</p>
                  </label>
                )}
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handlePhotoChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Required for identity verification. Your ID is securely stored.
              </p>
            </div>

            {/* Password */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange("password")}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground hover:bg-navy-light font-semibold" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
