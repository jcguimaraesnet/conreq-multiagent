import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jcguimaraes@gmail.com'

export async function notifyAdminNewUser(user: {
  firstName: string
  lastName: string
  email: string
}) {
  try {
    await resend.emails.send({
      from: 'CONREQ Multi-Agent <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: `New user registration: ${user.firstName} ${user.lastName}`,
      html: `
        <h2>New User Registration</h2>
        <p>A new user has signed up and is waiting for approval.</p>
        <table style="border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px 16px 8px 0; font-weight: bold;">Name</td>
            <td style="padding: 8px 0;">${user.firstName} ${user.lastName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 16px 8px 0; font-weight: bold;">Email</td>
            <td style="padding: 8px 0;">${user.email}</td>
          </tr>
        </table>
        <p style="margin-top: 24px;">
          Log in to the admin panel to approve or reject this user.
        </p>
      `,
    })
  } catch (error) {
    console.error('Failed to send admin notification email:', error)
  }
}
