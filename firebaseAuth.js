import { auth, DB } from "./firebaseConfig";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

// -------------------------------
// Login with Google
// -------------------------------
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);

  const user = result.user;
  const userId = user.email.toLowerCase(); // Firestore doc ID

  await createUserIfNotExists(userId, user);

  return userId;
}

// -------------------------------
// Create user if not exists
// -------------------------------
async function createUserIfNotExists(userId, user) {
  const userRef = doc(DB, "users", userId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      name: user.displayName || "",
      email: user.email,
      liked_posts: [],
      created_at: new Date(),
    });
  }
}

// -------------------------------
// Save Liked Post
// -------------------------------
export async function saveLikedPost(userEmail, postId) {
  const userId = userEmail.toLowerCase();
  const userRef = doc(DB, "users", userId);

  await updateDoc(userRef, {
    liked_posts: arrayUnion(postId),
  });
}

// -------------------------------
// Remove Liked Post (unlike)
// -------------------------------
export async function removeLikedPost(userEmail, postId) {
  const userId = userEmail.toLowerCase();
  const userRef = doc(DB, "users", userId);

  await updateDoc(userRef, {
    liked_posts: arrayRemove(postId),
  });
}

// -------------------------------
// Check if post is liked
// -------------------------------
export async function isPostLiked(userEmail, postId) {
  const userId = userEmail.toLowerCase();
  const userRef = doc(DB, "users", userId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return false;

  const liked = snap.data().liked_posts || [];
  return liked.includes(postId);
}
