import styles from './login.module.css'
import { LoginForm } from '../../../components/LoginForm'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string }
}) {
  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🛡️</span>
          <h1>SOC Analyst</h1>
          <p>Autonomous Security Operations</p>
        </div>
        {searchParams.error && (
          <div className={styles.error}>
            {searchParams.error === 'unauthorized'
              ? 'You do not have permission to access that page.'
              : 'Authentication error. Please try again.'}
          </div>
        )}
        <LoginForm next={searchParams.next} />
      </div>
    </main>
  )
}
