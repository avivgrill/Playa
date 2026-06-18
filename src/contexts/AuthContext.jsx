import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { setLanguage } from '../i18n'

const ADMIN_EMAIL = 'avivgrill@gmail.com'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasTimecard, setHasTimecard] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const roleRef = doc(db, 'userRoles', user.uid)
        const roleSnap = await getDoc(roleRef)

        if (!roleSnap.exists()) {
          const firstAdmin = user.email === ADMIN_EMAIL
          await setDoc(roleRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email,
            isAdmin: firstAdmin,
            hasTimecard: false,
            createdAt: serverTimestamp(),
          })
          setIsAdmin(firstAdmin)
          setHasTimecard(false)
        } else {
          const role = roleSnap.data()
          // ADMIN_EMAIL is always admin regardless of Firestore flag
          setIsAdmin(role.isAdmin === true || user.email === ADMIN_EMAIL)
          setHasTimecard(role.hasTimecard === true)
          // Restore saved language preference
          if (role.language) {
            setLanguage(role.language)
          }
        }
      } else {
        setIsAdmin(false)
        setHasTimecard(false)
      }
      setCurrentUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const logout = () => signOut(auth)

  const saveLanguage = async (lang) => {
    setLanguage(lang)
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'userRoles', currentUser.uid), { language: lang })
      } catch (_) { /* non-critical */ }
    }
  }

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, hasTimecard, logout, saveLanguage }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
