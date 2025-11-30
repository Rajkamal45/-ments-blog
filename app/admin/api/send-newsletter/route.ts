import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Initialize Supabase with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize AWS SES Client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { blogId, title, slug, excerpt, featuredImage, content } = body;

    console.log("Sending full blog newsletter:", { title, slug });

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Title and slug are required" },
        { status: 400 }
      );
    }

    // Get all active subscribers
    const { data: subscribers, error: subError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("email")
      .eq("is_active", true);

    if (subError) {
      console.error("Error fetching subscribers:", subError);
      return NextResponse.json(
        { error: "Failed to fetch subscribers" },
        { status: 500 }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No subscribers to notify",
        count: 0,
      });
    }

    const fromEmail = process.env.AWS_SES_FROM_EMAIL || "newsletter@yourdomain.com";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com";
    const blogUrl = `${siteUrl}/blog/${slug}`;

    // Convert markdown content to HTML
    const htmlContent = convertMarkdownToHTML(content || "");

    let successCount = 0;
    let failCount = 0;

    // Send emails to each subscriber
    for (const subscriber of subscribers) {
      try {
        const command = new SendEmailCommand({
          Source: fromEmail,
          Destination: {
            ToAddresses: [subscriber.email],
          },
          Message: {
            Subject: {
              Data: `📝 ${title}`,
              Charset: "UTF-8",
            },
            Body: {
              Html: {
                Data: generateFullArticleEmailHTML(
                  title, 
                  excerpt,
                  htmlContent, 
                  blogUrl, 
                  featuredImage, 
                  siteUrl, 
                  subscriber.email
                ),
                Charset: "UTF-8",
              },
              Text: {
                Data: generatePlainText(title, content || excerpt, blogUrl, siteUrl),
                Charset: "UTF-8",
              },
            },
          },
        });

        await sesClient.send(command);
        successCount++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.error(`Failed to send to ${subscriber.email}:`, err);
        failCount++;
      }
    }

    // Log the newsletter send
    try {
      await supabaseAdmin.from("newsletter_logs").insert({
        blog_id: blogId || null,
        blog_title: title,
        recipients_count: successCount,
        failed_count: failCount,
        sent_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to log newsletter:", e);
    }

    return NextResponse.json({
      success: true,
      message: `Newsletter sent to ${successCount} subscribers`,
      count: successCount,
      failed: failCount,
    });
  } catch (error: any) {
    console.error("Newsletter error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send newsletter" },
      { status: 500 }
    );
  }
}

// Convert Markdown to beautiful HTML for email
function convertMarkdownToHTML(markdown: string): string {
  if (!markdown) return "";
  
  let html = markdown;

  // Code blocks (must be first)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, 
    '<div style="background:#1e293b;border-radius:8px;padding:20px;margin:24px 0;overflow-x:auto;"><pre style="margin:0;color:#e2e8f0;font-family:\'Consolas\',\'Monaco\',monospace;font-size:14px;line-height:1.6;white-space:pre-wrap;">$2</pre></div>');

  // Headers
  html = html.replace(/^### (.*)$/gim, 
    '<h3 style="font-size:20px;font-weight:700;color:#18181b;margin:32px 0 16px;line-height:1.4;">$1</h3>');
  html = html.replace(/^## (.*)$/gim, 
    '<h2 style="font-size:24px;font-weight:700;color:#18181b;margin:36px 0 18px;line-height:1.3;">$1</h2>');
  html = html.replace(/^# (.*)$/gim, 
    '<h1 style="font-size:28px;font-weight:800;color:#18181b;margin:40px 0 20px;line-height:1.2;">$1</h1>');

  // Bold and Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong style="font-weight:700;"><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong style="font-weight:700;">$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em style="font-style:italic;">$1</em>');

  // Images
  html = html.replace(/!\[(.*?)\]\((.*?)\)/gim, 
    '<img src="$2" alt="$1" style="max-width:100%;height:auto;border-radius:12px;margin:24px 0;display:block;" />');

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, 
    '<a href="$2" style="color:#2563eb;text-decoration:underline;font-weight:500;">$1</a>');

  // Inline code
  html = html.replace(/`([^`]+)`/gim, 
    '<code style="background:#f1f5f9;color:#0f172a;padding:3px 8px;border-radius:4px;font-family:\'Consolas\',monospace;font-size:14px;">$1</code>');

  // Blockquotes
  html = html.replace(/^> (.*)$/gim, 
    '<blockquote style="border-left:4px solid #3b82f6;background:#eff6ff;padding:16px 20px;margin:24px 0;border-radius:0 8px 8px 0;"><p style="margin:0;color:#1e40af;font-style:italic;line-height:1.7;">$1</p></blockquote>');

  // Unordered lists
  html = html.replace(/^- (.*)$/gim, 
    '<li style="margin-left:24px;margin-bottom:10px;color:#374151;line-height:1.7;padding-left:8px;">$1</li>');

  // Horizontal rule
  html = html.replace(/^---$/gim, 
    '<hr style="border:none;border-top:2px solid #e5e7eb;margin:32px 0;" />');

  // Paragraphs - handle double newlines
  html = html.replace(/\n\n/gim, '</p><p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.8;">');
  
  // Single newlines to <br>
  html = html.replace(/\n/gim, '<br />');

  // Wrap in paragraph
  return `<p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.8;">${html}</p>`;
}

