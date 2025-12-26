export default function Home() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '1rem',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Prophet API</h1>
      <p style={{ color: '#22c55e' }}>✓ Server is running</p>
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        border: '1px solid #333',
        borderRadius: '0.5rem',
        backgroundColor: '#0a0a0a',
        maxWidth: '600px'
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Available Endpoints:</h2>
        <ul style={{ listStyle: 'none', padding: 0, gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
          <li><code>GET /api/auth/user</code> - Get current user profile</li>
          <li><code>GET /api/chats</code> - List all chats</li>
          <li><code>POST /api/chats</code> - Create new chat</li>
          <li><code>GET /api/chats/:id</code> - Get chat details</li>
          <li><code>DELETE /api/chats/:id</code> - Delete chat</li>
          <li><code>GET /api/chats/:id/messages</code> - Get chat messages</li>
          <li><code>POST /api/chat/stream</code> - Stream AI chat response</li>
          <li><code>POST /api/webhooks/clerk</code> - Clerk webhook handler</li>
        </ul>
      </div>
      <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#666' }}>
        Prophet Chrome Extension Backend • v1.0.0
      </p>
    </div>
  )
}
