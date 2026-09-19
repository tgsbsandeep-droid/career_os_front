export type UserRole =
  | "candidate"
  | "academy"
  | "training_institute"
  | "college"
  | "recruiter"
  | "employer"
  | "admin";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  headline?: string;
  location?: string;
}