// Generate beautiful full article email HTML
function generateFullArticleEmailHTML(
  title: string, 
  excerpt: string,
  htmlContent: string, 
  blogUrl: string, 
  featuredImage: string,
  siteUrl: string, 
  email: string
): string {
  const unsubscribeUrl = `${siteUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
  const currentYear = new Date().getFullYear();
  const publishDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Featured image section
  const imageSection = featuredImage ? `
    <tr>
      <td style="padding:0;">
        <img src="${featuredImage}" alt="${title}" style="width:100%;height:auto;max-height:400px;object-fit:cover;display:block;" />
      </td>
    </tr>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .content-padding {
        padding: 24px 20px !important;
      }
      .article-title {
        font-size: 26px !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  
  <!-- Preheader -->
  <div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${excerpt || title}
  </div>
  
  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;">
    <tr>
      <td style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="680" class="email-container" style="margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#18181b 0%,#27272a 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">ments.</h1>
              <p style="margin:8px 0 0;color:#a1a1aa;font-size:13px;">Fresh insights delivered to your inbox</p>
            </td>
          </tr>
          
          ${imageSection}
          
          <!-- Article Header -->
          <tr>
            <td class="content-padding" style="padding:40px 48px 24px;">
              <!-- Category Badge -->
              <div style="margin-bottom:16px;">
                <span style="display:inline-block;background:#f0fdf4;color:#16a34a;font-size:11px;font-weight:700;padding:6px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">
                  ✨ New Article
                </span>
              </div>
              
              <!-- Title -->
              <h1 class="article-title" style="margin:0 0 16px;color:#18181b;font-size:32px;font-weight:800;line-height:1.25;letter-spacing:-0.5px;">
                ${title}
              </h1>
              
              <!-- Meta -->
              <p style="margin:0 0 24px;color:#71717a;font-size:14px;">
                📅 ${publishDate}
              </p>
              
              <!-- Excerpt/Intro -->
              ${excerpt ? `
              <p style="margin:0 0 32px;color:#52525b;font-size:18px;line-height:1.7;font-style:italic;padding-left:20px;border-left:4px solid #18181b;">
                ${excerpt}
              </p>
              ` : ''}
              
              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 32px;" />
            </td>
          </tr>
          
          <!-- Full Article Content -->
          <tr>
            <td class="content-padding" style="padding:0 48px 40px;">
              <div style="color:#374151;font-size:16px;line-height:1.8;">
                ${htmlContent}
              </div>
            </td>
          </tr>
          
          <!-- Read Online CTA -->
          <tr>
            <td style="padding:0 48px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;background:#f8fafc;border-radius:12px;width:100%;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="margin:0 0 16px;color:#52525b;font-size:14px;">
                      Prefer reading on the web? View this article online:
                    </p>
                    <a href="${blogUrl}" target="_blank" style="display:inline-block;padding:14px 32px;background:#18181b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                      Read on Website →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:32px 48px;background:#f8fafc;border-top:1px solid #e5e7eb;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align:center;">
                    <!-- Logo -->
                    <p style="margin:0 0 16px;font-size:20px;font-weight:800;color:#18181b;">ments.</p>
                    
                    <!-- Links -->
                    <p style="margin:0 0 20px;font-size:13px;">
                      <a href="${siteUrl}" style="color:#52525b;text-decoration:underline;">Visit Blog</a>
                      <span style="color:#d4d4d8;padding:0 12px;">|</span>
                      <a href="${unsubscribeUrl}" style="color:#52525b;text-decoration:underline;">Unsubscribe</a>
                    </p>
                    
                    <!-- Copyright -->
                    <p style="margin:0;color:#a1a1aa;font-size:12px;">
                      © ${currentYear} ments. All rights reserved.
                    </p>
                    <p style="margin:8px 0 0;color:#a1a1aa;font-size:11px;">
                      You received this because you subscribed to our newsletter.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
  
</body>
</html>
  `;
}

// Plain text version
function generatePlainText(title: string, content: string, blogUrl: string, siteUrl: string): string {
  // Strip markdown formatting
  const plainContent = content
    .replace(/```[\s\S]*?```/g, '[Code Block]')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^#+\s/gm, '')
    .replace(/^>\s/gm, '» ')
    .replace(/^-\s/gm, '• ')
    .replace(/!\[.*?\]\(.*?\)/g, '[Image]');

  return `
════════════════════════════════════════════════════════════════
                           ments.
════════════════════════════════════════════════════════════════

${title}
${'─'.repeat(Math.min(title.length, 60))}

${plainContent}

────────────────────────────────────────────────────────────────

📖 Read online: ${blogUrl}

════════════════════════════════════════════════════════════════

Visit our blog: ${siteUrl}
Unsubscribe: ${siteUrl}/unsubscribe

© ${new Date().getFullYear()} ments. All rights reserved.
  `.trim();
}