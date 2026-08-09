/**
 * Emails careers applications with the resume attached, then deletes the
 * hosted copy.
 *
 * Netlify's built-in notification can only put a *link* to an uploaded file
 * in the email — the file itself is stored on a public CloudFront URL that
 * anyone holding the link can read. This function fetches the file, sends it
 * as a real attachment through Resend, and then deletes the submission from
 * Netlify so the public copy stops existing.
 *
 * Fires automatically on every form submission (Netlify event function —
 * the filename is the event name; do not rename it).
 *
 * Required environment variables:
 *   RESEND_API_KEY     Resend API key
 *   NOTIFY_TO          where applications are emailed
 *   NOTIFY_FROM        verified Resend sender, e.g. "careers@medstaruc.com"
 *   NETLIFY_API_TOKEN  personal access token, used only to delete the
 *                      submission after the email is confirmed sent
 *
 * If any of these is missing the function logs and exits without deleting,
 * so a misconfiguration loses the notification but never the application.
 */

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024; // Resend's hard limit is 40MB total

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch {
    console.error('submission-created: unparseable body');
    return { statusCode: 400, body: 'bad payload' };
  }

  // Only the careers form carries a file; the contact form keeps using
  // Netlify's built-in notification.
  if (payload.form_name !== 'careers-application') {
    return { statusCode: 200, body: 'ignored' };
  }

  const { RESEND_API_KEY, NOTIFY_TO, NOTIFY_FROM, NETLIFY_API_TOKEN } =
    process.env;
  const missing = Object.entries({
    RESEND_API_KEY,
    NOTIFY_TO,
    NOTIFY_FROM,
    NETLIFY_API_TOKEN,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    console.error(`submission-created: missing env vars: ${missing.join(', ')}`);
    return { statusCode: 500, body: 'not configured' };
  }

  const data = payload.data || {};
  const resume = data.resume;

  // Pull the upload down. A failure here must not lose the application, so we
  // fall back to emailing the link rather than aborting.
  const attachments = [];
  let attachmentNote = '';
  if (resume?.url) {
    try {
      const res = await fetch(resume.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > MAX_ATTACHMENT_BYTES) {
        attachmentNote = `File too large to attach (${Math.round(
          bytes.length / 1024
        )} KB). Link: ${resume.url}`;
      } else {
        attachments.push({
          filename: resume.filename || 'resume',
          content: bytes.toString('base64'),
        });
      }
    } catch (err) {
      console.error(`submission-created: fetch failed: ${err.message}`);
      attachmentNote = `Could not attach the file. Link: ${resume.url}`;
    }
  }

  const rows = (payload.ordered_human_fields || [])
    .filter((f) => f.name !== 'resume')
    .map(
      (f) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#666;">${esc(
          f.title
        )}</td><td style="padding:4px 0;">${esc(f.value)}</td></tr>`
    )
    .join('');

  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: NOTIFY_FROM,
      to: [NOTIFY_TO],
      reply_to: data.email || undefined,
      subject: `Careers application — ${data.fullName || 'no name given'}`,
      html: `
        <h2 style="font-family:sans-serif;">New careers application</h2>
        <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">${rows}</table>
        ${
          attachmentNote
            ? `<p style="font-family:sans-serif;color:#b00;">${esc(
                attachmentNote
              )}</p>`
            : `<p style="font-family:sans-serif;color:#666;font-size:13px;">Resume attached: ${esc(
                resume?.filename || 'none'
              )}</p>`
        }
      `,
      attachments,
    }),
  });

  if (!sent.ok) {
    // Leave the submission in place so nothing is lost; it stays visible in
    // the Netlify dashboard and can be re-sent by hand.
    console.error(
      `submission-created: resend failed ${sent.status}: ${await sent.text()}`
    );
    return { statusCode: 500, body: 'send failed' };
  }

  // Only now is it safe to remove the public copy.
  if (attachments.length) {
    const del = await fetch(
      `https://api.netlify.com/api/v1/submissions/${payload.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${NETLIFY_API_TOKEN}` },
      }
    );
    if (!del.ok) {
      console.error(`submission-created: delete failed ${del.status}`);
    }
  } else {
    console.warn(
      'submission-created: nothing attached, keeping submission so the file is not orphaned'
    );
  }

  return { statusCode: 200, body: 'ok' };
};
