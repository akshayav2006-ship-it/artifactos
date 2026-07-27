import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/react'

function App() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        color: '#172033',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 40px',
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <h2 style={{ margin: 0 }}>Artifactos</h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button type="button">Sign in</button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button type="button">Create account</button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <span>My account</span>
            <UserButton />
          </Show>
        </div>
      </header>

      <section
        style={{
          maxWidth: '850px',
          margin: '0 auto',
          padding: '120px 30px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontWeight: 600 }}>Unified AI Workspace</p>

        <h1
          style={{
            fontSize: '52px',
            margin: '16px 0',
          }}
        >
          Manage trusted AI work in one place
        </h1>

        <p
          style={{
            fontSize: '19px',
            lineHeight: 1.7,
            color: '#596273',
          }}
        >
          Create projects, collaborate with your team, track AI-generated
          artifacts, review versions and safely reuse approved knowledge.
        </p>
      </section>
    </main>
  )
}

export default App