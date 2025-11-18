export interface SafeUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  avatar?: string | null;
  status: string;
  lastLoginAt?: Date | null;
  emailVerifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
