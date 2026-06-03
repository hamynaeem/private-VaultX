import { Injectable, inject, signal, computed } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  updatePassword,
  User,
  onAuthStateChanged,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { VaultUser } from '../models/vault.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  vaultUser = signal<VaultUser | null>(null);
  isLoading = signal(true);

  isAuthenticated = computed(() => !!this.currentUser());

  constructor() {
    onAuthStateChanged(this.auth, async (user) => {
      this.currentUser.set(user);
      if (user) {
        await this.loadVaultUser(user.uid);
      } else {
        this.vaultUser.set(null);
      }
      this.isLoading.set(false);
    });
  }

  async login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    await this.router.navigate(['/dashboard']);
    return cred;
  }

  async register(email: string, password: string, fullName: string) {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(cred.user, { displayName: fullName });
    await sendEmailVerification(cred.user);
    await this.createUserDoc(cred.user, fullName);
    await this.router.navigate(['/dashboard']);
    return cred;
  }

  async googleSignIn() {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(this.auth, provider);
    const exists = await this.userDocExists(cred.user.uid);
    if (!exists) {
      await this.createUserDoc(cred.user, cred.user.displayName ?? 'User');
    }
    await this.router.navigate(['/dashboard']);
    return cred;
  }

  async forgotPassword(email: string) {
    return sendPasswordResetEmail(this.auth, email);
  }

  async changePassword(newPassword: string) {
    if (!this.auth.currentUser) throw new Error('Not authenticated');
    return updatePassword(this.auth.currentUser, newPassword);
  }

  async logout() {
    await signOut(this.auth);
    this.currentUser.set(null);
    this.vaultUser.set(null);
    await this.router.navigate(['/auth/login']);
  }

  private async createUserDoc(user: User, fullName: string) {
    const ref = doc(this.firestore, 'users', user.uid);
    await setDoc(ref, {
      uid: user.uid,
      fullName,
      email: user.email,
      photoURL: user.photoURL ?? '',
      createdAt: serverTimestamp(),
      storageUsed: 0,
    });
  }

  private async userDocExists(uid: string): Promise<boolean> {
    const ref = doc(this.firestore, 'users', uid);
    const snap = await getDoc(ref);
    return snap.exists();
  }

  private async loadVaultUser(uid: string) {
    const ref = doc(this.firestore, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      this.vaultUser.set(snap.data() as VaultUser);
    }
  }

  async updateUserProfile(data: Partial<VaultUser>) {
    const uid = this.currentUser()?.uid;
    if (!uid) return;
    const ref = doc(this.firestore, 'users', uid);
    await updateDoc(ref, data as Record<string, unknown>);
    this.vaultUser.update((u) => (u ? { ...u, ...data } : u));
  }
}
