import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the session user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    const { email } = await req.json()

    if (!email) {
      throw new Error('Email is required')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }

    // Create invitation using the database function
    const { data: invitationId, error: invitationError } = await supabaseClient
      .rpc('create_user_invitation', {
        p_email: email,
        p_invited_by: user.id
      })

    if (invitationError) {
      throw invitationError
    }

    // Get the created invitation to get the token
    const { data: invitation, error: fetchError } = await supabaseClient
      .from('user_invitations')
      .select('invitation_token, invited_email')
      .eq('id', invitationId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    // Create invitation link
    const invitationLink = `${Deno.env.get('SITE_URL') || 'http://localhost:8080'}/accept-invitation?token=${invitation.invitation_token}`

    // Send email using Resend or other email service
    // For now, we'll use a simple fetch to a hypothetical email service
    // You can replace this with your preferred email service (SendGrid, Mailgun, etc.)

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Streamtify Invitation</h1>
            </div>
            <div class="content">
              <p>Hello!</p>
              <p>You've been invited to join <strong>Streamtify</strong> cloud storage platform.</p>
              <p>Click the button below to accept your invitation and set up your account:</p>
              <div style="text-align: center;">
                <a href="${invitationLink}" class="button">Accept Invitation</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${invitationLink}</p>
              <p><strong>Note:</strong> This invitation will expire in 7 days.</p>
              <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    // Log the email for development (replace with actual email service)
    console.log('Sending invitation email to:', email)
    console.log('Invitation link:', invitationLink)

    // TODO: Integrate with your email service provider
    // Example with Resend:
    /*
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Streamtify <noreply@yourdomain.com>',
        to: email,
        subject: 'You\'re invited to join Streamtify',
        html: emailHtml
      })
    })

    if (!emailResponse.ok) {
      throw new Error('Failed to send email')
    }
    */

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation sent successfully',
        invitationId,
        invitationLink // Return link for development/testing
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})