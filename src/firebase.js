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

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const googleProvider = new GoogleAuthProvider()

export { auth, db, googleProvider }
