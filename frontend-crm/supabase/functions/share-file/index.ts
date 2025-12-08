import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ShareFileRequest {
  fileId: string;
  email: string;
  accessLevel: 'view' | 'download' | 'edit';
  message?: string;
  expiresIn?: number; // days
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Share file function called', { method: req.method });

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { fileId, email, accessLevel, message, expiresIn }: ShareFileRequest = await req.json();
    console.log('Share request:', { fileId, email, accessLevel, expiresIn });

    // Get file details
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      throw new Error('File not found or access denied');
    }

    console.log('File found:', { name: file.name, type: file.type });

    // Check if user owns the file or has admin rights
    const { data: userRole } = await supabase.rpc('get_user_role', { _user_id: user.id });
    
    if (file.user_id !== user.id && userRole !== 'admin') {
      throw new Error('You do not have permission to share this file');
    }

    // Calculate expiration date
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Create file share record
    const { data: shareData, error: shareError } = await supabase
      .from('file_shares')
      .insert({
        file_id: fileId,
        shared_by: user.id,
        shared_with_email: email,
        access_level: accessLevel,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (shareError) {
      console.error('Error creating share:', shareError);
      throw new Error('Failed to create file share');
    }

    console.log('Share created:', shareData);

    // Generate share link (you can customize this URL)
    const shareLink = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev')}/shared/${shareData.id}`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Streamtify <noreply@resend.dev>",
      to: [email],
      subject: `${user.email} shared "${file.name}" with you`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">File Shared with You</h2>
          <p>Hello!</p>
          <p><strong>${user.email}</strong> has shared a file with you on Streamtify.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">📁 ${file.name}</h3>
            <p style="margin: 5px 0; color: #666;">File type: ${file.type}</p>
            <p style="margin: 5px 0; color: #666;">Access level: ${accessLevel}</p>
            ${expiresAt ? `<p style="margin: 5px 0; color: #666;">Expires: ${new Date(expiresAt).toLocaleDateString()}</p>` : ''}
          </div>

          ${message ? `
            <div style="background: #e8f4fd; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
              <strong>Message from ${user.email}:</strong>
              <p style="margin: 10px 0 0 0;">${message}</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${shareLink}" 
               style="background: #0066cc; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
              View File
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            This link will allow you to ${accessLevel === 'edit' ? 'view and edit' : accessLevel === 'download' ? 'view and download' : 'view'} the shared file.
            ${expiresAt ? ` The link will expire on ${new Date(expiresAt).toLocaleDateString()}.` : ''}
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Streamtify Cloud Storage - Secure file sharing made easy
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      shareId: shareData.id,
      shareLink,
      emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in share-file function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);