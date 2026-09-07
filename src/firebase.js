import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyA9IkQIJ02nAyTaBhYzXw1wnw3fRGafJ6I',
  authDomain: 'etf-trade-ebe9d.firebaseapp.com',
  projectId: 'etf-trade-ebe9d',
  storageBucket: 'etf-trade-ebe9d.firebasestorage.app',
  messagingSenderId: '728287709294',
  appId: '1:728287709294:web:32ae0e6163035157157e7f',
  measurementId: 'G-3X3880XFL3',
}

let auth = null
let db = null
let googleProvider = null

try {
  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  googleProvider = new GoogleAuthProvider()
} catch (error) {
  console.warn('Firebase initialization skipped:', error)
}

export { auth, db, googleProvider }
