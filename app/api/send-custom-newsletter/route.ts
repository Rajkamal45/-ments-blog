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
    const { subject, content } = body;

    console.log("Received request:", { subject: subject?.substring(0, 50), contentLength: content?.length });

    if (!subject || !content) {
      console.log("Validation failed - subject:", !!subject, "content:", !!content);
      return NextResponse.json(
        { error: "Subject and content are required", received: { hasSubject: !!subject, hasContent: !!content } },
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

    let successCount = 0;
    let failCount = 0;

    // Convert markdown to HTML (basic conversion)
    const htmlContent = convertMarkdownToHTML(content);

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
              Data: subject,
              Charset: "UTF-8",
            },
            Body: {
              Html: {
                Data: generateCustomEmailHTML(subject, htmlContent, siteUrl, subscriber.email),
                Charset: "UTF-8",
              },
              Text: {
                Data: generatePlainText(subject, content, siteUrl),
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
        blog_id: null,
        blog_title: subject,
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

function convertMarkdownToHTML(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*)$/gim, '<h3 style="font-size:20px;font-weight:600;color:#000;margin:24px 0 12px;">$1</h3>');
  html = html.replace(/^## (.*)$/gim, '<h2 style="font-size:24px;font-weight:700;color:#000;margin:28px 0 14px;">$1</h2>');
  html = html.replace(/^# (.*)$/gim, '<h1 style="font-size:28px;font-weight:700;color:#000;margin:32px 0 16px;">$1</h1>');

  // Bold and Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>");

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" style="color:#2563eb;text-decoration:underline;">$1</a>');

  // Inline code
  html = html.replace(/`([^`]+)`/gim, '<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:14px;">$1</code>');

  // Blockquotes
  html = html.replace(/^> (.*)$/gim, '<blockquote style="border-left:4px solid #e5e7eb;padding-left:16px;margin:16px 0;color:#4b5563;font-style:italic;">$1</blockquote>');

  // Lists
  html = html.replace(/^- (.*)$/gim, '<li style="margin-left:20px;margin-bottom:8px;">$1</li>');

  // Paragraphs
  html = html.replace(/\n\n/gim, '</p><p style="margin-bottom:16px;line-height:1.7;color:#374151;">');
  html = html.replace(/\n/gim, "<br />");

  return `<p style="margin-bottom:16px;line-height:1.7;color:#374151;">${html}</p>`;
}

function generateCustomEmailHTML(subject: string, content: string, siteUrl: string, email: string): string {
  const unsubscribeUrl = `${siteUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color:#000000;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;">ments.</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 24px;color:#000000;font-size:26px;font-weight:700;line-height:1.3;">
                ${subject}
              </h2>
              <div style="font-size:16px;line-height:1.7;color:#374151;">
                ${content}
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 40px;">
              <a href="${siteUrl}" style="display:inline-block;padding:14px 28px;background-color:#000000;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">
                Visit Our Blog →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
                You received this email because you subscribed to our newsletter.
                <br><br>
                <a href="${siteUrl}" style="color:#6b7280;text-decoration:underline;">Visit Website</a>
                &nbsp;|&nbsp;
                <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Legal -->
        <p style="margin-top:24px;color:#9ca3af;font-size:11px;text-align:center;">
          © ${new Date().getFullYear()} ments. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function generatePlainText(subject: string, content: string, siteUrl: string): string {
  // Strip markdown
  let plainText = content
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^#+\s/gm, "")
    .replace(/^>\s/gm, "")
    .replace(/^-\s/gm, "• ");

  return `
${subject}

${plainText}

---
Visit our blog: ${siteUrl}

To unsubscribe, visit: ${siteUrl}/unsubscribe
  `.trim();
}