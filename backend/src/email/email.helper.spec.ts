import { escapeHtml, sendEmail } from './email.helper';

describe('email.helper', () => {
  describe('escapeHtml', () => {
    it('escapes HTML-sensitive characters in dynamic email content', () => {
      expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
        '&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;',
      );
    });
  });

  describe('sendEmail validation', () => {
    it('rejects an invalid recipient before attempting delivery', async () => {
      await expect(
        sendEmail({ to: 'not-an-email', subject: 'Hello', text: 'Test' }),
      ).rejects.toThrow('A valid recipient email address is required');
    });

    it('requires a subject', async () => {
      await expect(
        sendEmail({ to: 'customer@example.com', subject: ' ', text: 'Test' }),
      ).rejects.toThrow('Email subject is required');
    });

    it('requires text or HTML content', async () => {
      await expect(
        sendEmail({ to: 'customer@example.com', subject: 'Hello' }),
      ).rejects.toThrow('Email must include either text or HTML content');
    });
  });
});
